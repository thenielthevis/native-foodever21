import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, ImageBackground } from 'react-native';

const Home = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../../assets/Home/bg-img2.jpg')} style={styles.backgroundImage}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.carouselContainer}>
            <Image source={bannerImages[activeIndex]} style={styles.carouselImage} />
          </View>

          <View style={styles.menuContainer}>
            <View style={styles.menuItem}>
              <Image source={require('../../assets/Home/RiceMeal.jpg')} style={styles.menuImage} />
              <View style={styles.menuDetails}>
                <Text style={styles.menuTitle}>RICE MEALS MENU</Text>
                <Text style={styles.menuDescription}>Indulge in our mouthwatering rice meals, crafted to satisfy your cravings.</Text>
                <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
                  <Text style={styles.orderButtonText}>Order Now!</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.menuItem}>
              <Image source={require('../../assets/Home/SandwichMenu.jpg')} style={styles.menuImage} />
              <View style={styles.menuDetails}>
                <Text style={styles.menuTitle}>SANDWICHES MENU</Text>
                <Text style={styles.menuDescription}>Experience the perfect blend of fresh ingredients and flavors.</Text>
                <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
                  <Text style={styles.orderButtonText}>Order Now!</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.menuItem}>
              <Image source={require('../../assets/Home/PastaMenu.jpg')} style={styles.menuImage} />
              <View style={styles.menuDetails}>
                <Text style={styles.menuTitle}>PASTA MENU</Text>
                <Text style={styles.menuDescription}>Each plate is crafted with premium ingredients, bursting with flavors.</Text>
                <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
                  <Text style={styles.orderButtonText}>Order Now!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    overflow: 'hidden',
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
    backgroundColor: ' rgb(255, 153, 0)',
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