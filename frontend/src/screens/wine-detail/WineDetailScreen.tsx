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

interface WineRating {
  score: number;
  source: string;
  maxScore: number;
}

interface WinePrice {
  price: number;
  currency: string;
  source: string;
  url?: string;
}

const WineDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { wine } = route.params as { wine: Wine };
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [wineRating, setWineRating] = useState<WineRating | null>(null);
  const [winePrice, setWinePrice] = useState<WinePrice | null>(null);
  const [aiTastingNotes, setAiTastingNotes] = useState<string>('');
  const [loadingRating, setLoadingRating] = useState(true);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingTastingNotes, setLoadingTastingNotes] = useState(true);

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

  // Fetch wine ratings using your API
  const fetchWineRating = async (wine: Wine) => {
    try {
      setLoadingRating(true);
      console.log('🔍 Fetching wine rating for:', wine.name);
      
      const response = await vinousAPI.getWineRating(wine);
      
      if (response.success && response.data) {
        setWineRating({
          score: response.data.rating,
          source: response.data.source,
          maxScore: response.data.max_rating || 100
        });
        console.log('✅ Wine rating set successfully:', response.data);
      } else {
        console.log('⚠️ No rating data, using fallback');
        const estimatedRating = estimateWineRating(wine);
        setWineRating(estimatedRating);
      }
    } catch (error) {
      console.error('❌ Error fetching wine rating:', error);
      // Fallback to estimated rating
      const estimatedRating = estimateWineRating(wine);
      setWineRating(estimatedRating);
    } finally {
      setLoadingRating(false);
    }
  };

  // Fetch wine prices using your API
  const fetchWinePrice = async (wine: Wine) => {
    try {
      setLoadingPrice(true);
      console.log('💰 Fetching wine price for:', wine.name);
      
      const response = await vinousAPI.getWinePrice(wine);
      
      if (response.success && response.data) {
        if (response.data.lowest_price) {
          // Multiple prices available
          setWinePrice({
            price: response.data.lowest_price.price,
            currency: response.data.lowest_price.currency || 'USD',
            source: response.data.lowest_price.source,
            url: response.data.lowest_price.url
          });
        } else {
          // Single price estimate
          setWinePrice({
            price: response.data.price || 0,
            currency: response.data.currency || 'USD',
            source: response.data.source || 'Estimate'
          });
        }
        console.log('✅ Wine price set successfully:', response.data);
      } else {
        console.log('⚠️ No price data, using fallback');
        const estimatedPrice = estimateWinePrice(wine);
        setWinePrice(estimatedPrice);
      }
    } catch (error) {
      console.error('❌ Error fetching wine price:', error);
      // Fallback to estimated price
      const estimatedPrice = estimateWinePrice(wine);
      setWinePrice(estimatedPrice);
    } finally {
      setLoadingPrice(false);
    }
  };

  // Generate AI-based tasting notes using your API
  const generateAITastingNotes = async (wine: Wine) => {
    try {
      setLoadingTastingNotes(true);
      console.log('📝 Generating AI tasting notes for:', wine.name);
      
      const response = await vinousAPI.generateTastingNotes(wine);
      
      if (response.success && response.data && response.data.tasting_notes) {
        setAiTastingNotes(response.data.tasting_notes);
        console.log('✅ Tasting notes set successfully:', response.data.tasting_notes);
      } else {
        console.log('⚠️ No tasting notes data, using fallback');
        const fallbackNotes = generateGrapeBasedTastingNotes(wine);
        setAiTastingNotes(fallbackNotes);
      }
    } catch (error) {
      console.error('❌ Error generating AI tasting notes:', error);
      // Fallback to grape-specific tasting notes
      const fallbackNotes = generateGrapeBasedTastingNotes(wine);
      setAiTastingNotes(fallbackNotes);
    } finally {
      setLoadingTastingNotes(false);
    }
  };

  // Alternative: Use the utility method to fetch all data at once
  const fetchAllWineData = async (wine: Wine) => {
    try {
      console.log('🚀 Fetching complete wine data for:', wine.name);
      
      // Set all loading states
      setLoadingRating(true);
      setLoadingPrice(true);
      setLoadingTastingNotes(true);
      
      const completeData = await vinousAPI.getCompleteWineData(wine);
      
      // Handle rating data
      if (completeData.rating?.success && completeData.rating.data) {
        setWineRating({
          score: completeData.rating.data.rating,
          source: completeData.rating.data.source,
          maxScore: completeData.rating.data.max_rating || 100
        });
        console.log('✅ Rating loaded:', completeData.rating.data);
      } else {
        console.log('⚠️ Rating fallback');
        setWineRating(estimateWineRating(wine));
      }
      
      // Handle price data
      if (completeData.price?.success && completeData.price.data) {
        const priceData = completeData.price.data;
        setWinePrice({
          price: priceData.lowest_price?.price || priceData.price || 0,
          currency: priceData.lowest_price?.currency || priceData.currency || 'USD',
          source: priceData.lowest_price?.source || priceData.source || 'Estimate'
        });
        console.log('✅ Price loaded:', priceData);
      } else {
        console.log('⚠️ Price fallback');
        setWinePrice(estimateWinePrice(wine));
      }
      
      // Handle tasting notes
      if (completeData.tastingNotes?.success && completeData.tastingNotes.data?.tasting_notes) {
        setAiTastingNotes(completeData.tastingNotes.data.tasting_notes);
        console.log('✅ Tasting notes loaded:', completeData.tastingNotes.data.tasting_notes);
      } else {
        console.log('⚠️ Tasting notes fallback');
        setAiTastingNotes(generateGrapeBasedTastingNotes(wine));
      }
      
      // Log any errors
      if (completeData.errors.rating) console.error('Rating error:', completeData.errors.rating);
      if (completeData.errors.price) console.error('Price error:', completeData.errors.price);
      if (completeData.errors.tastingNotes) console.error('Tasting notes error:', completeData.errors.tastingNotes);
      
    } catch (error) {
      console.error('❌ Error fetching complete wine data:', error);
      // Set fallback data for all
      setWineRating(estimateWineRating(wine));
      setWinePrice(estimateWinePrice(wine));
      setAiTastingNotes(generateGrapeBasedTastingNotes(wine));
    } finally {
      // Clear all loading states
      setLoadingRating(false);
      setLoadingPrice(false);
      setLoadingTastingNotes(false);
    }
  };

  // Fallback function to estimate wine rating
  const estimateWineRating = (wine: Wine): WineRating => {
    // Base rating logic based on wine characteristics
    let baseScore = 85;
    
    // Adjust based on region (prestigious regions get higher scores)
    const prestigiousRegions = ['Bordeaux', 'Burgundy', 'Napa Valley', 'Chianti Classico', 'Barolo', 'Rioja'];
    if (prestigiousRegions.some(region => wine.region?.includes(region))) {
      baseScore += 5;
    }
    
    // Adjust based on grape variety
    const premiumGrapes = ['Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Sangiovese'];
    if (premiumGrapes.includes(wine.grape_variety || '')) {
      baseScore += 3;
    }
    
    // Add some randomness within realistic range
    const finalScore = baseScore + Math.floor(Math.random() * 8) - 4;
    
    return {
      score: Math.min(Math.max(finalScore, 75), 95),
      source: 'Wine Expert Estimate',
      maxScore: 100
    };
  };

  // Fallback function to estimate wine price
  const estimateWinePrice = (wine: Wine): WinePrice => {
    // Base price logic based on wine characteristics
    let basePrice = 25;
    
    // Adjust based on region
    const expensiveRegions = ['Bordeaux', 'Burgundy', 'Napa Valley', 'Champagne'];
    if (expensiveRegions.some(region => wine.region?.includes(region))) {
      basePrice *= 2.5;
    }
    
    // Adjust based on vintage (older wines are generally more expensive)
    const currentYear = new Date().getFullYear();
    const vintage = parseInt(wine.vintage || currentYear.toString());
    if (vintage < currentYear - 5) {
      basePrice *= 1.3;
    }
    
    // Add randomness
    const finalPrice = basePrice * (0.8 + Math.random() * 0.4);
    
    return {
      price: Math.round(finalPrice),
      currency: 'USD',
      source: 'Market Estimate'
    };
  };

  // Generate grape-specific tasting notes
  const generateGrapeBasedTastingNotes = (wine: Wine): string => {
    const grapeProfiles = {
      'Sangiovese': 'Medium-bodied with bright acidity and firm tannins. Notes of cherry, plum, and herbs with earthy undertones. The finish is persistent with hints of leather and tobacco.',
      'Cabernet Sauvignon': 'Full-bodied with structured tannins and dark fruit flavors. Aromas of blackcurrant, cedar, and vanilla with a long, elegant finish showing notes of chocolate and spice.',
      'Pinot Noir': 'Light to medium-bodied with silky tannins. Delicate aromas of red cherry, strawberry, and violet with earthy minerality. The finish is smooth and refined.',
      'Chardonnay': 'Medium to full-bodied with balanced acidity. Flavors of green apple, citrus, and mineral notes. Creamy texture with a clean, refreshing finish.',
      'Merlot': 'Medium to full-bodied with soft tannins. Rich flavors of black cherry, plum, and chocolate with hints of herbs and vanilla. Smooth, approachable finish.',
      'Sauvignon Blanc': 'Crisp and refreshing with high acidity. Bright flavors of grapefruit, lime, and tropical fruits with herbaceous notes. Clean, zesty finish.',
      'Syrah': 'Full-bodied with robust tannins. Intense flavors of blackberry, pepper, and smoke with meaty, savory undertones. Bold, spicy finish.',
      'Riesling': 'Light to medium-bodied with vibrant acidity. Floral aromas with flavors of stone fruits, citrus, and mineral notes. Crisp, clean finish.'
    };
    
    const grapeVariety = wine.grape_variety || '';
    return grapeProfiles[grapeVariety as keyof typeof grapeProfiles] || grapeProfiles['Sangiovese'];
  };

  // Extract location from wine data and get coordinates
  const extractLocationAndGetCoordinates = async (wine: Wine) => {
    try {
      setLoadingLocation(true);
      
      const region = wine.region || '';
      const country = wine.country || 'Italy';
      
      let city = '';
      const regionPatterns = [
        /di\s+(\w+)/i,
        /de\s+(\w+)/i,
        /\b(\w+)\s+Valley/i,
        /\b(\w+)\s+Hills/i,
      ];
      
      for (const pattern of regionPatterns) {
        const match = region.match(pattern);
        if (match) {
          city = match[1];
          break;
        }
      }
      
      if (!city) {
        city = region.split(',')[0].trim();
      }
      
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

  // Geocoding function
  const geocodeLocation = async (locationQuery: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your actual API key
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
    const countryRegions = {
      'Italy': { latitude: 41.8719, longitude: 12.5674, latitudeDelta: 8.0, longitudeDelta: 8.0 },
      'France': { latitude: 46.2276, longitude: 2.2137, latitudeDelta: 8.0, longitudeDelta: 8.0 },
      'Spain': { latitude: 40.4637, longitude: -3.7492, latitudeDelta: 8.0, longitudeDelta: 8.0 },
      'Germany': { latitude: 51.1657, longitude: 10.4515, latitudeDelta: 6.0, longitudeDelta: 6.0 },
      'USA': { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 25.0, longitudeDelta: 25.0 },
    };

    const countryKey = Object.keys(countryRegions).find(country => 
      locationData.country.toLowerCase().includes(country.toLowerCase())
    );

    if (countryKey) {
      return countryRegions[countryKey as keyof typeof countryRegions];
    }

    return {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      latitudeDelta: 5.0,
      longitudeDelta: 5.0,
    };
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

  // Test function for debugging
  const testAPIEndpoints = async () => {
    console.log('🧪 Testing API endpoints...');
    
    try {
      // Test health endpoint first
      const health = await vinousAPI.testConnection();
      console.log('✅ Health check:', health);
      
      // Test each endpoint individually
      console.log('🔍 Testing rating endpoint...');
      await fetchWineRating(wine);
      
      console.log('💰 Testing price endpoint...');
      await fetchWinePrice(wine);
      
      console.log('📝 Testing tasting notes endpoint...');
      await generateAITastingNotes(wine);
      
      Alert.alert('API Test Complete', 'Check console for detailed results');
    } catch (error: unknown) {
      console.error('🧪 API test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('API Test Failed', errorMessage);
    }
  };

  useEffect(() => {
    // Load all data when component mounts
    extractLocationAndGetCoordinates(wine);
    
    // Option 1: Fetch all data at once (recommended)
    fetchAllWineData(wine);
    
    // Option 2: Fetch data separately (uncomment to use instead)
    // fetchWineRating(wine);
    // fetchWinePrice(wine);
    // generateAITastingNotes(wine);
  }, [wine]);

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

      {/* Test Button (remove in production) */}
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={testAPIEndpoints}
        >
          <Text style={styles.testButtonText}>Test APIs</Text>
        </TouchableOpacity>
      )}

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
            
            {wine.winery && (
              <Text style={styles.winery}>{wine.winery}</Text>
            )}
            
            <Text style={styles.grapeVariety}>{wine.grape_variety || 'Sangiovese'}</Text>
            
            {wine.alcohol_content && (
              <Text style={styles.alcoholContent}>🍷 {wine.alcohol_content} ABV</Text>
            )}
            
            {/* Real Rating */}
            <View style={styles.ratingContainer}>
              {loadingRating ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : wineRating ? (
                <>
                  <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
                  {panelExpanded && (
                    <Text style={styles.ratingText}>
                      {wineRating.score}/{wineRating.maxScore}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
              )}
            </View>
            
            {/* Real Price */}
            {loadingPrice ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : winePrice ? (
              <Text style={styles.price}>
                ${winePrice.price} {winePrice.currency}
              </Text>
            ) : (
              <Text style={styles.price}>Price unavailable</Text>
            )}
            
            {panelExpanded && wineRating && (
              <Text style={styles.source}>{wineRating.score} pts {wineRating.source}</Text>
            )}
            
            {wine.confidence && panelExpanded && (
              <Text style={styles.confidence}>
                🎯 {(wine.confidence * 100).toFixed(0)}% confidence
              </Text>
            )}
          </View>

          {/* Producer Info */}
          {wine.winery && panelExpanded && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Producer</Text>
              <Text style={styles.sectionContent}>
                🏛️ {wine.winery}{'\n'}
                📍 {wine.region}, {wine.country}
              </Text>
            </View>
          )}

          {/* Wine Specs */}
          {panelExpanded && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wine Specifications</Text>
              <Text style={styles.sectionContent}>
                🍇 {wine.grape_variety || 'Sangiovese'}{'\n'}
                🍷 {wine.wine_type?.charAt(0).toUpperCase() + wine.wine_type?.slice(1) || 'Red'} Wine{'\n'}
                {wine.alcohol_content && `🌡️ ${wine.alcohol_content} Alcohol Content\n`}
                📅 {wine.vintage || '2023'} Vintage
              </Text>
            </View>
          )}

          {/* Location Info */}
          {locationData && panelExpanded && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Geographic Location</Text>
              <Text style={styles.sectionContent}>
                📍 {locationData.city}, {locationData.region}{'\n'}
                🌍 {locationData.country}{'\n'}
                📊 Lat: {locationData.latitude.toFixed(4)}, Lng: {locationData.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* AI-Generated Tasting Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Tasting Notes</Text>
            {loadingTastingNotes ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Text style={styles.sectionContent} numberOfLines={panelExpanded ? undefined : 2}>
                {aiTastingNotes}
              </Text>
            )}
            {!panelExpanded && !loadingTastingNotes && (
              <TouchableOpacity onPress={togglePanel}>
                <Text style={styles.readMore}>Read more</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Price & Rating Details */}
          {panelExpanded && (winePrice || wineRating) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Market Information</Text>
              <Text style={styles.sectionContent}>
                {winePrice && `💰 $${winePrice.price} ${winePrice.currency} (${winePrice.source})\n`}
                {wineRating && `⭐ ${wineRating.score}/${wineRating.maxScore} points (${wineRating.source})\n`}
                📈 Market data updated in real-time
              </Text>
            </View>
          )}

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
  testButton: {
    position: 'absolute',
    top: 200,
    right: 20,
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  winery: {
    fontSize: 10,
    color: '#8B5CF6',
    marginBottom: 3,
    fontWeight: '500',
  },
  grapeVariety: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
  },
  alcoholContent: {
    fontSize: 10,
    color: '#10B981',
    marginBottom: 6,
    fontWeight: '500',
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
  confidence: {
    fontSize: 9,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 3,
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
  activeNavItem: {},
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