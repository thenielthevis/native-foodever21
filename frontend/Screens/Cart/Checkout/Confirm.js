import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, Dimensions, ActivityIndicator
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { getUserProfile } from '../../../Redux/Actions/Auth.actions';
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
  const selectedOrders = useSelector(state => state.cart.selectedOrders || []);

  useEffect(() => {
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
  }, []);

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
        Alert.alert(
          'Missing Information',
          'Please update your profile with mobile number and address.'
        );
      }
     
      setUserData(userProfile);
    } catch (error) {
      console.error('[Confirm] Error fetching user profile:', error);
      Alert.alert(
        'Error',
        'Failed to load user information. Please try again.'
      );
    }
  };

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

  const renderOrderItems = () => (
    <View style={styles.orderSection}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      {selectedOrders.map((item) => (
        <View key={item.order_id} style={styles.orderItem}>
          <Image
            source={{ uri: item.product.image }}
            style={styles.productImage}
            defaultSource={require('../../../assets/Home/placeholder.png')}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product.name}</Text>
            <Text style={styles.productDesc} numberOfLines={2}>
              {item.product.description}
            </Text>
            <View style={styles.priceRow}>
              <Text>Quantity: {item.quantity}</Text>
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
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      <View style={styles.paymentOptions}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'cash_on_delivery' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('cash_on_delivery')}
        >
          <Image
            source={require('../../../assets/images/cod.png')}
            style={styles.paymentIcon}
          />
          <Text>Cash on Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'credit_card' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('credit_card')}
        >
          <Image
            source={require('../../../assets/images/credit-card.png')}
            style={styles.paymentIcon}
          />
          <Text>Credit Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedPayment === 'gcash' && styles.selectedPayment
          ]}
          onPress={() => setSelectedPayment('gcash')}
        >
          <Image
            source={require('../../../assets/images/gcash.png')}
            style={styles.paymentIcon}
          />
          <Text>GCash</Text>
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
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
            <Text style={styles.value}>{userData.mobileNumber || 'Not provided'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{userData.address || 'Not provided'}</Text>
          </View>
        </View>

        {renderOrderItems()}
        {renderPaymentMethods()}

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>₱{calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Shipping Fee:</Text>
            <Text>₱{SHIPPING_FEE.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalText}>Total:</Text>
            <Text style={styles.grandTotalAmount}>
              ₱{calculateGrandTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderBottomNav()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 15,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    width: 100,
    fontWeight: '600',
  },
  value: {
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
    backgroundColor: '#ff9900',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
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
  orderSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  orderItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
  },
  productDesc: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff9900',
  },
  paymentSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  paymentOption: {
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    width: windowWidth / 3.5,
  },
  selectedPayment: {
    borderColor: '#ff9900',
    backgroundColor: '#fff9f0',
  },
  paymentIcon: {
    width: 30,
    height: 30,
    marginBottom: 5,
    resizeMode: 'contain',
  },
  totalSection: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
    paddingTop: 10,
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  checkoutButton: {
    backgroundColor: '#ff9900',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.8,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    marginBottom: 70, // Reduced to better fit the bottom nav
  },
});

export default Confirm;