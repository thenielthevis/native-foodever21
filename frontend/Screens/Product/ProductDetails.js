import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Text, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { listProducts, fetchProductReviews } from '../../Redux/Actions/productActions';
import Header from '../Shared/StyledComponents/Header';

const ProductDetails = ({ route, navigation }) => {
  const { product } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cartCount, setCartCount] = useState(3); // Mock cart count - replace with real data
  const dispatch = useDispatch();
  const productList = useSelector((state) => state.productList);
  const { products = [] } = productList;
  const productReviews = useSelector((state) => state.productReviews);
  const { loading: reviewsLoading, error: reviewsError, reviews = [] } = productReviews;

  useEffect(() => {
    dispatch(listProducts());
    if (product._id) {
      dispatch(fetchProductReviews(product._id));
    }
  }, [dispatch, product._id]);

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
                {similarProducts.map((item) => (
                  <TouchableOpacity 
                    key={item._id}
                    style={styles.recommendedItem}
                    onPress={() => navigation.push('ProductDetails', { product: item })}>
                    <Image 
                      source={
                        item.images && item.images[0]?.url
                          ? { uri: item.images[0].url }
                          : require('../../assets/Home/placeholder.png')
                      } 
                      style={styles.recommendedImage}
                      defaultSource={require('../../assets/Home/placeholder.png')}
                    />
                    <Text style={styles.recommendedName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.recommendedPrice}>₱{item.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsSectionTitle}>
              Customer Reviews ({product.numOfReviews})
            </Text>
            {reviewsLoading ? (
              <ActivityIndicator size="large" color="#ff9900" />
            ) : reviewsError ? (
              <Text style={styles.errorText}>{reviewsError}</Text>
            ) : reviews.length > 0 ? (
              reviews.map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={
                        review.avatarURL
                          ? { uri: review.avatarURL }
                          : require('../../assets/defaults/profile-pic.png')
                      }
                      style={styles.reviewerImage}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.username}</Text>
                      <View style={styles.reviewRating}>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            )}
          </View>

        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Text style={styles.price}>₱{product.price}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.addToCartButton]}>
            <Text style={styles.buttonText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.orderButton]}>
            <Text style={styles.buttonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    width: Dimensions.get('window').width,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
    paddingBottom: 25,
  },
  price: {
    fontSize: 40,
    fontWeight: '600',
    color: '#ff9900',
    marginRight: 15,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    flex: 2,
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
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noReviewsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ProductDetails;
