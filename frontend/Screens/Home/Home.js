import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity, ScrollView, Animated, Modal, SafeAreaView, ImageBackground, ActivityIndicator, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { listProducts } from '../../Redux/Actions/productActions';
import { fetchCartCount } from '../../Redux/Actions/cartActions';
import Header from '../Shared/StyledComponents/Header';
import BottomNav from '../Shared/StyledComponents/BottomNav';
import TokenExpired from '../Modals/TokenExpired';

const Home = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [productImageIndexes, setProductImageIndexes] = useState({});
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);

  const bannerImages = [
    require('../../assets/Home/burger-banner.jpg'),
    require('../../assets/Home/sizzling-banner.jpg'),
    require('../../assets/Home/drinks-banner.jpg'),
  ];

  const dispatch = useDispatch();
  const productList = useSelector((state) => state.productList);
  const { loading, error, products = [] } = productList;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await dispatch(fetchCartCount());
        dispatch(listProducts());
      } catch (error) {
        if (error.message?.includes('expired') || error.response?.status === 401) {
          setShowTokenExpiredModal(true);
        }
      }
    };
    initializeData();
  }, [dispatch]);

  useEffect(() => {
    // Product images carousel effect
    const interval = setInterval(() => {
      setProductImageIndexes(prev => {
        const newIndexes = { ...prev };
        products.forEach(product => {
          if (product.images && product.images.length > 1) {
            newIndexes[product._id] = ((newIndexes[product._id] || 0) + 1) % product.images.length;
          }
        });
        return newIndexes;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [products]);

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)'],
    extrapolate: 'clamp',
  });

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    setIsHeaderScrolled(scrollPosition > 200); // Reduced threshold for quicker transition
  };

  const menuImages = [
    {
      id: 'pasta',
      source: require('../../assets/Home/PastaMenu.jpg'),
      title: 'Pasta'
    },
    {
      id: 'riceMeals',
      source: require('../../assets/Home/RiceMeal.jpg'),
      title: 'Rice Meals'
    },
    {
      id: 'sandwiches',
      source: require('../../assets/Home/SandwichMenu.jpg'),
      title: 'Sandwiches'
    },
  ];

  const handleImagePress = (image) => {
    setSelectedImage(image);
  };

  const renderProductImage = (product) => {
    const currentIndex = productImageIndexes[product._id] || 0;
    return (
      <View style={styles.productImageContainer}>
        {product.discount > 0 && (
          <View style={styles.discountTagContainer}>
            <Image
              source={require('../../assets/Home/discount-tag.png')}
              style={styles.discountTag}
            />
            <Text style={styles.discountText}>{product.discount}%</Text>
          </View>
        )}
        {!product.images || product.images.length === 0 ? (
          <Image
            source={require('../../assets/Home/placeholder.png')}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={{ uri: product.images[currentIndex].url }}
            style={styles.productImage}
            defaultSource={require('../../assets/Home/placeholder.png')}
          />
        )}
      </View>
    );
  };

  const renderPrice = (product) => {
    return (
      <View style={styles.priceContainer}>
        {product.discount > 0 ? (
          <>
            <Text style={styles.originalPrice}>₱{product.price.toFixed(2)}</Text>
            <Text style={styles.discountedPrice}>₱{product.discountedPrice.toFixed(2)}</Text>
          </>
        ) : (
          <Text style={styles.productPrice}>₱{product.price}</Text>
        )}
      </View>
    );
  };

  const renderMenuItems = () => {
    return (
      <View style={styles.menuFanContainer}>
        {menuImages.map((menu, index) => (
          <TouchableOpacity
            key={menu.id}
            style={[
              styles.menuFanItem,
              {
                transform: [
                  { perspective: 1000 },
                  { rotateY: index === 1 ? '0deg' : index === 0 ? '-30deg' : '30deg' },
                  { translateX: index === 1 ? 0 : index === 0 ? -30 : 30 }
                ],
                zIndex: index === 1 ? 2 : 1
              }
            ]}
            onPress={() => handleImagePress(menu.source)}>
            <Image source={menu.source} style={styles.menuFanImage} />
            <View style={styles.menuFanOverlay}>
              <Text style={styles.menuFanTitle}>{menu.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleLogin = () => {
    setShowTokenExpiredModal(false);
    navigation.navigate('Signin');
  };

  const handleClose = () => {
    setShowTokenExpiredModal(false);
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <ImageBackground source={require('../../assets/Home/bg-img2.jpg')} style={styles.backgroundImage}>
          <View style={styles.container}>
            <Header isScrolled={isHeaderScrolled} />
            <ScrollView 
              onScroll={handleScroll} 
              scrollEventThrottle={16} 
              contentContainerStyle={styles.scrollContainer}>
              <View style={styles.carouselContainer}>
                <Image source={bannerImages[activeIndex]} style={styles.carouselImage} />
                <View style={styles.carouselOverlay}>
                  <Text style={styles.carouselTitle}>FOODEVER 21</Text>
                  <Image 
                    source={require('../../assets/Home/logo.png')} 
                    style={styles.logoImage}
                  />
                </View>
              </View>

              <View style={styles.categoryIcons}>
                <TouchableOpacity style={styles.iconContainer}>
                  <Image source={require('../../assets/Home/pasta-icon.png')} style={styles.icon} />
                  <Text style={styles.iconText}>Pasta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconContainer}>
                  <Image source={require('../../assets/Home/ricemeal-icon.png')} style={styles.icon} />
                  <Text style={styles.iconText}>Rice Meals</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconContainer}>
                  <Image source={require('../../assets/Home/sandwich-icon.png')} style={styles.icon} />
                  <Text style={styles.iconText}>Sandwiches</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuContainer}>
                {renderMenuItems()}
              </View>

              <View style={styles.productsSection}>
                <Text style={styles.sectionTitle}>Our Dishes</Text>
                <View style={styles.productsGrid}>
                  {loading ? (
                    <ActivityIndicator size="large" color="#ff9900" style={styles.loadingCircle} />
                  ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : (
                    products.map((product, index) => (
                      <TouchableOpacity 
                        key={product._id || index}
                        style={styles.productCard}
                        onPress={() => navigation.navigate('ProductDetails', { product })}>
                        {renderProductImage(product)}
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {product.name}
                          </Text>
                          
                          {/* Status indicator */}
                          <View style={[styles.statusBadge, 
                            { backgroundColor: product.status === 'Available' ? '#e6ffe6' : '#ffe6e6' }
                          ]}>
                            <View style={[styles.statusDot, 
                              { backgroundColor: product.status === 'Available' ? '#00cc00' : '#ff3333' }
                            ]} />
                            <Text style={[styles.statusText, 
                              { color: product.status === 'Available' ? '#006600' : '#cc0000' }
                            ]}>
                              {product.status}
                            </Text>
                          </View>

                          <Text style={styles.productDescription} numberOfLines={2}>
                            {product.description}
                          </Text>
                          {renderPrice(product)}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>

            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
              <TouchableOpacity 
                style={styles.modalView} 
                onPress={() => setSelectedImage(null)}>
                <Image source={selectedImage} style={styles.fullScreenImage} />
              </TouchableOpacity>
            </Modal>

            <TokenExpired
              visible={showTokenExpiredModal}
              onLogin={handleLogin}
              onClose={handleClose}
            />

            <BottomNav navigation={navigation} activeRoute="Home" />
          </View>
        </ImageBackground>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 0, // Remove default padding
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  carouselContainer: {
    height: 250,
    width: '100%',
    marginTop: -StatusBar.currentHeight, // Overlap status bar
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  carouselOverlay: {
    position: 'absolute',
    top: 100, // Adjusted to appear below search
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  categoryIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
  },
  iconContainer: {
    alignItems: 'center',
  },
  icon: {
    width: 100,
    height: 50,
    resizeMode: 'contain',
  },
  iconText: {
    marginTop: 5,
    fontSize: 12,
    color: 'white',
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  menuFanContainer: {
    height: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  menuFanItem: {
    width: '40%',
    height: 250,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginHorizontal: -10,
  },
  menuFanImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  menuFanOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
  },
  menuFanTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  productsSection: {
    padding: 15,
    borderRadius: 15,
    margin: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#ff9900',
    alignSelf: 'center',
  },
  loadingCircle: {
    flex: 1,
    minHeight: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
    margin: '1%',
  },
  productInfo: {
    padding: 10,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9900',
    marginTop: 4,
  },
  productItem: {
    width: '48%',
    marginBottom: 15,
    marginHorizontal: '1%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 10,
    width: '100%',
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 5,
    fontWeight: 'bold',
  },
  placeholderImage: {
    width: '80%',
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  discountTagContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountTag: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  discountText: {
    position: 'absolute',
    left: 10,
    top: 10,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default Home;