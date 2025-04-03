import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteBulkProducts
} from '../../Redux/Actions/productActions';
import { PRODUCT_CREATE_RESET, PRODUCT_UPDATE_RESET } from '../../Redux/Constants/productConstants';
import { debounce } from 'lodash';


// Import your product store
import productStore from '../../Redux/Store/productStore';


const { width } = Dimensions.get('window');


// Change the custom store integration approach to avoid infinite loops
const AdminProducts = () => {
  // Use refs to prevent recreation on each render
  const productStoreDispatch = React.useRef(productStore.dispatch);
  const productStoreGetState = React.useRef(() => productStore.getState());
 
  // Get initial state
  const [productState, setProductState] = useState(productStoreGetState.current());
 
  // Set up a subscription to productStore once on component mount
  useEffect(() => {
    console.log('Setting up store subscription and fetching products');
   
    // Initial products fetch
    productStoreDispatch.current(listProducts());
   
    const unsubscribe = productStore.subscribe(() => {
      const newState = productStoreGetState.current();
      console.log('Store updated:', {
        products: newState.productList?.products?.length || 0,
        createSuccess: newState.productCreate?.success,
        updateSuccess: newState.productUpdate?.success
      });
      setProductState(newState);
    });
   
    return () => {
      console.log('Cleaning up store subscription');
      unsubscribe();
    };
  }, []);
 
  // Extract state values safely with defaults
  const { loading = false, error = null, products = [] } = productState.productList || {};
  const { success: createSuccess, error: createError } = productState.productCreate || {};
  const { success: updateSuccess, error: updateError } = productState.productUpdate || {};
  const { success: deleteSuccess, error: deleteError } = productState.productDelete || {};


  // Create a stable dispatch function
  const dispatch = useCallback((action) => {
    console.log('Dispatching action:', action.type);
    productStoreDispatch.current(action);
  }, []);


  // Handle success states with proper dependencies
  useEffect(() => {
    if (createSuccess) {
      console.log('Product created successfully, resetting form');
      setIsModalVisible(false);
      resetForm();
      dispatch({ type: PRODUCT_CREATE_RESET });
      dispatch(listProducts());
    }
  }, [createSuccess, dispatch]);
 
  useEffect(() => {
    if (updateSuccess) {
      console.log('Product updated successfully, resetting form');
      setIsModalVisible(false);
      resetForm();
      dispatch({ type: PRODUCT_UPDATE_RESET });
      dispatch(listProducts());
    }
  }, [updateSuccess, dispatch]);
 
  useEffect(() => {
    if (deleteSuccess) {
      console.log('Product(s) deleted successfully, refreshing list');
      setSelectedProducts([]);
      dispatch(listProducts());
    }
  }, [deleteSuccess, dispatch]);


  // Modal and form states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productForm, setProductForm] = useState({
    _id: '',
    name: '',
    description: '',
    price: '',
    category: 'Rice Meal',
    status: 'Available',
    discount: '0',
    images: []
  });
 
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
 
  // Filter products based on search query and filters
  const getFilteredProducts = () => {
    if (!products) return [];
   
    return products.filter(product => {
      // Search by name
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
     
      // Filter by category
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
     
      // Filter by status
      const matchesStatus = statusFilter === 'All' || product.status === statusFilter;
     
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };


  // Debounce search to improve performance
  const debouncedSearch = useCallback(
    debounce(text => {
      setSearchQuery(text);
    }, 300),
    []
  );


  const resetForm = () => {
    setProductForm({
      _id: '',
      name: '',
      description: '',
      price: '',
      category: 'Rice Meal',
      status: 'Available',
      discount: '0',
      images: []
    });
    setIsEditMode(false);
  };


  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setIsFilterVisible(false);
  };


  // Form handling functions
  const handleAddProduct = () => {
    setIsModalVisible(true);
    resetForm();
  };


  const handleEditProduct = (product) => {
    setIsEditMode(true);
    setProductForm({
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      status: product.status,
      discount: product.discount.toString(),
      images: product.images || []
    });
    setIsModalVisible(true);
  };


  const handleSubmit = () => {
    if (!productForm.name || !productForm.description || !productForm.price) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }


    // Create a clean object with properly formatted values
    const productData = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: parseFloat(productForm.price),
      category: productForm.category,
      status: productForm.status,
      discount: parseInt(productForm.discount || '0'),
      images: productForm.images
    };


    console.log(`${isEditMode ? 'Updating' : 'Creating'} product:`, {
      ...productData,
      images: `${productData.images.length} images`
    });


    if (isEditMode) {
      dispatch(updateProduct(productForm._id, productData));
    } else {
      dispatch(createProduct(productData));
    }
  };


  // Image handling functions
  const handleSelectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
   
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to grant camera roll permissions to upload images');
      return;
    }


    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });


    if (!result.canceled) {
      const newImage = {
        url: result.assets[0].uri,
        public_id: `temp-${Date.now()}`
      };
      setProductForm({
        ...productForm,
        images: [...productForm.images, newImage]
      });
    }
  };


  const handleRemoveImage = (index) => {
    const updatedImages = [...productForm.images];
    updatedImages.splice(index, 1);
    setProductForm({
      ...productForm,
      images: updatedImages
    });
  };


  // Selection and deletion functions
  const toggleProductSelection = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };


  const handleDeleteSelected = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'No products selected');
      return;
    }


    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${selectedProducts.length} selected product(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteBulkProducts(selectedProducts))
        }
      ]
    );
  };


  const handleDeleteSingleProduct = (productId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteProduct(productId))
        }
      ]
    );
  };


  // Render functions
  const renderProductItem = ({ item }) => (
    <View style={styles.productItem}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleProductSelection(item._id)}
      >
        <View style={[
          styles.checkbox,
          selectedProducts.includes(item._id) && styles.checkboxSelected
        ]}>
          {selectedProducts.includes(item._id) && (
            <Icon name="check" size={14} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
     
      <View style={styles.productDetails}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={styles.noImage}>
              <Text>No Image</Text>
            </View>
          )}
        </View>
       
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>
            ₱{item.price.toFixed(2)}
            {item.discount > 0 && (
              <Text style={styles.discountText}> (-{item.discount}%)</Text>
            )}
          </Text>
          <View style={styles.tagContainer}>
            <View style={styles.categoryTag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
            <View style={[
              styles.statusTag,
              item.status === 'Available' ? styles.availableTag : styles.unavailableTag
            ]}>
              <Text style={styles.tagText}>{item.status}</Text>
            </View>
          </View>
        </View>
       
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditProduct(item)}
          >
            <Icon name="edit" size={20} color="#fff" />
          </TouchableOpacity>
         
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteSingleProduct(item._id)}
          >
            <Icon name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );


  const filteredProducts = getFilteredProducts();


  return (
    <View style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products Management</Text>
       
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={16} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={(text) => debouncedSearch(text)}
              clearButtonMode="while-editing"
            />
          </View>
         
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsFilterVisible(!isFilterVisible)}
          >
            <Icon name="filter" size={16} color="#666" />
          </TouchableOpacity>
        </View>
       
        {/* Filter section */}
        {isFilterVisible && (
          <View style={styles.filterContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['All', 'Rice Meal', 'Pasta', 'Sandwich'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      categoryFilter === category && styles.activeFilterChip
                    ]}
                    onPress={() => setCategoryFilter(category)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      categoryFilter === category && styles.activeFilterChipText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
           
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['All', 'Available', 'Unavailable'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.activeFilterChip
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      statusFilter === status && styles.activeFilterChipText
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
           
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={resetFilters}
            >
              <Text style={styles.clearFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}
       
        {/* Action buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={handleAddProduct}
          >
            <Icon name="plus" size={16} color="#fff" />
            <Text style={styles.buttonText}>Add Product</Text>
          </TouchableOpacity>
         
          {selectedProducts.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDeleteSelected}
            >
              <Icon name="trash" size={16} color="#fff" />
              <Text style={styles.buttonText}>Delete ({selectedProducts.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Results summary */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All') ? ' (filtered)' : ''}
        </Text>
      </View>


      {/* Product list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(listProducts())}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="inbox" size={50} color="#ccc" />
          <Text style={styles.noResultsText}>
            {products && products.length > 0
              ? 'No products match your filters'
              : 'No products found'}
          </Text>
          {products && products.length > 0 && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={resetFilters}
            >
              <Text style={styles.clearFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}


      {/* Product form modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(false);
                }}
              >
                <Icon name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>
           
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={productForm.name}
                onChangeText={(text) => setProductForm({...productForm, name: text})}
                placeholder="Enter product name"
              />
             
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productForm.description}
                onChangeText={(text) => setProductForm({...productForm, description: text})}
                placeholder="Enter product description"
                multiline
                numberOfLines={4}
              />
             
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={productForm.price}
                onChangeText={(text) => setProductForm({...productForm, price: text})}
                placeholder="Enter price"
                keyboardType="numeric"
              />
             
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={productForm.category}
                  onValueChange={(value) => setProductForm({...productForm, category: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Rice Meal" value="Rice Meal" />
                  <Picker.Item label="Pasta" value="Pasta" />
                  <Picker.Item label="Sandwich" value="Sandwich" />
                </Picker>
              </View>
             
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    productForm.status === 'Available' && styles.statusButtonActive
                  ]}
                  onPress={() => setProductForm({...productForm, status: 'Available'})}
                >
                  <Text style={[
                    styles.statusButtonText,
                    productForm.status === 'Available' && styles.statusButtonTextActive
                  ]}>Available</Text>
                </TouchableOpacity>
               
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    productForm.status === 'Unavailable' && styles.statusButtonActive
                  ]}
                  onPress={() => setProductForm({...productForm, status: 'Unavailable'})}
                >
                  <Text style={[
                    styles.statusButtonText,
                    productForm.status === 'Unavailable' && styles.statusButtonTextActive
                  ]}>Unavailable</Text>
                </TouchableOpacity>
              </View>
             
              <Text style={styles.label}>Discount (%)</Text>
              <TextInput
                style={styles.input}
                value={productForm.discount}
                onChangeText={(text) => setProductForm({...productForm, discount: text})}
                placeholder="Enter discount percentage"
                keyboardType="numeric"
              />
             
              <Text style={styles.label}>Images</Text>
              <View style={styles.imagesContainer}>
                {productForm.images.map((image, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.url }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Icon name="times" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleSelectImage}
                >
                  <Icon name="camera" size={24} color="#666" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              </View>
             
              {(createError || updateError) && (
                <Text style={styles.errorText}>{createError || updateError}</Text>
              )}
             
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.modalButtonText}>
                    {isEditMode ? 'Update Product' : 'Create Product'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginLeft: 10,
  },
  filterContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterRow: {
    marginBottom: 10,
  },
  filterLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#eee',
    marginRight: 8,
    marginBottom: 5,
  },
  activeFilterChip: {
    backgroundColor: '#4CAF50',
  },
  filterChipText: {
    color: '#333',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  clearFilterButton: {
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  clearFilterText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  resultsBar: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  resultsText: {
    color: '#666',
  },
  list: {
    padding: 10,
    paddingBottom: 30,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkboxContainer: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  productDetails: {
    flex: 1,
    flexDirection: 'row',
  },
  imageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 5,
  },
  noImage: {
    width: 70,
    height: 70,
    borderRadius: 5,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  discountText: {
    color: '#F44336',
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  categoryTag: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 5,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  availableTag: {
    backgroundColor: '#E8F5E9',
  },
  unavailableTag: {
    backgroundColor: '#FFEBEE',
  },
  tagText: {
    fontSize: 12,
  },
  actionButtons: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: 50,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    margin: 10,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  statusButtons: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  statusButtonText: {
    color: '#333',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    margin: 5,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  addImageButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    borderStyle: 'dashed',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addImageText: {
    marginTop: 5,
    color: '#666',
  },
  modalButtons: {
    marginTop: 10,
    marginBottom: 15,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


export default AdminProducts;