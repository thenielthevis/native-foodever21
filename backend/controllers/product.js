const Product = require('../models/Product')
const cloudinary = require('cloudinary')
const { admin, db } = require('../utils/firebaseAdminConfig');
const serviceAccount = require('../utils/serviceAccountKey.json');
const User = require('../models/userModel');
const Order = require('../models/Order'); // Add the Order model import
const APIFeatures = require('../utils/apiFeatures')
const mongoose = require('mongoose');
let Filter;


(async () => {
  const { Filter: BadWordsFilter } = await import('bad-words');
  Filter = new BadWordsFilter();
})();


// Helper function to check if user has ordered a product
const hasUserOrderedProduct = async (userId, productId) => {
  try {
    console.log('Checking orders with params:', {
      userId: userId,
      productId: productId,
      userIdType: typeof userId,
      productIdType: typeof productId
    });

    // Convert string productId to ObjectId if needed
    const productObjectId = typeof productId === 'string' 
      ? new mongoose.Types.ObjectId(productId)
      : productId;

    // Find completed orders containing this product
    const orders = await Order.find({
      user: userId,
      'products.productId': productObjectId,
      status: { $in: ['completed', 'delivered'] } // Include both completed and delivered status
    });

    console.log('Order query results:', {
      userIdUsed: userId,
      productIdUsed: productObjectId,
      orderCount: orders.length,
      orderDetails: orders.map(o => ({
        id: o._id,
        status: o.status,
        products: o.products.map(p => ({
          productId: p.productId,
          quantity: p.quantity
        }))
      }))
    });

    const hasOrderedProduct = orders.length > 0;
    console.log(`Purchase verification result: ${hasOrderedProduct}`);

    // If user is admin, allow review anyway
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
      console.log('User is admin, allowing review regardless of purchase');
      return true;
    }

    return hasOrderedProduct;
  } catch (error) {
    console.error('Error checking order history:', error);
    return false;
  }
};


//CREATE
exports.createProductReview = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    // Sanitize comment
    if (!Filter) {
      return res.status(500).json({ message: 'Bad-words filter not initialized.' });
    }
    const sanitizedComment = Filter.clean(comment);

    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if user has ordered this product
    const hasPurchased = await hasUserOrderedProduct(user._id, productId);
    if (!hasPurchased) {
      return res.status(403).json({ 
        message: 'You can only review products you have purchased.',
        success: false
      });
    }

    const review = {
      user: user._id,
      name: user.username || user.name || 'Anonymous User',
      rating: Number(rating),
      comment: sanitizedComment,
      createdAt: new Date(),
      avatarURL: user.userImage || null,
      verifiedPurchase: true // Mark as a verified purchase
    };

    const existingReviewIndex = product.reviews.findIndex(
      r => r.user.toString() === user._id.toString()
    );

    if (existingReviewIndex >= 0) {
      product.reviews[existingReviewIndex] = review;
    } else {
      product.reviews.push(review);
    }

    product.numOfReviews = product.reviews.length;
    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();

    // Fetch the complete review list with user details
    const populatedProduct = await Product.findById(productId)
      .populate('reviews.user', 'username userImage');

    res.status(200).json({
      success: true,
      reviews: populatedProduct.reviews,
      numOfReviews: product.numOfReviews,
      ratings: product.ratings
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review.' });
  }
};


// CREATE PRODUCT
exports.createProduct = async (req, res, next) => {
    try {
        let images = [];
        
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const result = await cloudinary.v2.uploader.upload(req.files[i].path, {
                    folder: 'products'
                });
                images.push({
                    public_id: result.public_id,
                    url: result.secure_url
                });
            }
        }

        const productData = {
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            images,
            category: req.body.category,
            status: req.body.status || 'Available',
            discount: parseInt(req.body.discount || '0')
        };

        // Calculate discounted price if discount is provided
        if (productData.discount > 0) {
            productData.discountedPrice = productData.price - (productData.price * (productData.discount / 100));
        } else {
            productData.discountedPrice = productData.price;
        }

        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};


//READ ALL PRODUCTS


exports.getProducts = async (req, res, next) => {
  try {
    const resPerPage = req.query.limit
    const currentPage = req.query.page
    const productsCount = await Product.countDocuments();
 
    const apiFeatures = new APIFeatures(Product.find(), req.query).search().filter();
    apiFeatures.pagination(resPerPage, currentPage);
 
    const products = await apiFeatures.query;
    const filteredProductsCount = products.length;
   
    if (!products) return res.status(400).json({ message: 'Error loading products' });
 
    return res.status(200).json({
    success: true,
    count: products.length,
    products,
    resPerPage,
    filteredProductsCount,
    productsCount
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
  };


//READ SPECIFIC PRODUCT
exports.getSingleProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    })
  }
  return res.status(200).json({
    success: true,
    product
  })
}


