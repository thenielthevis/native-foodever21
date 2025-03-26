import React from 'react'
import { createStackNavigator } from "@react-navigation/stack"

import Home from "../Screens/Home/Home";

const Stack = createStackNavigator()
function MyStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name='Main'
                component={Home}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name='Products'
                component={ProductContainer}
                options={{
                    headerShown: true,
                }}
            />
        </Stack.Navigator>
    )
}

export default function HomeNavigator() {
    return <MyStack />;
}
