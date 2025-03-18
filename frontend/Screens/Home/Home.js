import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ImageBackground,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../Shared/StyledComponents/Header';
import BottomNav from '../Shared/StyledComponents/BottomNav';

const Home = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const bannerImages = [
    require('../../assets/Home/burger-banner.jpg'),
    require('../../assets/Home/sizzling-banner.jpg'),
    require('../../assets/Home/drinks-banner.jpg'),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderNow = () => {
    navigation.navigate('Products');
  };

  const handleScroll = (event) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  return (
    <ImageBackground 
      source={require('../../assets/Home/bg-img2.jpg')} 
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        {/* Header */}
        <View 
          style={[
            styles.headerContainer, 
            { paddingTop: insets.top - 10 },
            scrollY > 50 && styles.headerContainerScrolled
          ]}
        >
          <Header isScrolled={scrollY > 50} />
        </View>

        {/* Main Scrollable Content */}
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Banner Carousel */}
          <View style={styles.carouselContainer}>
            <Image source={bannerImages[activeIndex]} style={styles.carouselImage} />
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/Home/logo.png')} 
                style={styles.logo}
              />
              <Text style={styles.logoText}>FoodEver21</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {[
              { 
                image: require('../../assets/Home/RiceMeal.jpg'), 
                title: 'RICE MEALS MENU', 
                description: 'Indulge in our mouthwatering rice meals, crafted to satisfy your cravings.' 
              },
              { 
                image: require('../../assets/Home/SandwichMenu.jpg'), 
                title: 'SANDWICHES MENU', 
                description: 'Experience the perfect blend of fresh ingredients and flavors.' 
              },
              { 
                image: require('../../assets/Home/PastaMenu.jpg'), 
                title: 'PASTA MENU', 
                description: 'Each plate is crafted with premium ingredients, bursting with flavors.' 
              }
            ].map((item, index) => (
              <View key={index} style={styles.menuItem}>
                <Image source={item.image} style={styles.menuImage} />
                <View style={styles.menuDetails}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                  <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
                    <Text style={styles.orderButtonText}>Order Now!</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNav navigation={navigation} activeRoute="Home" />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0, // Changed from negative insets.top
    left: 0,
    right: 0,
    zIndex: 2,
  },
  headerContainerScrolled: {
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  headerSafeArea: {
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  carouselContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.8, // Slightly dim the image to make logo/text more visible
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  menuDetails: {
    padding: 15,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  orderButton: {
    backgroundColor: '#ff9900',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Home;