import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { listProducts } from '../../Redux/Actions/productActions';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { CustomMarkerLeft, CustomMarkerRight } from '../../Components/CustomMarkers/CustomMarkers';
import Header from '../Shared/StyledComponents/Header';
import BottomNav from '../Shared/StyledComponents/BottomNav';
import { SCREEN_WIDTH } from '../../utils/dimensions';

const CATEGORIES = ['All', 'Rice Meal', 'Sandwich', 'Pasta'];

const { width: windowWidth } = Dimensions.get('window');

const Search = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 1000]); // Changed back to array for min/max
  const [minPrice] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldFilter, setShouldFilter] = useState(false);
  
  const dispatch = useDispatch();
  const productList = useSelector((state) => state.productList);
  const { loading, error, products = [] } = productList;

  useEffect(() => {
    dispatch(listProducts());
  }, [dispatch]);

  useEffect(() => {
    if (products && shouldFilter) {
      filterProducts(products);
      setShouldFilter(false); // Reset filter flag
    }
  }, [shouldFilter, products, selectedCategory, priceRange, searchQuery]);

  const filterProducts = (items) => {
    let filtered = [...items];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply price range filter
    filtered = filtered.filter(item => 
      item.price >= priceRange[0] && item.price <= priceRange[1]
    );

    setFilteredProducts(filtered);
  };

  const handleFilter = () => {
    setShouldFilter(true);
  };

  const renderProductPrice = (product) => {
    return (
      <View style={styles.priceContainer}>
        {product.discount > 0 ? (
          <>
            <Text style={styles.originalPrice}>₱{product.price}</Text>
            <Text style={styles.productPrice}>₱{product.discountedPrice}</Text>
          </>
        ) : (
          <Text style={styles.productPrice}>₱{product.price}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Custom search header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={handleFilter}>
          <Ionicons name="filter" size={24} color="#ff9900" />
        </TouchableOpacity>
      </View>

      {/* Category filters - Updated container */}
      <View style={styles.categorySection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScrollContent}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}>
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Price range filter */}
      <View style={styles.priceFilterContainer}>
        <Text style={styles.priceLabel}>Price Range</Text>
        <MultiSlider
          values={[priceRange[0], priceRange[1]]}
          min={0}
          max={1000}
          step={1}
          sliderLength={SCREEN_WIDTH - 60}
          selectedStyle={{
            backgroundColor: '#ff9900',
            height: 4,
          }}
          unselectedStyle={{
            backgroundColor: '#ddd',
            height: 4,
          }}
          containerStyle={styles.sliderContainer}
          trackStyle={styles.sliderTrack}
          isMarkersSeparated={true}
          customMarkerLeft={(e) => (
            <CustomMarkerLeft
              currentValue={e.currentValue}
            />
          )}
          customMarkerRight={(e) => (
            <CustomMarkerRight
              currentValue={e.currentValue}
            />
          )}
          onValuesChange={(values) => setPriceRange(values)}
        />
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color="#ff9900" style={styles.loader} />
      ) : (
        <ScrollView style={styles.resultsContainer}>
          {filteredProducts.map((product) => (
            <TouchableOpacity 
              key={product._id}
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetails', { product })}>
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
                <Image
                  source={
                    product.images && product.images[0]
                      ? { uri: product.images[0].url }
                      : require('../../assets/Home/placeholder.png')
                  }
                  style={styles.productImage}
                />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                {renderProductPrice(product)}
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredProducts.length === 0 && (
            <Text style={styles.noResults}>No products found</Text>
          )}
        </ScrollView>
      )}
      <BottomNav navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  categorySection: {
    height: 40,
    marginBottom: 5,
  },
  categoryScrollContent: {
    paddingHorizontal: 15,
    height: 32,
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    height: 32,
    justifyContent: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#ff9900',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 16,
  },
  categoryTextActive: {
    color: '#fff',
  },
  priceFilterContainer: {
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  priceText: {
    color: '#666',
  },
  sliderContainer: {
    height: 50, // Increased to accommodate price labels
    marginTop: 5,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  resultsContainer: {
    flex: 1,
    padding: 15,
  },
  productCard: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: 15,
  },
  discountTagContainer: {
    position: 'absolute',
    top: -5,
    left: -5,
    zIndex: 1,
  },
  discountTag: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  discountText: {
    position: 'absolute',
    left: 7,
    top: 7,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  productPrice: {
    fontSize: 14,
    color: '#ff9900',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontStyle: 'italic',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
});

export default Search;
