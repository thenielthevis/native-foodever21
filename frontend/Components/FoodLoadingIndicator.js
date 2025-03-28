import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const FoodLoadingIndicator = ({ text, size = "medium" }) => {
  // Create animated values for rotation
  const forkRotation = useRef(new Animated.Value(0)).current;
  const spoonRotation = useRef(new Animated.Value(0)).current;
  
  // Set dimensions based on size prop
  const getIconSize = () => {
    switch(size) {
      case "small": return 24;
      case "large": return 42;
      default: return 32; // medium
    }
  };
  
  const getContainerSize = () => {
    switch(size) {
      case "small": return { width: 90, height: 45 };
      case "large": return { width: 160, height: 90 };
      default: return { width: 120, height: 70 }; // medium
    }
  };
  
  const getContainerPadding = () => {
    switch(size) {
      case "small": return 12;
      case "large": return 24;
      default: return 18; // medium
    }
  };
  
  const getUtensilSpacing = () => {
    switch(size) {
      case "small": return 2;
      case "large": return 8;
      default: return 5; // medium
    }
  };
  
  useEffect(() => {
    // Create smoother animations with spring physics for more natural movement
    const createSpringAnimation = (value, toValue) => {
      return Animated.spring(value, {
        toValue,
        friction: 7,        // Lower = more oscillation
        tension: 40,        // Higher = faster spring
        useNativeDriver: true
      });
    };
    
    // Fork animation sequence
    const animateFork = Animated.loop(
      Animated.sequence([
        createSpringAnimation(forkRotation, 1),
        Animated.delay(100),  // Slight pause at the "crossed" position
        createSpringAnimation(forkRotation, 0),
        Animated.delay(400),  // Longer pause at resting position
      ])
    );
    
    // Spoon animation sequence with slight offset for better effect
    const animateSpoon = Animated.loop(
      Animated.sequence([
        Animated.delay(150),  // Offset from fork for alternating movement
        createSpringAnimation(spoonRotation, 1),
        Animated.delay(100),  // Slight pause at the "crossed" position
        createSpringAnimation(spoonRotation, 0),
        Animated.delay(250),  // Pause at resting position
      ])
    );
    
    // Start animations
    animateFork.start();
    animateSpoon.start();
    
    // Clean up animations on component unmount
    return () => {
      animateFork.stop();
      animateSpoon.stop();
    };
  }, []);
  
  // Interpolate rotation values with smoother ranges
  const forkInterpolation = forkRotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['20deg', '35deg', '45deg']  // More interpolation points for smoother motion
  });
  
  const spoonInterpolation = spoonRotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-20deg', '-35deg', '-45deg']  // More interpolation points for smoother motion
  });

  const getTextSize = () => {
    switch(size) {
      case "small": return 14;
      case "large": return 18;
      default: return 16; // medium
    }
  };

  return (
    <View style={[
      styles.loadingContainer, 
      { padding: getContainerPadding() }
    ]}>
      <View style={[styles.foodLoadingIconContainer, getContainerSize()]}>
        {/* Animated Fork */}
        <Animated.View 
          style={[
            styles.utensil,
            { 
              transform: [{ rotate: forkInterpolation }],
              left: `${50 - getUtensilSpacing()}%`
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="silverware-fork" 
            size={getIconSize()} 
            color="#FF8C00" 
          />
        </Animated.View>
        
        {/* Animated Spoon */}
        <Animated.View 
          style={[
            styles.utensil,
            { 
              transform: [{ rotate: spoonInterpolation }],
              right: `${50 - getUtensilSpacing()}%`
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="silverware-spoon" 
            size={getIconSize()} 
            color="#FF8C00" 
          />
        </Animated.View>
      </View>
      
      <Text style={[
        styles.loadingText, 
        { fontSize: getTextSize() }
      ]}>
        {text || "Loading..."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  foodLoadingIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  utensil: {
    position: 'absolute',
  },
  loadingText: {
    color: '#272838',
    fontWeight: '500',
  }
});

export default FoodLoadingIndicator;