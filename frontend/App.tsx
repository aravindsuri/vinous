import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import StartupScreen from './src/screens/startup/StartupScreen';
import MainScreen from './src/screens/main/MainScreen';
import CameraScreen from './src/screens/camera/CameraScreen';
import WineDetailScreen from './src/screens/wine-detail/WineDetailScreen';
import { RootStackParamList } from './src/types';
 

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#2D1B69" />
      <Stack.Navigator 
        initialRouteName="Startup"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Startup" component={StartupScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} /><Stack.Screen name="WineDetail" component={WineDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
