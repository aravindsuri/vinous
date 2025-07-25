// Test.tsx
import React from 'react';
import { View, Text } from 'react-native';
import MapView from 'react-native-maps';

export default function Test() {
  return (
    <View style={{ flex: 1 }}>
      <MapView 
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 41.8719,
          longitude: 12.5674,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      />
    </View>
  );
}