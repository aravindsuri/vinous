import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Wine } from '../../types';
import { vinousAPI } from '../../services/api';

const { width, height } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

const WineDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { wine } = route.params as { wine: Wine };
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const handleScanPress = () => {
    navigation.navigate('Camera' as never);
  };

  const handleSaveWine = async () => {
    try {
      await vinousAPI.saveWine(wine);
      Alert.alert('Success', 'Wine saved to your collection!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save wine');
    }
  };

  const togglePanel = () => {
    setPanelExpanded(!panelExpanded);
  };

  // Extract location from wine data and get coordinates
  const extractLocationAndGetCoordinates = async (wine: Wine) => {
    try {
      setLoadingLocation(true);
      
      // Extract location information from wine
      const region = wine.region || '';
      const country = wine.country || 'Italy';
      
      // Extract specific town/city from region (e.g., "Scansano" from "Morellino di Scansano")
      let city = '';
      
      // Common wine region patterns
      const regionPatterns = [
        /di\s+(\w+)/i, // "di Scansano" -> "Scansano"
        /de\s+(\w+)/i, // "de Bordeaux" -> "Bordeaux"
        /\b(\w+)\s+Valley/i, // "Napa Valley" -> "Napa"
        /\b(\w+)\s+Hills/i, // "Adelaide Hills" -> "Adelaide"
      ];
      
      // Try to extract city from region name
      for (const pattern of regionPatterns) {
        const match = region.match(pattern);
        if (match) {
          city = match[1];
          break;
        }
      }
      
      // If no city found, use the full region name
      if (!city) {
        city = region.split(',')[0].trim();
      }
      
      // Geocoding query - prioritize city, then region, then country
      const query = city ? `${city}, ${country}` : `${region}, ${country}`;
      
      const coordinates = await geocodeLocation(query);
      
      if (coordinates) {
        setLocationData({
          ...coordinates,
          city: city || region,
          region,
          country,
        });
      } else {
        // Fallback to country-level coordinates
        const countryCoords = await geocodeLocation(country);
        if (countryCoords) {
          setLocationData({
            ...countryCoords,
            city: city || region,
            region,
            country,
          });
        }
      }
    } catch (error) {
      console.error('Error extracting location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Geocoding function to get coordinates from location name
  const geocodeLocation = async (locationQuery: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Using Google Geocoding API
      const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Get map region based on country
  const getMapRegion = (locationData: LocationData) => {
    // Country-specific zoom levels to show the full country
    const countryRegions = {
      'Italy': {
        latitude: 41.8719,
        longitude: 12.5674,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      },
      'France': {
        latitude: 46.2276,
        longitude: 2.2137,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      },
      'Spain': {
        latitude: 40.4637,
        longitude: -3.7492,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      },
      'Germany': {
        latitude: 51.1657,
        longitude: 10.4515,
        latitudeDelta: 6.0,
        longitudeDelta: 6.0,
      },
      'USA': {
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 25.0,
        longitudeDelta: 25.0,
      },
    };

    const countryKey = Object.keys(countryRegions).find(country => 
      locationData.country.toLowerCase().includes(country.toLowerCase())
    );

    if (countryKey) {
      return countryRegions[countryKey as keyof typeof countryRegions];
    }

    // Default region centered on the wine location
    return {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      latitudeDelta: 5.0,
      longitudeDelta: 5.0,
    };
  };

  useEffect(() => {
    extractLocationAndGetCoordinates(wine);
  }, [wine]);

  const generateTastingNotes = (wine: Wine) => {
    const redNotes = [
      'Rich and complex with layers of blackcurrant, cedar, and tobacco. Elegant tannins with a long, refined finish.',
      'Full-bodied with notes of dark cherry, vanilla, and spice. Smooth tannins and excellent structure.',
      'Complex aromas of dark fruit, leather, and herbs. Well-balanced with a persistent finish.'
    ];
    
    const whiteNotes = [
      'Crisp and refreshing with citrus and mineral notes. Clean finish with hints of green apple.',
      'Elegant with floral aromas and stone fruit flavors. Bright acidity and a creamy texture.',
      'Fresh and vibrant with tropical fruit and crisp minerality. Long, clean finish.'
    ];

    return wine.wine_type === 'red' 
      ? redNotes[Math.floor(Math.random() * redNotes.length)]
      : whiteNotes[Math.floor(Math.random() * whiteNotes.length)];
  };

  const generateVineyardInfo = (wine: Wine) => {
    return {
      classification: wine.wine_type === 'red' ? 'DOCG Morellino di Scansano' : 'DOC',
      location: (wine.region || 'Tuscany') + ', ' + (wine.country || 'Italy'),
      soil: wine.wine_type === 'red' ? 'Clay and limestone soils' : 'Volcanic soils',
      hectares: Math.floor(Math.random() * 200 + 50),
      established: Math.floor(Math.random() * 200 + 1800)
    };
  };

  const rating = (Math.random() * 1 + 4).toFixed(1);
  const price = Math.floor(Math.random() * 500 + 100);
  const tastingNotes = generateTastingNotes(wine);
  const vineyardInfo = generateVineyardInfo(wine);

  return (
    <SafeAreaView style={styles.container}>
      {/* Google Maps Background */}
      <View style={styles.mapContainer}>
        {loadingLocation ? (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#A7F3D0', '#6EE7B7', '#34D399']}
              style={styles.loadingBackground}
            >
              <ActivityIndicator size="large" color="#1F2937" />
              <Text style={styles.loadingText}>Loading wine location...</Text>
            </LinearGradient>
          </View>
        ) : locationData ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={getMapRegion(locationData)}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            mapType="terrain"
          >
            <Marker
              coordinate={{
                latitude: locationData.latitude,
                longitude: locationData.longitude,
              }}
              title={locationData.city}
              description={`${locationData.region}, ${locationData.country}`}
            >
              <View style={styles.customMarker}>
                <Text style={styles.markerIcon}>🍷</Text>
              </View>
            </Marker>
          </MapView>
        ) : (
          // Fallback to original custom map if geocoding fails
          <LinearGradient
            colors={['#A7F3D0', '#6EE7B7', '#34D399']}
            style={styles.mapBackground}
          >
            <View style={styles.fallbackMapContainer}>
              <Text style={styles.fallbackText}>Wine Region: {wine.region || 'Unknown'}</Text>
              <Text style={styles.fallbackSubtext}>{wine.country || 'Italy'}</Text>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* Header Overlay */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        style={styles.headerOverlay}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹ Wine Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareIcon}>⚡</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Location Badge */}
      <View style={styles.locationBadge}>
        <Text style={styles.locationText}>
          {locationData ? `${locationData.city}, ${locationData.country}` : `${wine.region || 'Wine Region'}, ${wine.country || 'Italy'}`}
        </Text>
      </View>

      {/* Right Side Panel */}
      <View style={[styles.sidePanel, panelExpanded && styles.sidePanelExpanded]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Wine Info Header */}
          <View style={styles.panelHeader}>
            <View style={styles.wineIconContainer}>
              <View style={[styles.wineIcon, { backgroundColor: wine.wine_type === 'red' ? '#7C3AED' : '#10B981' }]}>
                <Text style={styles.wineIconText}>🍷</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.expandButton} onPress={togglePanel}>
              <Text style={styles.expandIcon}>{panelExpanded ? '←' : '→'}</Text>
            </TouchableOpacity>
          </View>

          {/* Wine Details */}
          <View style={styles.wineInfo}>
            <Text style={styles.wineName} numberOfLines={panelExpanded ? undefined : 1}>
              {wine.name || 'La Rasola'}
            </Text>
            <Text style={styles.wineSubtitle}>
              {wine.vintage || '2023'} • {wine.region || 'Morellino di Scansano'}
            </Text>
            <Text style={styles.grapeVariety}>{wine.grape_variety || 'Sangiovese'}</Text>
            
            {/* Rating */}
            <View style={styles.ratingContainer}>
              <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
              {panelExpanded && <Text style={styles.ratingText}>{rating}/5</Text>}
            </View>
            
            <Text style={styles.price}>${price}</Text>
            {panelExpanded && <Text style={styles.source}>92 pts Wine Spectator</Text>}
          </View>

          {/* Location Info */}
          {locationData && panelExpanded && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.sectionContent}>
                📍 {locationData.city}, {locationData.region}{'\n'}
                🌍 {locationData.country}{'\n'}
                📊 Lat: {locationData.latitude.toFixed(4)}, Lng: {locationData.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Tasting Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasting Notes</Text>
            <Text style={styles.sectionContent} numberOfLines={panelExpanded ? undefined : 2}>
              {tastingNotes}
            </Text>
            {!panelExpanded && (
              <TouchableOpacity onPress={togglePanel}>
                <Text style={styles.readMore}>Read more</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vineyard Info */}
          {panelExpanded ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vineyard</Text>
              <Text style={styles.sectionContent}>
                {vineyardInfo.classification} • {vineyardInfo.location}{'\n'}
                {vineyardInfo.soil} • {vineyardInfo.hectares} hectares • Est. {vineyardInfo.established}
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vineyard</Text>
              <Text style={styles.sectionContent} numberOfLines={1}>
                {vineyardInfo.classification}...
              </Text>
              <TouchableOpacity onPress={togglePanel}>
                <Text style={styles.readMore}>View details</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.saveIcon} onPress={handleSaveWine}>
              <Text style={styles.iconText}>🤍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addIcon}>
              <Text style={styles.iconText}>+</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Map Controls */}
      {locationData && (
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => {
              // You can add functionality to recenter or change map type
              Alert.alert('Map Controls', 'Additional map controls can be added here');
            }}
          >
            <Text style={styles.controlIcon}>🗺️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Main' as never)}>
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]} onPress={handleScanPress}>
          <Text style={[styles.navIcon, styles.activeNavIcon]}>📷</Text>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📚</Text>
          <Text style={styles.navLabel}>Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⋯</Text>
          <Text style={styles.navLabel}>More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  mapBackground: {
    flex: 1,
    position: 'relative',
  },
  fallbackMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 20,
  },
  headerOverlay: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    height: 80,
    paddingHorizontal: 20,
    paddingVertical: 15,
    opacity: 0.95,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    color: 'white',
    fontSize: 16,
  },
  locationBadge: {
    position: 'absolute',
    top: 134,
    alignSelf: 'center',
    left: width / 2 - 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  sidePanel: {
    position: 'absolute',
    top: 180,
    right: 10,
    width: 115,
    maxHeight: height - 280,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sidePanelExpanded: {
    width: width - 40,
    right: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  wineIconContainer: {
    flex: 1,
  },
  wineIcon: {
    width: 40,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wineIconText: {
    fontSize: 20,
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIcon: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wineInfo: {
    marginBottom: 15,
  },
  wineName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 3,
  },
  wineSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3,
  },
  grapeVariety: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stars: {
    fontSize: 12,
    marginRight: 5,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 3,
  },
  source: {
    fontSize: 9,
    color: '#6B7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  sectionContent: {
    fontSize: 9,
    lineHeight: 14,
    color: '#374151',
  },
  readMore: {
    fontSize: 9,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 3,
  },
  actionIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  saveIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    color: 'white',
  },
  mapControls: {
    position: 'absolute',
    bottom: 130,
    right: 20,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlIcon: {
    fontSize: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Active styling
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeNavIcon: {
    color: '#8B5CF6',
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavLabel: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});

export default WineDetailScreen;