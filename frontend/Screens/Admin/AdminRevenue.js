import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Dimensions, TouchableOpacity, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOrders } from '../../Redux/Actions/orderActions';
import { BarChart, LineChart } from '../../utils/fix-chart-kit';


const AdminRevenue = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [timeFrame, setTimeFrame] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
 
  // Get order data from Redux store
  const { adminOrders = [], adminOrdersLoading } = useSelector(state => state.order);
 
  // Fetch orders when component mounts
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);
        await dispatch(getAllOrders());
      } catch (error) {
        console.error('Error loading order data:', error);
      } finally {
        setIsLoading(false);
      }
    };
   
    loadOrderData();
  }, [dispatch]);
 
  // Prepare chart data from orders when orders change
  useEffect(() => {
    if (adminOrders && adminOrders.length > 0) {
      generateChartData(adminOrders);
    }
  }, [adminOrders]);
 
  // Generate chart data for different time frames
  const generateChartData = (orders) => {
    // Monthly Revenue Data
    const monthlyRevenue = {};
    // Weekly Revenue Data
    const weeklyRevenue = {};
    // Yearly Revenue Data
    const yearlyRevenue = {};
    // Daily Revenue Data (for current month)
    const dailyRevenue = {};
   
    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
   
    // Process each order
    orders.forEach(order => {
      try {
        const orderDate = new Date(order.date);
        const orderYear = orderDate.getFullYear();
        const orderMonth = orderDate.getMonth();
        const orderDay = orderDate.getDate();
       
        // Calculate week number (simplified)
        const weekNumber = Math.ceil(orderDay / 7);
        const weekKey = `${orderYear}-${orderMonth + 1}-W${weekNumber}`;
       
        // Monthly data (format: "YYYY-MM")
        const monthKey = `${orderYear}-${orderMonth + 1}`;
       
        // Yearly data (format: "YYYY")
        const yearKey = `${orderYear}`;
       
        // Daily data (format: "DD") - only for current month & year
        if (orderYear === currentYear && orderMonth === currentMonth) {
          const dayKey = `${orderDay}`;
         
          if (!dailyRevenue[dayKey]) {
            dailyRevenue[dayKey] = 0;
          }
          dailyRevenue[dayKey] += order.amount || 0;
        }
       
        // Update monthly data
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += order.amount || 0;
       
        // Update weekly data
        if (!weeklyRevenue[weekKey]) {
          weeklyRevenue[weekKey] = 0;
        }
        weeklyRevenue[weekKey] += order.amount || 0;
       
        // Update yearly data
        if (!yearlyRevenue[yearKey]) {
          yearlyRevenue[yearKey] = 0;
        }
        yearlyRevenue[yearKey] += order.amount || 0;
       
      } catch (error) {
        console.error('Error processing order for chart data:', error);
      }
    });
   
    // Format monthly data
    const sortedMonths = Object.keys(monthlyRevenue).sort();
    const recentMonths = sortedMonths.slice(-6); // Last 6 months
   
    setMonthlyData({
      labels: recentMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
      }),
      datasets: [{ data: recentMonths.map(monthKey => monthlyRevenue[monthKey]) }]
    });
   
    // Format weekly data (last 6 weeks)
    const sortedWeeks = Object.keys(weeklyRevenue).sort();
    const recentWeeks = sortedWeeks.slice(-6);
   
    setWeeklyData({
      labels: recentWeeks.map(weekKey => {
        const weekParts = weekKey.split('-W');
        return `W${weekParts[1]}`;
      }),
      datasets: [{ data: recentWeeks.map(weekKey => weeklyRevenue[weekKey]) }]
    });
   
    // Format yearly data
    const sortedYears = Object.keys(yearlyRevenue).sort();
   
    setYearlyData({
      labels: sortedYears,
      datasets: [{ data: sortedYears.map(yearKey => yearlyRevenue[yearKey]) }]
    });
   
    // Format daily data (for current month)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayLabels = [];
    const dayData = [];
   
    for (let i = 1; i <= daysInMonth; i++) {
      const dayKey = `${i}`;
      dayLabels.push(i.toString());
      dayData.push(dailyRevenue[dayKey] || 0);
    }
   
    setDailyData({
      labels: dayLabels.filter((_, i) => i % 5 === 0 || i === dayLabels.length - 1), // Show every 5th day
      datasets: [{ data: dayData }]
    });
  };
 
  // Get active chart data based on selected time frame
  const getActiveChartData = () => {
    switch (timeFrame) {
      case 'daily':
        return dailyData;
      case 'weekly':
        return weeklyData;
      case 'yearly':
        return yearlyData;
      case 'monthly':
      default:
        return monthlyData;
    }
  };
 
  // Get title based on selected time frame
  const getChartTitle = () => {
    switch (timeFrame) {
      case 'daily':
        return 'Daily Revenue (Current Month)';
      case 'weekly':
        return 'Weekly Revenue (Last 6 Weeks)';
      case 'yearly':
        return 'Yearly Revenue';
      case 'monthly':
      default:
        return 'Monthly Revenue (Last 6 Months)';
    }
  };
 
  // Calculate summary metrics
  const calculateSummaryMetrics = () => {
    if (!adminOrders || adminOrders.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0
      };
    }
   
    const totalRevenue = adminOrders.reduce((total, order) => total + (order.amount || 0), 0);
    const averageRevenue = totalRevenue / adminOrders.length;
   
    // For highest and lowest, we need to calculate based on the time frame
    let highest = 0;
    let lowest = Infinity;
   
    const chartData = getActiveChartData();
    if (chartData && chartData.datasets && chartData.datasets[0]) {
      const values = chartData.datasets[0].data;
      highest = Math.max(...values.filter(v => v > 0)); // Filter out zeros
      // Find lowest non-zero value
      const nonZeroValues = values.filter(v => v > 0);
      lowest = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    }
   
    return {
      total: totalRevenue,
      average: averageRevenue,
      highest,
      lowest: lowest === Infinity ? 0 : lowest
    };
  };
 
  const metrics = calculateSummaryMetrics();
  const activeChartData = getActiveChartData();
 
  // Render the chart based on type
  const renderChart = () => {
    if (!activeChartData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No chart data available</Text>
        </View>
      );
    }
   
    const chartProps = {
      data: activeChartData,
      width: Dimensions.get('window').width - 40,
      height: 220,
      chartConfig: {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: { borderRadius: 16 },
        barPercentage: 0.6,
      },
      style: styles.chart,
      fromZero: true,
      yAxisSuffix: "₱"
    };
   
    return (
      <View style={styles.chartContainer}>
        {chartType === 'bar' ? (
          <BarChart {...chartProps} showValuesOnTopOfBars={true} />
        ) : (
          <LineChart {...chartProps} bezier />
        )}
      </View>
    );
  };
 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Revenue Analytics</Text>
          <Text style={styles.subtitle}>Overview of your business performance</Text>
        </View>
       
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₱{metrics.total.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₱{metrics.average.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Avg. Order Value</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₱{metrics.highest.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Highest</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₱{metrics.lowest.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Lowest</Text>
          </View>
        </View>
       
        {/* Chart Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.chartTypeButtons}>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'bar' && styles.activeButton]}
              onPress={() => setChartType('bar')}
            >
              <Ionicons name="bar-chart-outline" size={20} color={chartType === 'bar' ? '#9C27B0' : '#777'} />
              <Text style={[styles.buttonText, chartType === 'bar' && styles.activeButtonText]}>Bar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'line' && styles.activeButton]}
              onPress={() => setChartType('line')}
            >
              <Ionicons name="trending-up-outline" size={20} color={chartType === 'line' ? '#9C27B0' : '#777'} />
              <Text style={[styles.buttonText, chartType === 'line' && styles.activeButtonText]}>Line</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeFrameButtons}>
            <TouchableOpacity
              style={[styles.timeFrameButton, timeFrame === 'daily' && styles.activeTimeFrame]}
              onPress={() => setTimeFrame('daily')}
            >
              <Text style={[styles.timeFrameText, timeFrame === 'daily' && styles.activeTimeFrameText]}>Day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeFrameButton, timeFrame === 'weekly' && styles.activeTimeFrame]}
              onPress={() => setTimeFrame('weekly')}
            >
              <Text style={[styles.timeFrameText, timeFrame === 'weekly' && styles.activeTimeFrameText]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeFrameButton, timeFrame === 'monthly' && styles.activeTimeFrame]}
              onPress={() => setTimeFrame('monthly')}
            >
              <Text style={[styles.timeFrameText, timeFrame === 'monthly' && styles.activeTimeFrameText]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeFrameButton, timeFrame === 'yearly' && styles.activeTimeFrame]}
              onPress={() => setTimeFrame('yearly')}
            >
              <Text style={[styles.timeFrameText, timeFrame === 'yearly' && styles.activeTimeFrameText]}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>
       
        {/* Revenue Chart Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{getChartTitle()}</Text>
          {(adminOrdersLoading || isLoading || !activeChartData) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9C27B0" />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          ) : renderChart()}
        </View>
       
        {/* Revenue Breakdown Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Food Items:</Text>
              <Text style={styles.breakdownValue}>₱{(metrics.total * 0.75).toFixed(2)} (75%)</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Beverages:</Text>
              <Text style={styles.breakdownValue}>₱{(metrics.total * 0.15).toFixed(2)} (15%)</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Desserts:</Text>
              <Text style={styles.breakdownValue}>₱{(metrics.total * 0.1).toFixed(2)} (10%)</Text>
            </View>
            <View style={[styles.breakdownItem, styles.totalItem]}>
              <Text style={styles.totalLabel}>Total Revenue:</Text>
              <Text style={styles.totalValue}>₱{metrics.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
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
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  controlsContainer: {
    padding: 15,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  chartTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#F0F0F0',
  },
  activeButton: {
    backgroundColor: '#F3E5F5',
  },
  buttonText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#777',
  },
  activeButtonText: {
    color: '#9C27B0',
    fontWeight: '500',
  },
  timeFrameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    padding: 3,
    marginTop: 10,
  },
  timeFrameButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderRadius: 22,
    flex: 1,
    alignItems: 'center',
  },
  activeTimeFrame: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeFrameText: {
    fontSize: 14,
    color: '#666',
  },
  activeTimeFrameText: {
    color: '#9C27B0',
    fontWeight: '500',
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
  breakdownCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  breakdownLabel: {
    fontSize: 15,
    color: '#555',
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  totalItem: {
    borderBottomWidth: 0,
    paddingTop: 15,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
  }
});


export default AdminRevenue;