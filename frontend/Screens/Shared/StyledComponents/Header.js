import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ isScrolled }) => {
  return (
    <Animated.View style={[
      styles.searchContainer,
      isScrolled && styles.searchContainerScrolled
    ]}>
      <View style={[
        styles.searchWrapper,
        isScrolled ? styles.searchWrapperScrolled : styles.searchWrapperTransparent
      ]}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#666"
        />
      </View>
      <TouchableOpacity style={[
        styles.filterButton,
        isScrolled ? styles.filterButtonScrolled : styles.filterButtonTransparent
      ]}>
        <Ionicons name="filter" size={24} color="#ff9900" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: StatusBar.currentHeight + 1,
    paddingBottom: 10,
  },
  searchContainerScrolled: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    height: 40,
  },
  searchWrapperTransparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(10px)',
  },
  searchWrapperScrolled: {
    backgroundColor: '#f5f5f5',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
  },
  filterButtonScrolled: {
    backgroundColor: 'rgba(245, 245, 245, 1)',
  },
  filterButtonTransparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  }
});

export default Header;
