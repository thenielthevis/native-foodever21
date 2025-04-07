import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { getUserProfile } from '../../../Redux/Actions/Auth.actions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '@env';
import { clearCartData, clearSelectedItems } from '../../../Redux/Actions/cartActions';
import { placeOrder } from '../../../Redux/Actions/orderActions';
import * as SecureStore from 'expo-secure-store';

const SHIPPING_FEE = 50;
const { width: windowWidth } = Dimensions.get('window');

const Confirm = ({ navigation }) => {
  const dispatch = useDispatch();
  const [userData, setUserData] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMissingInfoBanner, setShowMissingInfoBanner] = useState(false);
  const selectedOrders = useSelector(state => state.cart.selectedOrders || []);

  const fetchUserData = async () => {
    try {
      const userProfile = await getUserProfile();
      console.log('[Confirm] MongoDB User profile:', {
        username: userProfile.username,
        mobileNumber: userProfile.mobileNumber,
        address: userProfile.address,
        email: userProfile.email
      });
     
      if (!userProfile.mobileNumber || !userProfile.address) {
        setShowMissingInfoBanner(true);
      } else {
        setShowMissingInfoBanner(false);
      }
     
      setUserData(userProfile);
    } catch (error) {
      console.error('[Confirm] Error fetching user profile:', error);
      Alert.alert(
        'Error',
        'Failed to load user information. Please try again.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        const token = await SecureStore.getItemAsync("jwt");
        if (!token) {
          Alert.alert(
            'Login Required',
            'Please sign in to complete your order',
            [
              {
                text: 'Sign In',
                onPress: () => navigation.navigate('Signin')
              },
              {
                text: 'Cancel',
                onPress: () => navigation.goBack(),
                style: 'cancel'
              }
            ]
          );
          return;
        }

        fetchUserData();
      };

      checkAuth();
    }, [])
  );

  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const calculateItemTotal = (item) => {
    const price = item.product.discountedPrice || item.product.price;
    return price * item.quantity;
  };

  const calculateSubtotal = () => {
    return selectedOrders.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + SHIPPING_FEE;
  };

  const handlePlaceOrder = async () => {
    if (!selectedPayment || !userData.mobileNumber || !userData.address) {
      Alert.alert('Error', 'Please complete all required information');
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        userId: userData.firebaseUid,
        products: selectedOrders.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        paymentMethod: selectedPayment,
        email: userData.email,
        address: userData.address,
        total: calculateGrandTotal()
      };

      // First place the order
      await dispatch(placeOrder(orderData));
      
      // Then clear selected items - note that we're calling dispatch here
      await dispatch(clearSelectedItems(selectedOrders));
      
      Alert.alert(
        "Order Placed Successfully",
        "Your order has been placed successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }]
                })
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Order placement error:', error);
      Alert.alert("Error", "Failed to place your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const MissingInfoBanner = () => {
    if (!showMissingInfoBanner) return null;
    
    return (
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['#FFF9F0', '#FFF1D0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconContainer}>
              <FontAwesome name="exclamation-circle" size={28} color="#FFF" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Complete Your Profile</Text>
              <Text style={styles.bannerMessage}>
                Please add your mobile number and delivery address to complete your order.
              </Text>
            </View>
          </View>
          <View style={styles.bannerButtonsContainer}>
            <TouchableOpacity 
              style={styles.bannerUpdateButton}
              onPress={() => {
                navigation.navigate('EditProfile', { 
                  user: { uid: userData.firebaseUid, displayName: userData.username, photoURL: userData.userImage },
                  backendUser: userData
                });
              }}
            >
              <LinearGradient
                colors={['#FF8C42', '#F9A826']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.updateButtonGradient}
              >
                <Text style={styles.bannerUpdateButtonText}>Update Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.bannerDismissButton}
              onPress={() => setShowMissingInfoBanner(false)}
            >
              <Text style={styles.bannerDismissButtonText}>Later</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderOrderItems = () => (
    <View style={styles.orderSection}>
      <Text style={styles.sectionTitle}>
        <FontAwesome name="cutlery" size={18} color="#8B4513" style={{ marginRight: 8 }} />
        Order Summary
      </Text>
      {selectedOrders.map((item) => (
        <View key={item.order_id} style={styles.orderItem}>
          <Image
            source={{ uri: item.product.image }}
            style={styles.productImage}
            defaultSource={require('../../../assets/Home/placeholder.png')}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product.name}</Text>
            <Text style={styles.productDesc}>{item.product.description}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.quantityText}>
                <FontAwesome name="shopping-basket" size={14} color="#8B4513" /> {item.quantity}
              </Text>
              <Text style={styles.itemTotal}>
                ₱{calculateItemTotal(item).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.paymentSection}>
      <Text style={styles.sectionTitle}>
        <FontAwesome name="credit-card" size={18} color="#8B4513" style={{ marginRight: 8 }} />
        Select Payment Method
      </Text>
      <View style={styles.paymentOptions}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'cash_on_delivery' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('cash_on_delivery')}
        >
          <View style={styles.paymentIconContainer}>
            <Image
              source={require('../../../assets/images/cod.png')}
              style={styles.paymentIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.paymentText}>Cash on Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'credit_card' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('credit_card')}
        >
          <View style={styles.paymentIconContainer}>
            <Image
              source={require('../../../assets/images/credit-card.png')}
              style={styles.paymentIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.paymentText}>Credit Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'gcash' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('gcash')}
        >
          <View style={styles.paymentIconContainer}>
            <Image
              source={require('../../../assets/images/gcash.png')}
              style={styles.paymentIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.paymentText}>GCash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>₱{calculateGrandTotal().toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.checkoutButton,
          (!selectedPayment || !userData?.mobileNumber || !userData?.address || isProcessing) && 
          styles.checkoutButtonDisabled
        ]}
        onPress={handlePlaceOrder}
        disabled={!selectedPayment || !userData?.mobileNumber || !userData?.address || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.checkoutButtonText}>
            Checkout
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF8C42']}
            tintColor={'#FF8C42'}
          />
        }
      >
        <MissingInfoBanner />
        
        {/* Order Summary Section First */}
        {renderOrderItems()}

        {/* Delivery Information Moved Down */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="map-marker" size={18} color="#8B4513" style={{ marginRight: 8 }} />
            Delivery Information
          </Text>
          <View style={styles.deliveryInfoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{userData.username}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{userData.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Mobile:</Text>
              <Text style={[styles.value, !userData.mobileNumber && styles.missingValue]}>
                {userData.mobileNumber || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Address:</Text>
              <Text style={[styles.value, !userData.address && styles.missingValue]}>
                {userData.address || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {renderPaymentMethods()}

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>Subtotal:</Text>
            <Text style={styles.totalRowValue}>₱{calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>Shipping Fee:</Text>
            <Text style={styles.totalRowValue}>₱{SHIPPING_FEE.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalText}>Total:</Text>
            <Text style={styles.grandTotalAmount}>
              ₱{calculateGrandTotal().toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={{ height: 90 }} />
      </ScrollView>

      {renderBottomNav()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Banner styles
  bannerContainer: {
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerGradient: {
    width: '100%',
  },
  bannerContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  bannerIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  bannerButtonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 69, 19, 0.1)',
  },
  bannerUpdateButton: {
    flex: 3,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  bannerUpdateButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  bannerDismissButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139, 69, 19, 0.1)',
  },
  bannerDismissButtonText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 15,
  },
  // Section styles
  section: {
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryInfoCard: {
    backgroundColor: '#FFFAF5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 69, 19, 0.05)',
  },
  label: {
    width: 80,
    fontWeight: '600',
    color: '#5D4037',
  },
  value: {
    flex: 1,
    color: '#333',
  },
  missingValue: {
    color: '#FF8C42',
    fontStyle: 'italic',
  },
  // Order items styling
  orderSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFAF5',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 8,
    lineHeight: 20,
    marginTop: 4,
    fontStyle: 'italic',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: '#8B4513',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF8C42',
  },
  // Total section styling
  totalSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRowLabel: {
    color: '#5D4037',
    fontSize: 15,
  },
  totalRowValue: {
    color: '#5D4037',
    fontSize: 15,
    fontWeight: '600',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 69, 19, 0.1)',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  grandTotalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  // The rest of your styles with updated colors and spacing
  // ... (keep existing styles and update colors as needed)
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 69, 19, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  checkoutButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paymentSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  paymentOption: {
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    borderRadius: 12,
    width: windowWidth / 3.7,
    backgroundColor: '#FFFAF5',
    marginBottom: 8,
  },
  selectedPayment: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  paymentIcon: {
    width: 35,
    height: 35,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5D4037',
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: 70, // Reduced to better fit the bottom nav
  },
});

export default Confirm;