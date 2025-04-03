import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';

const Header = ({ isScrolled, onSearchPress }) => {
  const navigation = useNavigation();

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      navigation.navigate('Search');
    }
  };

  const openDrawer = () => {
    try {
      navigation.dispatch(DrawerActions.toggleDrawer());
    } catch (error) {
      console.log('Drawer error:', error);
    }
  };

  return (
    <Animated.View style={[
      styles.searchContainer,
      isScrolled && styles.searchContainerScrolled
    ]}>
      <TouchableOpacity 
        style={[
          styles.menuButton,
          isScrolled && styles.menuButtonScrolled
        ]}
        onPress={openDrawer}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="menu" 
          size={24} 
          color={isScrolled ? "#333" : "#fff"} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.searchWrapper,
          isScrolled ? styles.searchWrapperScrolled : styles.searchWrapperTransparent
        ]}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#666"
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.filterButton,
          isScrolled ? styles.filterButtonScrolled : styles.filterButtonTransparent
        ]}
        onPress={handleSearchPress}
        activeOpacity={0.7}
      >
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
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 10,
    height: StatusBar.currentHeight + 60,
  },
  searchContainerScrolled: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
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
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    transform: [{scale: 1}],
  },
  menuButtonScrolled: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#eee',
  }
});

export default Header;