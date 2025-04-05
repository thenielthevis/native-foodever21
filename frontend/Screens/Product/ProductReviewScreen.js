import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
// Remove AirbnbRating import
import { useDispatch, useSelector } from 'react-redux';
import { API_URL } from '@env';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createProductReview, updateProductReview, getUserProductReview } from '../../Redux/Actions/productActions';

// Custom Star Rating Component
const StarRating = ({ rating, setRating, size = 30, showRatingText = true }) => {
    // Function to render each star
    const renderStar = (position) => {
      const filled = position <= rating;
      
      return (
        <TouchableOpacity 
          key={position}
          onPress={() => setRating(position)}
          style={{ padding: 5 }}
        >
          <Text style={{ 
            fontSize: size, 
            color: filled ? '#FFAA00' : '#E0E0E0',
            textShadowColor: filled ? '#FF6B00' : '#D0D0D0',
            textShadowOffset: { width: 0.5, height: 0.5 },
            textShadowRadius: 1,
          }}>
            ★
          </Text>
        </TouchableOpacity>
      );
    };
  
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(position => renderStar(position))}
        </View>
        {showRatingText && (
          <Text style={{ 
            marginTop: 8, 
            fontSize: 16, 
            color: '#666',
            fontWeight: '500'
          }}>
            Your Rating: {rating}/5
          </Text>
        )}
      </View>
    );
  };

const ProductReviewScreen = ({ route, navigation }) => {
  const { productId, productName, productImage } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const dispatch = useDispatch();
  
  // Get review state from Redux
  const { loading, error, userReview } = useSelector(state => {
    // Try to find the productReviews state in the Redux store
    if (state.productReviews) {
      return state.productReviews;
    } else if (state.productReducer && state.productReducer.productReviews) {
      return state.productReducer.productReviews;
    } else {
      // Fallback to default values if store structure is different
      return { loading: false, error: null, userReview: null };
    }
  });

  // Local state for submission status
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    fetchExistingReview();
  }, [productId]);

  // If userReview changes in Redux state, update local state
  useEffect(() => {
    if (userReview) {
      setExistingReview(userReview);
      setRating(userReview.rating);
      setComment(userReview.comment);
      setCanReview(true);
    }
  }, [userReview]);

  const fetchExistingReview = async () => {
    try {
      // Dispatch Redux action to get user's review
      await dispatch(getUserProductReview(productId));
      setCanReview(true);
    } catch (error) {
      console.log('Error fetching review:', error);
      
      // Handle permission denied (403) errors
      if (error.response?.status === 403) {
        Alert.alert(
          'Information', 
          error.response?.data?.message || 'You can only review products you have purchased'
        );
        navigation.goBack();
      } else {
        // Other errors
        Alert.alert(
          'Error', 
          'Failed to check review status. Please try again later.'
        );
        navigation.goBack();
      }
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Please add a comment for your review');
      return;
    }

    try {
      setSubmitting(true);
      
      if (existingReview) {
        // Update existing review using Redux action
        await dispatch(updateProductReview(
          productId, 
          existingReview._id, 
          { rating, comment }
        ));
      } else {
        // Create new review using Redux action
        await dispatch(createProductReview(
          productId, 
          { rating, comment }
        ));
      }

      Alert.alert(
        'Success', 
        `Your review has been ${existingReview ? 'updated' : 'submitted'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={{color: '#666', marginTop: 10}}>Loading review...</Text>
      </SafeAreaView>
    );
  }

  // If there was an error from Redux
  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{color: '#FF0000', marginBottom: 15}}>{error}</Text>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.submitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {existingReview ? 'Edit Your Review' : 'Write a Review'}
          </Text>
        </View>
        
        <View style={styles.productCard}>
          <Image 
            source={{ uri: productImage }} 
            style={styles.productImage} 
            defaultSource={require('../../assets/logo.png')}
          />
          <Text style={styles.productName}>{productName}</Text>
        </View>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.labelText}>Your Rating</Text>
          <StarRating 
            rating={rating} 
            setRating={setRating} 
            size={40}
          />
        </View>
        
        <View style={styles.reviewContainer}>
          <Text style={styles.labelText}>Your Review:</Text>
          <TextInput
            style={styles.commentInput}
            multiline
            numberOfLines={5}
            placeholder="Share your thoughts about this product..."
            value={comment}
            onChangeText={(text) => setComment(text)}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmitReview}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingReview ? 'Update Review' : 'Submit Review'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F2',
  },
  header: {
    padding: 16,
    backgroundColor: '#FF6B00',
    borderBottomWidth: 1,
    borderBottomColor: '#FF8F3D',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  productCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  productImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFE0CC',
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333333',
  },
  ratingContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reviewContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  labelText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
    color: '#333333',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    height: 120,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default ProductReviewScreen;
