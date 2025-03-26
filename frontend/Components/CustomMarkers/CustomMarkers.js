import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CustomMarkerLeft = ({ currentValue }) => {
  return (
    <View style={styles.markerContainer}>
      <View style={styles.marker} />
      <Text style={styles.markerText}>₱{currentValue}</Text>
    </View>
  );
};

export const CustomMarkerRight = ({ currentValue }) => {
  return (
    <View style={styles.markerContainer}>
      <View style={styles.marker} />
      <Text style={styles.markerText}>₱{currentValue}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: '#ff9900',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  markerText: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
});
