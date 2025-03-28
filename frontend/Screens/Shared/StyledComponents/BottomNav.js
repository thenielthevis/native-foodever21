import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BottomNav = ({ navigation, activeRoute }) => {
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
      <TouchableOpacity style={styles.tab}>
        <Ionicons name="cart-outline" size={24} color="#666" />
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
});

export default BottomNav;
