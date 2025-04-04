import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOrders } from '../../Redux/Actions/orderActions';
import { listProducts } from '../../Redux/Actions/productActions'; // Add product actions import
import { getAllUsers } from '../../Redux/Actions/Auth.actions';
import { BarChart } from '../../utils/fix-chart-kit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';
import { SCREEN_WIDTH } from '../../utils/dimensions';

const DashboardCard = ({ title, count, icon, color, onPress, isLoading }) => {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Text style={styles.cardCount}>{count}</Text>
          )}
        </View>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
};


const AdminHome = ({ navigation }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
 
  // Get order data from Redux store
  const { adminOrders = [], adminOrdersLoading } = useSelector(state => state.order || {});
 
  // Get product data from Redux store
  const { products = [], loading: productsLoading } = useSelector(state => state.productList);
 
  // Add the users state from the Redux store
  const [usersCount, setUsersCount] = useState(0);
  const { users = [] } = useSelector(state => ({
    users: state.auth?.allUsers || []
  }));

  // Add console log to track user count
  useEffect(() => {
    console.log('Total users count:', users.length);
    console.log('Users data:', users);
  }, [users]);

  // Calculate order metrics
  const orderCount = adminOrders.length;
  const totalRevenue = adminOrders.reduce((total, order) => total + (order.amount || 0), 0);
  const formattedRevenue = `₱${totalRevenue.toFixed(2)}`;
 
  // Calculate product metrics
  const productCount = products.length;
  const availableProducts = products.filter(product => product.status === 'Available').length;
 
  // Sort orders by date (newest first) and take most recent 5
  const recentOrders = [...adminOrders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);


  // Prepare chart data from orders
  useEffect(() => {
    if (adminOrders && adminOrders.length > 0) {
      generateChartData(adminOrders);
    }
  }, [adminOrders]);


  // Generate chart data from orders
  const generateChartData = (orders) => {
    // Group orders by month
    const monthlyData = {};
   
    // Process each order to generate monthly revenue data
    orders.forEach(order => {
      try {
        const orderDate = new Date(order.date);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
       
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
       
        monthlyData[monthKey] += order.amount || 0;
      } catch (error) {
        console.error('Error processing order date:', error);
      }
    });
   
    // Convert to array and sort by date
    const sortedMonths = Object.keys(monthlyData).sort();
   
    // Get the last 6 months (or less if not enough data)
    const recentMonths = sortedMonths.slice(-6);
   
    // Format labels as MMM (e.g. "Jan", "Feb")
    const labels = recentMonths.map(monthKey => {
      const [year, month] = monthKey.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
    });
   
    // Get corresponding revenue values
    const datasets = recentMonths.map(monthKey => monthlyData[monthKey]);
   
    setChartData({
      labels,
      datasets: [{ data: datasets }]
    });
  };


  // Fetch orders and products when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchUsers(),
          dispatch(getAllOrders()),
          dispatch(listProducts())
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
   
    loadData();
  }, [dispatch]);

  // Add function to get token
  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("jwt");
      if (!token) {
        console.error('No token found in SecureStore');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // Add function to fetch users
  const fetchUsers = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.error('Authentication token not found');
        return;
      }
     
      const response = await axios.get(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
     
      if (response.data && response.data.users) {
        setUsersCount(response.data.users.length);
        console.log('Total users:', response.data.users.length);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const navigateToOrders = () => {
    console.log('Navigating to AdminOrders screen');
    navigation.navigate('AdminOrders');
  };


  const navigateToUsers = () => {
    console.log('Navigating to AdminUsers screen');
    navigation.navigate('AdminUsers');
  };


  const navigateToRevenue = () => {
    console.log('Navigating to AdminRevenue screen');
    navigation.navigate('AdminRevenue');
  };
 
  const navigateToProducts = () => {
    console.log('Navigating to AdminProducts screen');
    navigation.navigate('AdminProducts');
  };


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, Admin!</Text>
      </View>
     
      <View style={styles.cardsContainer}>
        <DashboardCard
          title="Products"
          count={productCount.toString()}
          icon="fast-food-outline"
          color="#FF8C00"
          onPress={navigateToProducts}
          isLoading={productsLoading || isLoading}
        />
        <DashboardCard
          title="Users"
          count={usersCount.toString()}
          icon="people-outline"
          color="#4CAF50"
          onPress={navigateToUsers}
          isLoading={isLoading}
        />
        <DashboardCard
          title="Orders"
          count={orderCount.toString()}
          icon="cart-outline"
          color="#2196F3"
          isLoading={adminOrdersLoading || isLoading}
          onPress={navigateToOrders}
        />
        <DashboardCard
          title="Revenue"
          count={formattedRevenue}
          icon="bar-chart-outline"
          color="#9C27B0"
          isLoading={adminOrdersLoading || isLoading}
          onPress={navigateToRevenue}
        />
      </View>
     
      {/* Quick Actions Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToProducts}
          >
            <View style={[styles.actionIcon, {backgroundColor: '#FFE0B2'}]}>
              <Ionicons name="add-circle-outline" size={24} color="#FF8C00" />
            </View>
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
         
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToProducts}
          >
            <View style={[styles.actionIcon, {backgroundColor: '#E3F2FD'}]}>
              <Ionicons name="create-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Manage Products</Text>
          </TouchableOpacity>
         
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToOrders}
          >
            <View style={[styles.actionIcon, {backgroundColor: '#E8F5E9'}]}>
              <Ionicons name="list-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
     
      {/* Revenue Chart Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Monthly Revenue</Text>
        {(adminOrdersLoading || isLoading || !chartData) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.loadingText}>Loading chart data...</Text>
          </View>
        ) : chartData.labels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No chart data available</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={SCREEN_WIDTH - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                barPercentage: 0.6,
              }}
              style={styles.chart}
              fromZero
              yAxisSuffix="₱"
              showValuesOnTopOfBars={true}
            />
          </View>
        )}
      </View>


      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {(adminOrdersLoading || isLoading) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent orders found</Text>
          </View>
        ) : (
          <View style={styles.recentOrdersContainer}>
            {recentOrders.map((order, index) => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderItem,
                  index === recentOrders.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => navigateToOrders()}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderCustomer}>{order.customer}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={styles.orderAmount}>₱{order.amount.toFixed(2)}</Text>
                  <View style={[
                    styles.statusBadge,
                    order.status === 'Shipping' && styles.pendingBadge,
                    order.status === 'Cancelled' && styles.cancelledBadge
                  ]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>


      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Product Status</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{productCount}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{availableProducts}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{productCount - availableProducts}</Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  // ...existing code...
 
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
 
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  cardsContainer: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cardCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  recentOrdersContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  orderInfo: {},
  orderNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  orderCustomer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: '#FFC107',
  },
  cancelledBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  popularItemsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSold: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});


export default AdminHome;