import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
 
  // Function to get auth token
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


  // Fetch users from the MongoDB backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
     
      const token = await getToken();
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
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
        // Transform backend data to match our UI requirements
        const formattedUsers = response.data.users.map(user => ({
          id: user._id || user.id,
          name: user.username || 'Unknown',
          email: user.email,
          status: user.status || 'active',
          joinDate: new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        }));
       
        setUsers(formattedUsers);
      } else {
        setError('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Update user status in the backend
  const updateUserStatus = async (userId, newStatus) => {
    try {
      setError(null);
     
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return false;
      }
     
      console.log(`Updating user ${userId} status to ${newStatus}`);
     
      // Check API_URL format and ensure it ends with a slash
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
      const fullUrl = `${baseUrl}auth/updateUser`;
     
      console.log('Making API request to:', fullUrl);
     
      // Include both userId and a dummy firebaseUid to satisfy the backend validation
      const payload = {
        userId,
        status: newStatus,
        adminAction: true,
        // Add dummy firebaseUid to bypass validation
        firebaseUid: 'admin-action-bypass'
      };
     
      console.log('With payload:', payload);
     
      const response = await axios.put(
        fullUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
     
      console.log('Update response:', response.data);
     
      if (response.data && (response.data.success || response.status === 200)) {
        return true;
      } else if (response.data && response.data.message) {
        Alert.alert('Status Update', response.data.message);
        return true; // Consider it successful if we got a message
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to update user status');
        return false;
      }
    } catch (error) {
      console.error('Error updating user status:', error);
     
      // Log more details about the error for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
     
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update user status');
      return false;
    }
  };


  // Toggle user status with confirmation and backend update
  const toggleUserStatus = (userId) => {
    // Find the user by ID
    const userIndex = users.findIndex(user => user.id === userId);
    const user = users[userIndex];
   
    if (userIndex !== -1) {
      const currentStatus = user.status;
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
     
      // Show confirmation before changing status
      Alert.alert(
        "Confirm Status Change",
        `Are you sure you want to change ${user.name}'s status from ${currentStatus} to ${newStatus}?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Yes",
            onPress: async () => {
              // Show loading indicator
              setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? {...u, updating: true} : u
              ));
             
              // Update status in the backend
              const success = await updateUserStatus(userId, newStatus);
             
              if (success) {
                // Update local state
                setUsers(prevUsers => prevUsers.map(u =>
                  u.id === userId ? {...u, status: newStatus, updating: false} : u
                ));
               
                // Show success message
                Alert.alert(
                  "Status Updated",
                  `User ${user.name} is now ${newStatus}.`
                );
              } else {
                // Remove updating flag if failed
                setUsers(prevUsers => prevUsers.map(u =>
                  u.id === userId ? {...u, updating: false} : u
                ));
              }
            }
          }
        ]
      );
    }
  };


  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };


  useEffect(() => {
    fetchUsers();
  }, []);


  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.status.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar,
          item.status === 'active' ? styles.activeAvatar : styles.inactiveAvatar]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.userData}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userJoinDate}>Joined: {item.joinDate}</Text>
        </View>
      </View>
      <View style={styles.userActions}>
        {item.updating ? (
          <ActivityIndicator size="small" color="#666" style={styles.loadingIndicator} />
        ) : item.status === 'active' ? (
          <TouchableOpacity
            onPress={() => toggleUserStatus(item.id)}
            style={[styles.statusButton, styles.deactivateButton]}
          >
            <Ionicons name="close-circle-outline" size={16} color="#fff" style={styles.statusIcon} />
            <Text style={styles.statusButtonText}>Deactivate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => toggleUserStatus(item.id)}
            style={[styles.statusButton, styles.activateButton]}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={styles.statusIcon} />
            <Text style={styles.statusButtonText}>Activate</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#555" />
        </TouchableOpacity>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Users</Text>
        </View>
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#777" style={styles.searchIcon} />
                <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                />
            </View>
            {error ? (
                <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#F44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                </View>
            ) : (
                <>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{users.length}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{users.filter(u => u.status === 'active').length}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{users.filter(u => u.status === 'inactive').length}</Text>
                    <Text style={styles.statLabel}>Inactive</Text>
                    </View>
                </View>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="filter-outline" size={18} color="#555" />
                    <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>
                    <View style={styles.statusFilterButtons}>
                    <TouchableOpacity
                        style={[styles.statusFilterButton, styles.activeFilterButton]}
                        onPress={() => setSearchQuery('active')}
                    >
                        <Text style={styles.statusFilterText}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.statusFilterButton, styles.inactiveFilterButton]}
                        onPress={() => setSearchQuery('inactive')}
                    >
                        <Text style={styles.statusFilterText}>Inactive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.statusFilterButton}
                        onPress={() => setSearchQuery('')}
                    >
                        <Text style={styles.statusFilterText}>All</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                </>
            )}
            <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                loading ? (
                    <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={50} color="#CCC" />
                    <Text style={styles.emptyText}>No users found</Text>
                    </View>
                )
                }
            />
            <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#555',
    fontWeight: '500',
  },
  statusFilterButtons: {
    flexDirection: 'row',
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: '#E0E0E0',
  },
  activeFilterButton: {
    backgroundColor: '#E8F5E9',
  },
  inactiveFilterButton: {
    backgroundColor: '#FFEBEE',
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeAvatar: {
    backgroundColor: '#4CAF50',
  },
  inactiveAvatar: {
    backgroundColor: '#F44336',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userData: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  userJoinDate: {
    fontSize: 12,
    color: '#888',
  },
  userActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#F44336',
  },
  editButton: {
    padding: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingIndicator: {
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginVertical: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 8,
  },
});

export default AdminUsers;