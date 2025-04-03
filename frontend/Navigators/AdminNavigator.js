import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import AdminHome from '../Screens/Admin/AdminHome';
import AdminOrders from '../Screens/Admin/AdminOrders';
import AdminUsers from '../Screens/Admin/AdminUsers';
import AdminRevenue from '../Screens/Admin/AdminRevenue';
import AdminProducts from '../Screens/Admin/AdminProducts';

const Stack = createStackNavigator();

function AdminNavigator() {
    return (
        <Stack.Navigator initialRouteName="AdminHome">
            <Stack.Screen
                name="AdminHome"
                component={AdminHome}
                options={{
                    title: 'Admin Dashboard',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="AdminOrders"
                component={AdminOrders}
                options={{
                    title: 'Orders Management',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="AdminUsers"
                component={AdminUsers}
                options={{
                    title: 'User Management',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="AdminRevenue"
                component={AdminRevenue}
                options={{
                    title: 'Revenue Analytics',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="AdminProducts"
                component={AdminProducts}
                options={{
                    title: 'Product Management',
                    headerShown: true,
                }}
            />
        </Stack.Navigator>
    );
}

export default AdminNavigator;