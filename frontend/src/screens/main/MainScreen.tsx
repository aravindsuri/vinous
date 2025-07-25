import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wine } from '../../types';
import { vinousAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const MainScreen: React.FC = () => {
  const navigation = useNavigation();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWines();
  }, []);

  const loadWines = async () => {
    try {
      setLoading(true);
      const response = await vinousAPI.getWines();
      setWines(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load wines');
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = () => {
    navigation.navigate('Camera' as never);
  };

  const QuickActionCard = ({ icon, title, count, color }: any) => (
    <TouchableOpacity style={[styles.quickActionCard, { borderLeftColor: color }]}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionCount}>{count}</Text>
    </TouchableOpacity>
  );

  const WineDiscoveryCard = ({ wine, price, rating, source, timeAgo, isLiked }: any) => (
    <TouchableOpacity style={styles.discoveryCard}>
      <View style={[styles.wineCardIcon, { backgroundColor: wine.wine_type === 'red' ? '#DC2626' : '#7C3AED' }]}>
        <Text style={styles.wineCardText}></Text>
      </View>
      <View style={styles.discoveryContent}>
        <Text style={styles.discoveryWineName}>{wine.name}</Text>
        <Text style={styles.discoveryWineDetails}>{wine.region}, {wine.country}  {wine.grape_variety}</Text>
        <View style={styles.discoveryMeta}>
          <Text style={styles.discoveryPrice}>{price}</Text>
          <Text style={styles.discoveryRating}>{rating} pts {source}</Text>
        </View>
        <Text style={styles.discoveryTime}>Added {timeAgo}</Text>
      </View>
      <TouchableOpacity style={styles.heartButton}>
        <Text style={styles.heartIcon}>{isLiked ? '' : ''}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileIcon}></Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}></Text>
            <Text style={styles.searchPlaceholder}>Search wines, regions, vintages...</Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity style={styles.scanSection} onPress={handleScanPress}>
          <View style={styles.scanButton}>
            <Text style={styles.scanButtonIcon}></Text>
          </View>
          <View style={styles.scanTextContainer}>
            <Text style={styles.scanTitle}>Scan a Wine Label</Text>
            <Text style={styles.scanSubtitle}>Point your camera at any wine bottle{'\n'}to discover its story instantly</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard 
              icon="" 
              title="Favorites" 
              count={wines.length + ' wines'}
              color="#DC2626"
            />
            <QuickActionCard 
              icon="" 
              title="Wishlist" 
              count="3 wines"
              color="#F59E0B"
            />
            <QuickActionCard 
              icon="" 
              title="Collection" 
              count={wines.length + ' wines'}
              color="#7C3AED"
            />
          </View>
        </View>

        {/* Recent Discoveries */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Discoveries</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {wines.length > 0 ? (
            wines.slice(0, 3).map((wine, index) => (
              <WineDiscoveryCard
                key={wine.id || index}
                wine={wine}
                price={'$' + (Math.random() * 200 + 50).toFixed(0)}
                rating={(Math.random() * 20 + 80).toFixed(0) + ' pts'}
                source={Math.random() > 0.5 ? 'Wine Spectator' : 'Robert Parker'}
                timeAgo={index === 0 ? '3 days ago' : index === 1 ? '1 week ago' : '2 weeks ago'}
                isLiked={Math.random() > 0.5}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}></Text>
              <Text style={styles.emptyTitle}>No wines discovered yet</Text>
              <Text style={styles.emptySubtitle}>Start scanning wine labels to build your collection</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Text style={[styles.navIcon, styles.activeNavIcon]}></Text>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleScanPress}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}></Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}></Text>
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
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  searchPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  scanSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scanButtonIcon: {
    fontSize: 24,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: (width - 60) / 3,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickActionCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  discoveryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wineCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  wineCardText: {
    fontSize: 20,
  },
  discoveryContent: {
    flex: 1,
  },
  discoveryWineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  discoveryWineDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  discoveryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  discoveryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 15,
  },
  discoveryRating: {
    fontSize: 12,
    color: '#6B7280',
  },
  discoveryTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  heartButton: {
    padding: 5,
  },
  heartIcon: {
    fontSize: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomNav: {
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

export default MainScreen;
