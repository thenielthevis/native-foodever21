import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOrders } from '../../Redux/Actions/orderActions';
import { listProducts } from '../../Redux/Actions/productActions'; // Add product actions import
import { getAllUsers } from '../../Redux/Actions/Auth.actions';
// import { BarChart } from 'react-native-gifted-charts'; // Replace chart import
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';
import { SCREEN_WIDTH } from '../../utils/dimensions';
import { createSelector } from 'reselect';
import TokenExpired from '../Modals/TokenExpired';

const DashboardCard = React.memo(({ title, count, icon, color, onPress, isLoading, index }) => {
  return (
    <TouchableOpacity 
      key={`dashboard-card-${title}-${index}`}
      style={[styles.card, { borderLeftColor: color }]} 
      onPress={onPress}
    >
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
});

// Update selectors to include transformations
const selectAdminOrders = createSelector(
  state => state.order?.adminOrders,
  adminOrders => (adminOrders || []).map(order => ({
    ...order,
    date: new Date(order.date),
  }))
);

const selectProducts = createSelector(
  state => state.productList?.products,
  products => (products || []).map(product => ({
    ...product,
    isAvailable: product.status === 'Available'
  }))
);

const selectUsers = createSelector(
  state => state.auth?.allUsers,
  users => (users || []).map(user => ({
    ...user,
    fullName: user.username || 'Anonymous'
  }))
);

const selectLoadingStates = createSelector(
  state => state.order?.adminOrdersLoading,
  state => state.productList?.loading,
  (adminOrdersLoading, productsLoading) => ({
    adminOrdersLoading: adminOrdersLoading || false,
    productsLoading: productsLoading || false
  })
);

const AdminHome = ({ navigation }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [usersCount, setUsersCount] = useState(0); // Add this state variable
  const [chartType, setChartType] = useState('bar');
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);

  // Use memoized selectors
  const adminOrders = useSelector(selectAdminOrders);
  const products = useSelector(selectProducts);
  const users = useSelector(selectUsers);
  const { adminOrdersLoading, productsLoading } = useSelector(selectLoadingStates);

  // Add users count effect
  useEffect(() => {
    if (users) {
      setUsersCount(users.length);
    }
  }, [users]);

  // Memoize derived values
  const orderCount = useMemo(() => adminOrders.length, [adminOrders]);
  const totalRevenue = useMemo(() => 
    adminOrders.reduce((total, order) => total + (order.amount || 0), 0),
    [adminOrders]
  );
  const productCount = useMemo(() => products.length, [products]);
  const availableProducts = useMemo(() => 
    products.filter(product => product.status === 'Available').length,
    [products]
  );

  // Format revenue for display
  const formattedRevenue = useMemo(() => 
    `₱${totalRevenue.toFixed(2)}`,
    [totalRevenue]
  );

  // Replace the existing generateChartData useMemo with a regular function
  const generateChartData = (orders) => {
    if (!orders || orders.length === 0) return [];

    const monthlyRevenue = {};
   
    orders.forEach(order => {
      try {
        const orderDate = new Date(order.date);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
       
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
       
        monthlyRevenue[monthKey] += order.amount || 0;
      } catch (error) {
        console.error('Error processing order date:', error);
      }
    });
   
    const sortedMonths = Object.keys(monthlyRevenue).sort();
    const recentMonths = sortedMonths.slice(-6);
   
    return recentMonths.map(monthKey => {
      const [year, month] = monthKey.split('-');
      const value = monthlyRevenue[monthKey];
      return {
        value,
        label: new Date(parseInt(year), parseInt(month) - 1)
          .toLocaleString('default', { month: 'short' }),
        frontColor: '#9C27B0',
        topLabelComponent: () => (
          <Text style={styles.barLabel}>₱{value.toFixed(0)}</Text>
        )
      };
    });
  };

  // Add useEffect to update chart data when orders change
  useEffect(() => {
    if (adminOrders && adminOrders.length > 0) {
      const data = generateChartData(adminOrders);
      setChartData(data);
    }
  }, [adminOrders]);

  // Fetch orders and products when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const isTokenValid = await checkToken();
      
        if (!isTokenValid) {
          return;
        }

        await Promise.all([
          fetchUsers(),
          dispatch(getAllOrders()),
          dispatch(listProducts())
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (error?.response?.status === 401) {
          setShowTokenExpiredModal(true);
        }
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
        dispatch({ type: 'SET_ALL_USERS', payload: response.data.users }); // Update Redux store
        setUsersCount(response.data.users.length);
        console.log('Total users:', response.data.users.length);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Add this function to check token
  const checkToken = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setShowTokenExpiredModal(true);
        return false;
      }
      
      // Verify token with a backend call
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return true;
    } catch (error) {
      if (error?.response?.status === 401) {
        setShowTokenExpiredModal(true);
        return false;
      }
      console.error('Error checking token:', error);
      return false;
    }
  };

  // Add handler functions for the TokenExpired modal
  const handleTokenExpiredClose = () => {
    setShowTokenExpiredModal(false);
  };

  const handleTokenExpiredLogin = () => {
    setShowTokenExpiredModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Signin' }],
    });
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

  // Update the recentOrders calculation with proper null checks
  const recentOrders = useMemo(() => {
    if (!adminOrders || !Array.isArray(adminOrders)) return [];
    
    return [...adminOrders]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 3) // Show only top 3
      .map(order => ({
        id: order._id || order.id || Math.random().toString(),
        orderNumber: `ORDER-${(order._id || order.id).toString().slice(-4)}`,
        customer: order.user?.name || order.customer || 'Anonymous',
        amount: order.amount || 0
      }));
  }, [adminOrders]);

  const dashboardCards = useMemo(() => [
    {
      id: 'products',
      title: "Products",
      count: productCount.toString(),
      icon: "fast-food-outline",
      color: "#FF8C00",
      onPress: navigateToProducts,
      isLoading: productsLoading || isLoading
    },
    {
      id: 'users',
      title: "Users",
      count: usersCount.toString(),
      icon: "people-outline",
      color: "#4CAF50",
      onPress: navigateToUsers,
      isLoading: isLoading
    },
    {
      id: 'orders',
      title: "Orders",
      count: orderCount.toString(),
      icon: "cart-outline",
      color: "#2196F3",
      isLoading: adminOrdersLoading || isLoading,
      onPress: navigateToOrders
    },
    {
      id: 'revenue',
      title: "Revenue",
      count: formattedRevenue,
      icon: "bar-chart-outline",
      color: "#9C27B0",
      isLoading: adminOrdersLoading || isLoading,
      onPress: navigateToRevenue
    }
  ], [productCount, usersCount, orderCount, formattedRevenue, isLoading, productsLoading, adminOrdersLoading]);

  const quickActions = useMemo(() => [
    {
      id: 'add-product',
      icon: "add-circle-outline",
      color: "#FF8C00",
      bgColor: '#FFE0B2',
      text: "Add Product",
      onPress: navigateToProducts
    },
    {
      id: 'manage-products',
      icon: "create-outline",
      color: "#2196F3",
      bgColor: '#E3F2FD',
      text: "Manage Products",
      onPress: navigateToProducts
    },
    {
      id: 'view-orders',
      icon: "list-outline",
      color: "#4CAF50",
      bgColor: '#E8F5E9',
      text: "View Orders",
      onPress: navigateToOrders
    }
  ], []);

  const productStats = useMemo(() => [
    {
      id: 'total',
      number: productCount,
      label: 'Products'
    },
    {
      id: 'available',
      number: availableProducts,
      label: 'Available'
    },
    {
      id: 'unavailable',
      number: productCount - availableProducts,
      label: 'Unavailable'
    }
  ], [productCount, availableProducts]);

  // Update chart configuration
  const chartConfig = {
    barWidth: 30,
    spacing: 20,
    initialSpacing: 10,
    data: chartData,
    width: SCREEN_WIDTH - 70,
    height: 220,
    frontColor: '#9C27B0',
    gradientColor: '#E1BEE7',
    yAxisColor: "lightgray",
    xAxisColor: "lightgray",
    yAxisTextStyle: { color: '#666' },
    xAxisLabelTextStyle: { color: '#666' },
    rulesType: 'solid',
    rulesColor: '#E5E5E5',
    showFractionalValues: true,
  };

  return (
    <>
      <TokenExpired
        visible={showTokenExpiredModal}
        onClose={handleTokenExpiredClose}
        onLogin={handleTokenExpiredLogin}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, Admin!</Text>
        </View>
       
        <View style={styles.cardsContainer}>
          {dashboardCards.map((card, index) => (
            <DashboardCard 
              {...card} 
              key={`card-${card.id}-${index}`}
              index={index}
            />
          ))}
        </View>
       
        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={`action-${action.id}-${index}`}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, {backgroundColor: action.bgColor}]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
       
        {/* Comment out the Revenue Chart Section temporarily */}
        {/*
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Monthly Revenue</Text>
          {(adminOrdersLoading || isLoading || !chartData) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9C27B0" />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          ) : chartData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chart data available</Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <BarChart {...chartConfig} />
            </View>
          )}
        </View>
        */}

        {/* Rest of the components (Recent Orders, Product Status) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>3 Most Recent Orders</Text>
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
                  key={`home-recent-${order.id}-${index}-${Date.now()}`}
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
                  <Text style={styles.orderAmount}>₱{order.amount.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Product Status</Text>
          <View style={styles.statsContainer}>
            {productStats.map((stat, index) => (
              <View 
                key={`stat-${stat.id}-${index}`}
                style={styles.statBox}
              >
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
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
  tooltip: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  barLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
  },
});

export default AdminHome;