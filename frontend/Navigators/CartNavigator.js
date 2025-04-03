import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import CartScreen from '../Screens/Cart/CartScreen';
import Checkout from '../Screens/Cart/Checkout/Checkout';
import Payment from '../Screens/Cart/Checkout/Payment';
import Confirm from '../Screens/Cart/Checkout/Confirm';


const Stack = createStackNavigator();


function CartNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Cart"
                component={CartScreen}
                options={{
                    headerShown: true,
                    title: "My Cart"
                }}
            />
            <Stack.Screen
                name="Checkout"
                component={Checkout}
                options={{
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="Payment"
                component={Payment}
                options={{
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="Confirm"
                component={Confirm}
                options={{
                    headerShown: true,
                }}
            />
        </Stack.Navigator>
    );
}


export default CartNavigator;