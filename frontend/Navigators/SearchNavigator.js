import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Search from '../Screens/Search/Search';

const Stack = createStackNavigator();

const SearchNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="Search" component={Search} />
    </Stack.Navigator>
  );
};

export default SearchNavigator;
