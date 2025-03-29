import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { createOrder, setPaymentMethod } from '../../../Redux/Actions/orderActions';

const Payment = ({ navigation }) => {
  const dispatch = useDispatch();
  const selectedItems = useSelector(state => state.order.selectedItems);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const taxRate = useSelector(state => state.order.taxRate);

  const subtotal = selectedItems.reduce((total, item) => {
    const price = item.product.discountedPrice || item.product.price;
    return total + (price * item.quantity);
  }, 0);

  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;

  const handlePaymentSelect = (method) => {
    setSelectedPayment(method);
    dispatch(setPaymentMethod(method));
  };

  const handleCheckout = async () => {
    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      const orderData = {
        items: selectedItems,
        paymentMethod: selectedPayment,
        subtotal,
        tax,
        total: grandTotal
      };

      await dispatch(createOrder(orderData));
      navigation.navigate('OrderSuccess');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            {['cash_on_delivery', 'credit_card', 'gcash'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  selectedPayment === method && styles.selectedPayment
                ]}
                onPress={() => handlePaymentSelect(method)}
              >
                <Image
                  source={
                    method === 'cash_on_delivery'
                      ? require('../../../assets/images/cod.png')
                      : method === 'credit_card'
                      ? require('../../../assets/images/credit-card.png')
                      : require('../../../assets/images/gcash.png')
                  }
                  style={styles.paymentIcon}
                />
                <Text style={styles.paymentText}>
                  {method === 'cash_on_delivery'
                    ? 'Cash on Delivery'
                    : method === 'credit_card'
                    ? 'Credit Card'
                    : 'GCash'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {selectedItems.map((item) => (
            <View key={item.order_id} style={styles.orderItem}>
              <Image
                source={{ uri: item.product.image }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <Text style={styles.productPrice}>
                  ₱{item.product.discountedPrice || item.product.price} x {item.quantity}
                </Text>
                <Text style={styles.itemTotal}>
                  ₱{(item.product.discountedPrice || item.product.price) * item.quantity}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalItem}>
            <Text>Subtotal:</Text>
            <Text>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalItem}>
            <Text>Tax ({(taxRate * 100).toFixed(0)}%):</Text>
            <Text>₱{tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalItem, styles.grandTotal]}>
            <Text style={styles.grandTotalText}>Total:</Text>
            <Text style={styles.grandTotalAmount}>₱{grandTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={!selectedPayment}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  paymentOption: {
    width: '30%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedPayment: {
    borderColor: '#ff9900',
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  paymentText: {
    fontSize: 12,
    textAlign: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productPrice: {
    color: '#666',
  },
  itemTotal: {
    fontWeight: 'bold',
  },
  totalSection: {
    padding: 20,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  grandTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  bottomNav: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  checkoutButton: {
    backgroundColor: '#ff9900',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Payment;
