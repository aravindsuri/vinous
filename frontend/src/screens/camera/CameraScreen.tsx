import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { vinousAPI } from '../../services/api';

const { width, height } = Dimensions.get('window');

const CameraScreen: React.FC = () => {
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanningActive, setScanningActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [detectedText, setDetectedText] = useState<string>('');
  const [showModeSelection, setShowModeSelection] = useState(false);

  // Reset scanning when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setScanningActive(true);
      setDetectedText('');
      setShowModeSelection(false);
      return () => {
        setScanningActive(false);
        setShowModeSelection(false);
      };
    }, [])
  );

  // Continuous scanning function
  const scanFrame = async () => {
    if (!cameraRef.current || !scanningActive || isScanning || showModeSelection) return;

    const now = Date.now();
    // Limit scanning to every 3 seconds to prevent excessive processing
    if (now - lastScanTime < 3000) return;

    try {
      setIsScanning(true);
      setLastScanTime(now);

      // Capture a frame from the camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      // Resize image for faster processing
      const resizedPhoto = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Process the image using your existing API
      await processImageWithAPI(resizedPhoto.uri);

    } catch (error) {
      console.log('Scanning error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Process image using your existing vinous API
  const processImageWithAPI = async (imageUri: string) => {
    try {
      console.log('Processing image with vinous API:', imageUri);
      
      // Use your existing API call
      const result = await vinousAPI.scanWineLabel(imageUri);
      console.log('API Scan result:', result);
      
      if (result.success && result.data) {
        setDetectedText(result.data.name || 'Wine detected');
        showWineInfo(result.data);
      } else {
        Alert.alert('No Wine Detected', result.message || 'Could not identify wine from this image');
      }

    } catch (error: unknown) {
      console.log('API processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNABORTED') {
        Alert.alert('Timeout Error', 'The scan is taking too long. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Network Error')) {
        Alert.alert('Network Error', 'Cannot reach the server. Make sure your backend is running and try again.');
      } else {
        Alert.alert('Processing Error', 'Failed to process image: ' + errorMessage);
      }
    } finally {
      setIsScanning(false);
      // Resume scanning after a delay if not in manual mode
      setTimeout(() => {
        if (!showModeSelection) {
          setScanningActive(true);
        }
      }, 2000);
    }
  };

  // Show detected wine information
  const showWineInfo = (wineData: any) => {
    Alert.alert(
      'Wine Detected!',
      `Found: ${wineData.name}\nWinery: ${wineData.winery}\nVintage: ${wineData.vintage}`,
      [
        {
          text: 'Continue Scanning',
          style: 'cancel',
          onPress: () => {
            setDetectedText('');
            // Resume scanning after 3 seconds
            setTimeout(() => setScanningActive(true), 3000);
          }
        },
        {
          text: 'View Details',
          onPress: () => {
            (navigation as any).navigate('WineDetail', { wine: wineData });
          }
        }
      ]
    );
  };

  // Handle gallery image selection
  const handlePickImage = async () => {
    try {
      console.log('Pick image button pressed');
      
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Image selected:', result.assets[0].uri);
        setShowModeSelection(false);
        setIsScanning(true); // Show loading state
        await processImageWithAPI(result.assets[0].uri);
      } else {
        console.log('Image picker was canceled');
        setShowModeSelection(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setShowModeSelection(false);
    }
  };

  // Take a single photo (like your original implementation)
  const handleTakePhoto = async () => {
    try {
      console.log('Take photo button pressed');
      
      if (!cameraRef.current) {
        Alert.alert('Error', 'Camera not ready. Please try again.');
        return;
      }
      
      setShowModeSelection(false);
      setIsScanning(true); // Show loading state
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      console.log('Photo captured:', photo.uri);
      await processImageWithAPI(photo.uri);
      
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsScanning(false);
    }
  };
  // Test backend connection
  const testConnection = async () => {
    try {
      console.log('Testing backend connection...');
      setShowModeSelection(false);
      const result = await vinousAPI.testConnection();
      console.log('Connection test result:', result);
      Alert.alert('Connection Test', 'Backend is reachable! Status: ' + result.status);
    } catch (error: unknown) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Connection Test Failed', 'Cannot reach backend. Error: ' + errorMessage);
    }
  };

  // Test with mock data
  const testMockData = () => {
    setShowModeSelection(false);
    const mockWine = {
      name: 'Château Margaux 2010',
      winery: 'Château Margaux',
      vintage: '2010',
      region: 'Margaux, Bordeaux',
      country: 'France',
      grape_variety: 'Cabernet Sauvignon, Merlot',
      alcohol_content: '13.5%',
      wine_type: 'red' as const,
      description: 'A legendary Bordeaux wine with exceptional complexity and elegance',
      confidence: 0.95
    };
    (navigation as any).navigate('WineDetail', { wine: mockWine });
  };

  // Start continuous scanning
  useEffect(() => {
    if (permission?.granted && scanningActive && !showModeSelection) {
      const interval = setInterval(scanFrame, 3000);
      return () => clearInterval(interval);
    }
  }, [permission?.granted, scanningActive, showModeSelection, lastScanTime]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <Text style={styles.permissionSubtext}>
          We need access to your camera to scan wine labels in real-time
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.permissionButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Real-time Wine Scanner</Text>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => setShowModeSelection(!showModeSelection)}
          >
            <Text style={styles.testButtonText}>📁</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Mode Selection Overlay */}
        {showModeSelection && (
          <View style={styles.modeSelectionOverlay}>
            <View style={styles.modeSelectionContainer}>
              <Text style={styles.modeSelectionTitle}>Choose Option</Text>
              
              <TouchableOpacity 
                style={styles.modeButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.modeButtonIcon}>📷</Text>
                <Text style={styles.modeButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modeButton}
                onPress={handlePickImage}
              >
                <Text style={styles.modeButtonIcon}>🖼️</Text>
                <Text style={styles.modeButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modeButton}
                onPress={testConnection}
              >
                <Text style={styles.modeButtonIcon}>🔧</Text>
                <Text style={styles.modeButtonText}>Test Connection</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modeButton, styles.cancelButton]}
                onPress={() => setShowModeSelection(false)}
              >
                <Text style={styles.modeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Scanning Overlay - Only show when menu is not open */}
        {!showModeSelection && (
          <View style={styles.scanningOverlay}>
            {/* Scanning Frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color="#10B981" />
                </View>
              )}
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                Point your camera at a wine label
              </Text>
              <Text style={styles.instructionsSubtext}>
                {scanningActive ? 'Scanning automatically... Tap 📁 for more options' : 'Scanning paused'}
              </Text>
              
              {detectedText && (
                <View style={styles.detectionContainer}>
                  <Text style={styles.detectionText}>Detected: {detectedText}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomControls}
        >
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                if (showModeSelection) {
                  setShowModeSelection(false);
                } else {
                  setScanningActive(!scanningActive);
                }
              }}
            >
              <Text style={styles.controlButtonText}>
                {showModeSelection ? '❌ Close Menu' : scanningActive ? '⏸️ Pause' : '▶️ Resume'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.mockButton]}
              onPress={testMockData}
            >
              <Text style={styles.controlButtonText}>🍷 Mock Data</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.statusText}>
            {isScanning ? 'Processing...' : 
             showModeSelection ? 'Menu open - scanning paused' :
             scanningActive ? 'Ready to scan' : 'Paused'}
          </Text>
        </LinearGradient>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  testButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modeSelectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modeSelectionContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.85,
    alignItems: 'center',
  },
  modeSelectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  modeButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  modeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  scanningOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.8,
    height: width * 0.8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#10B981',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningIndicator: {
    position: 'absolute',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: -100,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  detectionContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detectionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    padding: 20,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  mockButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6B7280',
  },
});

export default CameraScreen;