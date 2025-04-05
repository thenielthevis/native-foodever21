import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useDispatch } from 'react-redux';

const OrderModal = ({ visible, onClose, product, navigation }) => {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const dispatch = useDispatch();

  const updateQuantity = (value) => {
    setQuantity(Math.max(1, quantity + value));
  };

  const handleOrder = () => {
    // Create a selected order object
    const selectedOrder = {
      order_id: Date.now().toString(),
      product: {
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.discountedPrice,
        image: product.images?.[0]?.url || '',
      },
      quantity: quantity
    };

    // Dispatch selected order to Redux
    dispatch({
      type: 'SET_SELECTED_ORDERS',
      payload: [selectedOrder]
    });

    // Close modal and navigate to Confirm screen
    onClose();
    navigation.navigate('Confirm');
  };

  const calculatePrice = () => {
    const basePrice = product?.discountedPrice || product?.price || 0;
    return (basePrice * quantity).toFixed(2);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Order Now</Text>
          <Text style={styles.productName}>{product?.name}</Text>
          
          <View style={styles.priceContainer}>
            {product?.discount > 0 ? (
              <>
                <Text style={styles.originalPrice}>₱{product?.price.toFixed(2)}</Text>
                <Text style={styles.discountedPrice}>₱{product?.discountedPrice.toFixed(2)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product?.discount}% OFF</Text>
                </View>
              </>
            ) : (
              <Text style={styles.price}>₱{product?.price}</Text>
            )}
          </View>

          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => updateQuantity(-1)}
              disabled={isProcessing}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => updateQuantity(1)}
              disabled={isProcessing}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.totalPrice}>
            Total: ₱{calculatePrice()}
          </Text>

          <TouchableOpacity 
            style={[styles.orderButton, isProcessing && styles.orderButtonDisabled]}
            onPress={handleOrder}
            disabled={isProcessing}
          >
            <Text style={styles.orderButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isProcessing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  productName: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  discountBadge: {
    backgroundColor: '#ff9900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  quantityButton: {
    backgroundColor: '#ff9900',
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17.5
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  quantity: {
    fontSize: 20,
    marginHorizontal: 20
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20
  },
  orderButton: {
    backgroundColor: '#ff9900',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    padding: 10
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16
  },
  orderButtonDisabled: {
    opacity: 0.7
  }
});

export default OrderModal;
