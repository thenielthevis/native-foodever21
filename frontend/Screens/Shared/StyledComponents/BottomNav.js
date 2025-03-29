import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderCount } from '../../../Redux/Actions/cartActions';
import * as SecureStore from 'expo-secure-store';

const BottomNav = ({ navigation, activeRoute }) => {
  const dispatch = useDispatch();
  const { cartCount = 0 } = useSelector(state => state.cart || { cartCount: 0 });

  const handleCartPress = async () => {
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      navigation.navigate('signin');
      return;
    }
    navigation.navigate('Cart');
  };

  useEffect(() => {
    dispatch(fetchOrderCount());
    const interval = setInterval(() => {
      dispatch(fetchOrderCount());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Home')}>
        <Ionicons 
          name={activeRoute === 'Home' ? 'home' : 'home-outline'} 
          size={24} 
          color={activeRoute === 'Home' ? '#ff9900' : '#666'} 
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab}>
        <Ionicons name="notifications-outline" size={24} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tab}
        onPress={handleCartPress}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={activeRoute === 'Cart' ? 'cart' : 'cart-outline'} 
            size={24} 
            color={activeRoute === 'Cart' ? '#ff9900' : '#666'} 
          />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => navigation.navigate('profile')}
      >
        <Ionicons 
          name={activeRoute === 'Profile' ? 'person' : 'person-outline'} 
          size={24} 
          color={activeRoute === 'Profile' ? '#ff9900' : '#666'} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 1,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default BottomNav;
