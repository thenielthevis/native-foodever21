import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOrders, updateOrderStatus } from '../../Redux/Actions/orderActions';
import { Picker } from '@react-native-picker/picker';
import * as SecureStore from 'expo-secure-store';


const AdminOrders = ({ navigation }) => {
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);
 
  // Default to empty array if adminOrders is undefined
  const { adminOrders = [], adminOrdersLoading, adminOrdersError } = useSelector(state => state.order);
 
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
 
  // Fetch orders on component mount
  useEffect(() => {
    console.log('AdminOrders - useEffect - Loading orders');
    loadOrders();
  }, []);
 
  const loadOrders = async () => {
    try {
      setIsRefreshing(true);
      console.log('AdminOrders - loadOrders - Dispatching getAllOrders');
      await dispatch(getAllOrders());
    } catch (error) {
      console.error('AdminOrders - loadOrders - Error:', error);
     
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.message?.includes('authentication')) {
        Alert.alert(
          'Authentication Error',
          'Your session has expired or you do not have permission to access order data. Please log in again.',
          [{
            text: 'Go to Login',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }], // Replace with your actual login screen name
            })
          }]
        );
      } else {
        // Generic error message for other types of errors
        Alert.alert(
          'Error Loading Orders',
          'Failed to load orders. Please check your network connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  };
 
  // Filter orders based on status and search query - safely handle undefined array
  const filteredOrders = adminOrders && adminOrders.length > 0 ? adminOrders.filter(order => {
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
   
    // If search query is empty, only filter by status
    if (!searchQuery.trim()) {
      return matchesStatus;
    }
   
    // Search in order number, customer name and items
    const lowercaseQuery = searchQuery.toLowerCase().trim();
    const matchesOrderNumber = order.orderNumber.toLowerCase().includes(lowercaseQuery);
    const matchesCustomer = order.customer.toLowerCase().includes(lowercaseQuery);
   
    // Search in item names if the order has items
    const matchesItems = order.items && order.items.some(item =>
      item.name.toLowerCase().includes(lowercaseQuery)
    );
   
    return matchesStatus && (matchesOrderNumber || matchesCustomer || matchesItems);
  }) : [];
 
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#4CAF50';
      case 'Shipping': return '#2196F3';
      case 'Cancelled': return '#F44336';
      default: return '#FFC107';
    }
  };
 
  const handleUpdateStatus = async () => {
    if (!selectedOrder || !selectedStatus) return;
   
    try {
      await dispatch(updateOrderStatus(selectedOrder.id, selectedStatus.toLowerCase()));
      setStatusModalVisible(false);
      Alert.alert('Success', `Order status updated to ${selectedStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status: ' + error.message);
    }
  };
 
  const openStatusModal = (order) => {
    // Prevent updating completed or cancelled orders
    if (order.status === 'completed' || order.status === 'cancelled') {
      Alert.alert(
        'Status Locked',
        `This order is already marked as ${order.status} and cannot be modified.`
      );
      return;
    }
   
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setStatusModalVisible(true);
  };


  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('All');
    setShowSearchBar(false);
  };


  const renderOrderItem = ({ item }) => {
    const isExpanded = expandedOrder === item.id;
    const isImmutableStatus = item.status === 'completed' || item.status === 'cancelled';
   
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Text style={styles.customer}>{item.customer}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={styles.rightHeader}>
            <Text style={styles.amount}>₱{item.amount.toFixed(2)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
       
        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.detailsTitle}>Order Items:</Text>
            {item.items && item.items.map((orderItem, index) => (
              <View key={index} style={styles.orderItemRow}>
                <Text style={styles.itemName}>{orderItem.quantity}x {orderItem.name}</Text>
                <Text style={styles.itemPrice}>₱{(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.updateButton,
                  isImmutableStatus && styles.disabledButton
                ]}
                onPress={() => openStatusModal(item)}
                disabled={isImmutableStatus}
              >
                <Text style={[
                  styles.actionButtonText,
                  isImmutableStatus && styles.disabledButtonText
                ]}>
                  {isImmutableStatus ? 'Status Locked' : 'Update Status'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.detailsButton]}>
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
       
        <View style={styles.expandIconContainer}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
          />
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders Management</Text>
       
        {showSearchBar ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders by number, customer, or item"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearchBar(false)}
            >
              <Ionicons name="close-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => Alert.alert('Filter', 'Status filter options', [
                { text: 'All', onPress: () => setFilterStatus('All') },
                { text: 'Shipping', onPress: () => setFilterStatus('shipping') },
                { text: 'Completed', onPress: () => setFilterStatus('completed') },
                { text: 'Cancelled', onPress: () => setFilterStatus('cancelled') },
                { text: 'Cancel', style: 'cancel' }
              ])}
            >
              <Ionicons name="funnel-outline" size={18} color="#333" />
              <Text style={styles.filterText}>
                {filterStatus === 'All' ? 'Filter' : filterStatus}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowSearchBar(true)}
            >
              <Ionicons name="search-outline" size={18} color="#333" />
              <Text style={styles.filterText}>Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
     
      {/* Search active indicator and "Reset" button */}
      {(searchQuery || filterStatus !== 'All') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            {searchQuery ? `Search: "${searchQuery}"` : ''}
            {searchQuery && filterStatus !== 'All' ? ' • ' : ''}
            {filterStatus !== 'All' ? `Status: ${filterStatus}` : ''}
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
     
      {adminOrdersLoading && !isRefreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loaderText}>Loading orders...</Text>
        </View>
      ) : adminOrdersError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load orders</Text>
          <Text style={styles.errorDetail}>{adminOrdersError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !adminOrders || filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>No orders found</Text>
          {searchQuery || filterStatus !== 'All' ? (
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetSearchText}>Clear filters and try again</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={loadOrders}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.resultCount}>{filteredOrders.length} order(s) found</Text>
          }
        />
      )}
     
      {/* Status Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <Text style={styles.modalOrderNumber}>
              {selectedOrder ? selectedOrder.orderNumber : ''}
            </Text>
           
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedStatus}
                onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Shipping" value="Shipping" />
                <Picker.Item label="Completed" value="Completed" />
                <Picker.Item label="Cancelled" value="Cancelled" />
              </Picker>
            </View>
           
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleUpdateStatus}
              >
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  filterText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandIconContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  orderDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#FF8C00',
  },
  detailsButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Loading and error styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  errorDetail: {
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  emptySubtext: {
    color: '#666',
    marginTop: 5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalOrderNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    height: 'auto',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#DDD',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#888888',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#DDD',
    borderRadius: 4,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  resetSearchText: {
    color: '#2196F3',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});


export default AdminOrders;