import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const StartupScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Main' as never);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D1B69" />
      <LinearGradient
        colors={['#2D1B69', '#8B5CF6']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.appName}>Vinous</Text>
          
          {/* Grapes decoration */}
          <View style={styles.grapesContainer}>
            <Text style={styles.grapes}></Text>
            <Text style={styles.grapes}></Text>
            <Text style={styles.grapes}></Text>
          </View>
          
          <Text style={styles.tagline}>Discover Wine Through AI</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  grapesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  grapes: {
    fontSize: 36,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

export default StartupScreen;