// UPDATE PRODUCT
exports.updateProduct = async (req, res, next) => {
    try {
        console.log('Update product request received for ID:', req.params.id);
        console.log('Request body fields:', Object.keys(req.body));
       
        // First find the product
        let product = await Product.findById(req.params.id);
        if (!product) {
            console.log('Product not found with ID:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
       
        console.log('Found product:', {
            id: product._id,
            name: product.name,
            description: product.description
        });


        // Prepare updateData with clean values
        const updateData = {
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            category: req.body.category,
            status: req.body.status,
            discount: parseInt(req.body.discount || '0')
        };
       
        console.log('Update data prepared:', {
            name: updateData.name,
            description: updateData.description.substring(0, 20) + '...',
            price: updateData.price,
            category: updateData.category,
            status: updateData.status,
            discount: updateData.discount
        });


        // Handle images
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} new image files`);
           
            // Delete old images from cloudinary
            for (let i = 0; i < product.images.length; i++) {
                try {
                    await cloudinary.v2.uploader.destroy(product.images[i].public_id);
                    console.log('Deleted old image:', product.images[i].public_id);
                } catch (err) {
                    console.error('Error deleting image:', err);
                }
            }
           
            // Upload new images
            let imagesLinks = [];
            for (let i = 0; i < req.files.length; i++) {
                try {
                    const result = await cloudinary.v2.uploader.upload(req.files[i].path, {
                        folder: 'products',
                    });
                    imagesLinks.push({
                        public_id: result.public_id,
                        url: result.secure_url
                    });
                    console.log('Uploaded new image:', result.public_id);
                } catch (err) {
                    console.error('Error uploading image:', err);
                }
            }
           
            if (imagesLinks.length > 0) {
                updateData.images = imagesLinks;
                console.log('Added new images to update data');
            }
        }
        // If existingImages is provided as a JSON string
        else if (req.body.existingImages) {
            try {
                updateData.images = JSON.parse(req.body.existingImages);
                console.log('Using existing images from request');
            } catch (e) {
                console.error('Error parsing existingImages JSON:', e);
                updateData.images = product.images;
                console.log('Keeping original images due to parsing error');
            }
        }
        // Otherwise keep the existing images
        else {
            updateData.images = product.images;
            console.log('Keeping original images:', product.images.length);
        }


        // Calculate discounted price
        if (updateData.discount > 0) {
            updateData.discountedPrice = updateData.price - (updateData.price * (updateData.discount / 100));
        } else {
            updateData.discountedPrice = updateData.price;
        }
       
        console.log('Final update data prepared with discounted price:', updateData.discountedPrice);


        // Perform the update with the properly prepared data
        product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
                useFindAndModify: false
            }
        );


        if (!product) {
            console.error('Update failed - no product returned');
            return res.status(500).json({
                success: false,
                message: 'Failed to update product'
            });
        }


        console.log('Product updated successfully:', {
            id: product._id,
            name: product.name,
            description: product.description.substring(0, 20) + '...',
            price: product.price,
            discount: product.discount,
            discountedPrice: product.discountedPrice
        });


        return res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE PRODUCT
exports.deleteProduct = async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }


    if (product.images && product.images.length > 0) {
        const deleteImageResult = await cloudinary.uploader.destroy(product.images[0].public_id);
        if (deleteImageResult.result !== 'ok') {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete image from Cloudinary'
            });
        }
    }


    await Product.findByIdAndDelete(req.params.id);


    return res.status(200).json({
        success: true,
        message: `Product "${product.name}" deleted successfully.`
    });
}


//Delete Bulks
exports.deleteProductsBulks = async (req, res, next) => {
    try {
        const { ids } = req.body;
        console.log('Deleting products with IDs:', ids); // Log the IDs being deleted
        const result = await Product.deleteMany({ _id: { $in: ids } });
        console.log('Delete result:', result); // Log the result of the delete operation
        res.status(200).json({
            success: true,
            message: 'Products deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting products:', error); // Log the error
        res.status(500).json({
            success: false,
            message: 'Error deleting products',
            error: error.message
        });
    }
};


// In your controller file
exports.updateProductReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params; // Extract productId and reviewId from params
    const { rating, comment } = req.body; // Extract the updated rating and comment from the request body


    // Ensure the bad-words filter is initialized
    if (!Filter) {
      return res.status(500).json({ message: 'Bad-words filter not initialized.' });
    }


    // Sanitize the comment using the initialized filter
    const sanitizedComment = Filter.clean(comment);


    // Extract Firebase token and decode it
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;


    // Find the MongoDB user associated with this Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }


    // Find the product by its ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }


    // Find the review by its ID
    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }


    // Check if the logged-in user is the owner of the review
    if (review.user.toString() !== user._id.toString()) {
      const isAdmin = user.role === 'admin'; // Better way to check admin status
      if (!isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to edit this review.' });
      }
    }


    // If it's the user's review, verify they purchased the product (skip for admins)
    if (review.user.toString() === user._id.toString() && !review.verifiedPurchase) {
      const hasPurchased = await hasUserOrderedProduct(user._id, productId);
      if (!hasPurchased) {
        return res.status(403).json({ 
          message: 'You can only review products you have purchased.',
          success: false
        });
      }
      // Mark as verified purchase since we now confirmed it
      review.verifiedPurchase = true;
    }


    // Update the review with the new rating and sanitized comment
    review.rating = rating;
    review.comment = sanitizedComment;


    // Recalculate the product's overall ratings
    product.ratings =
      product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;


    // Save the product with updated review
    await product.save();


    res.status(200).json({
      success: true,
      reviews: product.reviews,
      numOfReviews: product.numOfReviews,
      ratings: product.ratings,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review.' });
  }
};
 
exports.getUserProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    console.log(`Checking review for user ${firebaseUid} on product ${productId}`);

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Validate the productId
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid Product ID format.' });
    }

    // Fetch the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if user has ordered this product with detailed logging
    console.log('Checking purchase history for:', {
      userId: user._id,
      productId: productId
    });

    const hasPurchased = await hasUserOrderedProduct(user._id, productId);
    console.log(`User has purchased product: ${hasPurchased}`);

    // Find existing review
    const userReview = product.reviews.find(
      (review) => review.user && review.user.toString() === user._id.toString()
    );

    // Handle the response based on purchase and review status
    if (hasPurchased) {
      if (userReview) {
        return res.status(200).json({
          success: true,
          review: userReview,
          canReview: true,
          isNewReview: false
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'No review yet',
          canReview: true,
          isNewReview: true
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase this product before reviewing it.',
        canReview: false
      });
    }
  } catch (error) {
    console.error('Error in getUserProductReview:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user review.',
      error: error.message
    });
  }
};
 
  exports.getUserAllReviews = async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
 
      // Decode Firebase token to get the user's Firebase UID
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const firebaseUid = decodedToken.uid;
 
      // Find the corresponding MongoDB User ID
      const user = await User.findOne({ firebaseUid });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
 
      // Find all products that contain a review by the user
      const productsWithReviews = await Product.find({
        'reviews.user': user._id,
      });
 
      // Extract only the reviews made by the user
      const userReviews = productsWithReviews.map((product) => {
        const review = product.reviews.find(
          (review) => review.user.toString() === user._id.toString()
        );
        return {
          productId: product._id,
          productName: product.name,
          review,
        };
      });
 
      return res.status(200).json({
        success: true,
        reviews: userReviews,
      });
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      return res.status(500).json({ message: 'Failed to fetch user reviews.' });
    }
  };
   
//get reviews
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    // Populate user details and explicitly include userImage
    const product = await Product.findById(productId)
      .populate({
        path: 'reviews.user',
        select: 'userImage username name'
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Transform reviews with proper user details
    const reviewsWithUserDetails = product.reviews.map(review => {
      console.log('User data:', review.user); // Debug log
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        name: review.user?.name || review.user?.username || 'Anonymous User',
        avatarURL: review.user?.userImage || null, // Ensure avatarURL is explicitly set
        username: review.user?.username || 'Anonymous User'
      };
    });

    console.log('Transformed reviews:', reviewsWithUserDetails); // Debug log

    return res.status(200).json({
      success: true,
      reviews: reviewsWithUserDetails,
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product reviews.',
    });
  }
};


//delete review
exports.deleteReview = async (req, res) => {
  try {
      const { productId, reviewId } = req.params;


      // Find the product by its ID
      const product = await Product.findById(productId);


      if (!product) {
          return res.status(404).json({
              success: false,
              message: 'Product not found',
          });
      }


      // Find the review to delete
      const reviewIndex = product.reviews.findIndex(
          (review) => review._id.toString() === reviewId
      );


      if (reviewIndex === -1) {
          return res.status(404).json({
              success: false,
              message: 'Review not found',
          });
      }


      // Remove the review
      product.reviews.splice(reviewIndex, 1);


      // Recalculate ratings and numOfReviews
      const numOfReviews = product.reviews.length;
      const ratings =
          numOfReviews > 0
              ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / numOfReviews
              : 0;


      // Update the product document
      product.numOfReviews = numOfReviews;
      product.ratings = ratings;


      await product.save();


      return res.status(200).json({
          success: true,
          message: 'Review deleted successfully',
          product,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          success: false,
          message: 'Server error',
      });
  }
};


// Get all discounted products
exports.getDiscountedProducts = async (req, res) => {
    try {
        const products = await Product.find({
            discount: { $gt: 0 },
            status: 'Available'
        });


        res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching discounted products'
        });
    }
};