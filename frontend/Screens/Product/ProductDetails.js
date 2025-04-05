import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, Image, Text, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, TextInput, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { listProducts, fetchProductReviews, createProductReview } from '../../Redux/Actions/productActions';
import Header from '../Shared/StyledComponents/Header';
import CartModal from '../Modals/CartModal';
import OrderModal from '../Modals/OrderModal';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '@env';

const { width: windowWidth } = Dimensions.get('window');

const ProductDetails = ({ route, navigation }) => {
  const { product } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cartCount, setCartCount] = useState(3); // Mock cart count - replace with real data
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();
  const productList = useSelector((state) => state.productList);
  const { products = [] } = productList;
  const productReviews = useSelector((state) => state.productReviews || {});
  const { loading: reviewsLoading = false, error: reviewsError = null, reviews = [] } = productReviews;

  useEffect(() => {
    dispatch(listProducts());
    if (product._id) {
      dispatch(fetchProductReviews(product._id));
    }
  }, [dispatch, product._id]);

  // Add a check for authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync('jwt');
      console.log('Auth status:', token ? 'Authenticated' : 'Not authenticated');
    };
    checkAuth();
  }, []);

  // Add this effect to fetch user's review
  useEffect(() => {
    const fetchUserReview = async () => {
      try {
        const token = await SecureStore.getItemAsync('jwt');
        if (!token || !product._id) return;

        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        };

        const response = await axios.get(
          `${API_URL}/product/${product._id}/my-review`,
          config
        );

        if (response.data.success) {
          setUserReview(response.data.review);
          if (response.data.review) {
            setRating(response.data.review.rating);
            setComment(response.data.review.comment);
          }
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching user review:', error);
        }
      }
    };

    fetchUserReview();
  }, [product._id]);

  const similarProducts = products.filter(
    p => p.category === product.category && p._id !== product._id
  );

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
      } else if (hasHalfStar && i === fullStars + 1) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFD700" />);
      }
    }
    return stars;
  };

  const onImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offset / slideSize);
    setCurrentImageIndex(currentIndex);
  };

  const renderPrice = () => {
    return (
      <View style={styles.priceContainer}>
        {product.discount > 0 ? (
          <>
            <Text style={styles.originalPrice}>₱{product.price}</Text>
            <Text style={styles.discountedPrice}>₱{product.discountedPrice}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{product.discount}% OFF</Text>
            </View>
          </>
        ) : (
          <Text style={styles.price}>₱{product.price}</Text>
        )}
      </View>
    );
  };

  const renderRecommendedProduct = (item) => {
    return (
      <TouchableOpacity 
        key={item._id}
        style={styles.recommendedItem}
        onPress={() => navigation.push('ProductDetails', { product: item })}>
        <View style={styles.recommendedImageContainer}>
          {item.discount > 0 && (
            <View style={styles.recommendedDiscountTag}>
              <Image
                source={require('../../assets/Home/discount-tag.png')}
                style={styles.recommendedDiscountIcon}
              />
              <Text style={styles.recommendedDiscountText}>{item.discount}%</Text>
            </View>
          )}
          <Image 
            source={
              item.images && item.images[0]?.url
                ? { uri: item.images[0].url }
                : require('../../assets/Home/placeholder.png')
            } 
            style={styles.recommendedImage}
            defaultSource={require('../../assets/Home/placeholder.png')}
          />
        </View>
        <Text style={styles.recommendedName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.recommendedPriceContainer}>
          {item.discount > 0 ? (
            <>
              <Text style={styles.recommendedOriginalPrice}>₱{item.price}</Text>
              <Text style={styles.recommendedDiscountedPrice}>₱{item.discountedPrice}</Text>
            </>
          ) : (
            <Text style={styles.recommendedPrice}>₱{item.price}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleOrderNow = () => {
    setOrderModalVisible(true);
  };

  const handleReviewAction = () => {
    if (userReview) {
      setIsEditing(!isEditing);
      if (!isEditing) {
        setRating(userReview.rating);
        setComment(userReview.comment);
      }
    } else {
      setShowReviewForm(!showReviewForm);
    }
  };

  const submitReview = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login to write a review', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' }
        ]);
        return;
      }

      if (rating === 0) {
        Alert.alert('Error', 'Please select a rating');
        return;
      }
      if (comment.trim() === '') {
        Alert.alert('Error', 'Please enter a comment');
        return;
      }

      const reviewData = { rating, comment };
      
      // Use the Redux action
      const result = await dispatch(createProductReview(product._id, reviewData));

      if (result.success) {
        Alert.alert('Success', 'Review submitted successfully');
        setRating(0);
        setComment('');
        setShowReviewForm(false);
        // Refresh reviews
        dispatch(fetchProductReviews(product._id));
      }
    } catch (error) {
      console.error('Review submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    }
  };

  const renderReviewForm = () => (
    <View style={styles.reviewFormContainer}>
      <Text style={styles.reviewFormTitle}>
        {isEditing ? 'Edit Your Review' : 'Write a Review'}
      </Text>
      <View style={styles.ratingSelector}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={35}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>
        {rating === 0 ? 'Select Rating' : `Your Rating: ${rating}/5`}
      </Text>
      <TextInput
        style={styles.reviewInput}
        placeholder="Share your experience with this product..."
        multiline
        value={comment}
        onChangeText={setComment}
        maxLength={500}
      />
      <Text style={styles.characterCount}>
        {comment.length}/500 characters
      </Text>
      <View style={styles.reviewActionButtons}>
        <TouchableOpacity
          style={[styles.reviewButton, styles.cancelButton]}
          onPress={() => {
            setShowReviewForm(false);
            setIsEditing(false);
          }}>
          <Ionicons name="close-circle-outline" size={20} color="#fff" />
          <Text style={styles.reviewButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reviewButton, styles.submitButton]}
          onPress={submitReview}>
          <Ionicons 
            name={isEditing ? "checkmark-circle-outline" : "send-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.reviewButtonText}>
            {isEditing ? 'Update' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviews = () => {
    console.log('Reviews data:', reviews); // Debug log
  
    return (
      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsSectionTitle}>
          Customer Reviews ({reviews ? reviews.length : 0})
        </Text>
        {reviewsLoading ? (
          <ActivityIndicator size="large" color="#ff9900" />
        ) : reviewsError ? (
          <Text style={styles.errorText}>{reviewsError}</Text>
        ) : reviews && reviews.length > 0 ? (
          reviews.map((review, index) => {
            console.log('Review avatar URL:', review.avatarURL); // Debug log
            const isUserReview = userReview && userReview._id === review._id;
            return (
              <View key={index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Image
                    source={
                      review.avatarURL
                        ? { uri: review.avatarURL }
                        : require('../../assets/defaults/profile-pic.png')
                    }
                    style={styles.reviewerImage}
                    onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                  />
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>
                      {review.name || review.username || 'Anonymous User'}
                    </Text>
                    <View style={styles.reviewRating}>
                      <View style={styles.starsContainer}>
                        {renderStars(review.rating)}
                        <Text style={styles.ratingValue}>
                          {review.rating?.toFixed(1)}
                        </Text>
                      </View>
                      <View style={styles.reviewDateContainer}>
                        <Text style={styles.reviewDate}>
                          {review.createdAt 
                            ? new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) 
                            : ''}
                        </Text>
                        {isUserReview && (
                          <TouchableOpacity
                            onPress={() => {
                              setIsEditing(true);
                              setRating(review.rating);
                              setComment(review.comment);
                              setShowReviewForm(true);
                            }}
                            style={styles.editButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="pencil" size={14} color="#ff9900" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        )}
      </View>
    );
  };

  // Add this useEffect to debug review data
  useEffect(() => {
    console.log('Product Reviews State:', productReviews);
    console.log('Reviews Array:', reviews);
  }, [productReviews, reviews]);

  const bottomNav = (
    <View style={styles.bottomNav}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.addToCartButton,
            product.status !== 'Available' && styles.disabledButton
          ]}
          onPress={() => setCartModalVisible(true)}
          disabled={product.status !== 'Available'}
        >
          <Text style={[
            styles.buttonText,
            product.status !== 'Available' && styles.disabledButtonText
          ]}>
            {product.status === 'Available' ? 'Add to Cart' : 'Unavailable'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.orderButton,
            product.status !== 'Available' && styles.disabledButton
          ]}
          onPress={handleOrderNow}
          disabled={product.status !== 'Available'}
        >
          <Text style={[
            styles.buttonText,
            product.status !== 'Available' && styles.disabledButtonText
          ]}>
            {product.status === 'Available' ? 'Order Now' : 'Unavailable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Header isScrolled={true} />
        
        <TouchableOpacity style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#333" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll}>
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onImageScroll}
          >
            {product.images && product.images.length > 0 ? (
              product.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.url }}
                  style={styles.productImage}
                  defaultSource={require('../../assets/Home/placeholder.png')}
                />
              ))
            ) : (
              <Image
                source={require('../../assets/Home/placeholder.png')}
                style={styles.productImage}
              />
            )}
          </ScrollView>
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1}/{product.images?.length || 1}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Status indicator */}
          <View style={[styles.statusContainer, { backgroundColor: product.status === 'Available' ? '#e6ffe6' : '#ffe6e6' }]}>
            <View style={[styles.statusDot, { backgroundColor: product.status === 'Available' ? '#00cc00' : '#ff3333' }]} />
            <Text style={[styles.statusText, { color: product.status === 'Available' ? '#006600' : '#cc0000' }]}>
              {product.status}
            </Text>
          </View>
          
          {/* Price information */}
          {renderPrice()}
          
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          
          {/* Reviews section */}
          <View style={styles.reviewsContainer}>
            <View style={styles.ratingContainer}>
              {renderStars(product.ratings)}
              <Text style={styles.ratingText}>{product.ratings?.toFixed(1) || '0.0'}</Text>
            </View>
            <Text style={styles.reviewsCount}>
              {product.numOfReviews} {product.numOfReviews === 1 ? 'Review' : 'Reviews'}
            </Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.paymentModes}>
            <Text style={styles.paymentTitle}>Payment Methods:</Text>
            <View style={styles.paymentIcons}>
              <View style={styles.paymentMethod}>
                <Image 
                  source={require('../../assets/images/cod.png')} 
                  style={styles.paymentIcon} 
                />
                <Text style={styles.paymentText}>COD</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Image 
                  source={require('../../assets/images/credit-card.png')} 
                  style={styles.paymentIcon} 
                />
                <Text style={styles.paymentText}>Card</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Image 
                  source={require('../../assets/images/gcash.png')} 
                  style={styles.paymentIcon} 
                />
                <Text style={styles.paymentText}>GCash</Text>
              </View>
            </View>
          </View>

          {similarProducts.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.recommendationsTitle}>You May Also Like</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.recommendationsScroll}>
                {similarProducts.map(renderRecommendedProduct)}
              </ScrollView>
            </View>
          )}

          {/* Reviews Section */}
          {renderReviews()}
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={handleReviewAction}>
          </TouchableOpacity>
          {(showReviewForm || isEditing) && renderReviewForm()}

        </View>
      </ScrollView>

      <CartModal 
        visible={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
        product={product}
      />

      <OrderModal
        visible={orderModalVisible}
        onClose={() => setOrderModalVisible(false)}
        product={product}
        navigation={navigation}
      />
      
      {bottomNav}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainScroll: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  productImage: {
    width: windowWidth,  // Use windowWidth instead of width
    height: 300,
    resizeMode: 'contain',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 10,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
  },
  detailsContainer: {
    padding: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bottomNav: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
    paddingBottom: 25,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  originalPrice: {
    fontSize: 24,
    color: '#666',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  discountedPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  discountBadge: {
    backgroundColor: '#ff9900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  addToCartButton: {
    backgroundColor: '#666',
  },
  orderButton: {
    backgroundColor: '#ff9900',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff9900',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reviewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ff9900',
  },
  categoryText: {
    color: '#ff9900',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentModes: {
    marginTop: 20,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  paymentIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    justifyContent: 'space-between',
  },
  paymentMethod: {
    alignItems: 'center',
    borderColor: '#eee',
    borderWidth: 1,
    width: 100,
    padding: 5,
    borderRadius: 20,
    borderColor: 'rgba(94, 94, 94, 0.2)',
  },
  paymentIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  paymentText: {
    fontSize: 12,
    marginTop: 5,
    color: '#666',
    fontWeight: 'bold'
  },
  recommendationsSection: {
    marginTop: 25,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  recommendationsScroll: {
    marginLeft: -15,
  },
  recommendedItem: {
    width: 150,
    marginLeft: 15,
    marginBottom: 10,
  },
  recommendedImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  recommendedDiscountTag: {
    position: 'absolute',
    top: 0,
    left: -10,
    zIndex: 1,
  },
  recommendedDiscountIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  recommendedDiscountText: {
    position: 'absolute',
    left: 11,
    top: 12,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recommendedImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  recommendedName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  recommendedPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendedOriginalPrice: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  recommendedDiscountedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  recommendedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  reviewsSection: {
    marginTop: 25,
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  reviewItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerImage: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#e1e1e1',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
    marginTop: 8,
  },
  noReviewsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#666666',
  },
  reviewFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reviewFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingLabel: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 15,
    fontSize: 16,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    minHeight: 120,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  characterCount: {
    textAlign: 'right',
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  reviewActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  submitButton: {
    backgroundColor: '#ff9900',
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 0, 0.2)',
  },
});

export default ProductDetails;