const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const protect = require('../middleware/protect');

const {
    createProduct,
    getProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
    deleteProductsBulks,
    createProductReview,
    updateProductReview,
    getProductReviews,
    deleteReview,
    getUserProductReview,
    getUserAllReviews,
    getDiscountedProducts
} = require('../controllers/product');

// Public routes
router.get('/products', getProducts);
router.get('/product/:id', getSingleProduct);
router.get('/product/:productId/reviews', getProductReviews);
router.get('/products/discounted', getDiscountedProducts);

// Protected user routes
router.get('/product/:productId/my-review', protect, getUserProductReview);
router.get('/product/user-reviews', protect, getUserAllReviews);
router.post('/product/:id/review', protect, createProductReview);
router.put('/product/:productId/review/:reviewId', protect, updateProductReview);
router.delete('/product/:productId/review/:reviewId', protect, deleteReview);

// Protected admin routes
router.post('/admin/product/create', upload.array('images', 10), createProduct);
router.put('/admin/product/update/:id', upload.array('images', 10), updateProduct);
router.delete('/admin/product/delete/:id', deleteProduct);
router.post('/admin/products/deletebulk', deleteProductsBulks);

module.exports = router;
