import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ToastAndroid,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../Redux/Actions/cartActions';

const CartModal = ({ visible, onClose, product }) => {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  // Get cart state safely with default values
  const cartState = useSelector(state => state.cart) || {};
  const { error } = cartState;

  const updateQuantity = (value) => {
    setQuantity(Math.max(1, quantity + value));
  };

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      const result = await dispatch(addToCart(product, quantity));
      
      if (result.success) {
        ToastAndroid.show(
          'Product added to cart successfully!',
          ToastAndroid.SHORT
        );
        onClose();
        setQuantity(1);
      } else {
        ToastAndroid.show(
          result.error || 'Failed to add product to cart',
          ToastAndroid.SHORT
        );
      }
    } catch (err) {
      ToastAndroid.show(
        'Failed to add item to cart',
        ToastAndroid.SHORT
      );
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrice = () => {
    const basePrice = product?.discountedPrice || product?.price || 0;
    return (basePrice * quantity).toFixed(2);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add to Cart</Text>
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
              disabled={isLoading}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => updateQuantity(1)}
              disabled={isLoading}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.totalPrice}>
            Total: ₱{calculatePrice()}
          </Text>

          <TouchableOpacity 
            style={[styles.addButton, isLoading && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.addButtonText}>Add to Cart</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
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
  addButton: {
    backgroundColor: '#ff9900',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10
  },
  addButtonText: {
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
  addButtonDisabled: {
    opacity: 0.7
  }
});

export default CartModal;
