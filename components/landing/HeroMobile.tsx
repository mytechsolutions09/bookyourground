import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, Platform, TouchableOpacity, Animated } from 'react-native';
import { Search, MapPin, Bell, ChevronDown, Sunrise, Sun, Sunset, Moon, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';

const SPORT_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Cricket', value: 'cricket' },
  { label: 'Box Cricket', value: 'box' },
  { label: 'Nets', value: 'nets' },
];

interface HeroMobileProps {
  cityName: string;
  refreshLocation: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  sportFilter: string;
  setSportFilter: (sport: string) => void;
  profile: any;
  setShowProfileModal: (show: boolean) => void;
  unreadCount?: number;
}


export default function HeroMobile({
  cityName,
  refreshLocation,
  searchQuery,
  setSearchQuery,
  handleSearch,
  sportFilter,
  setSportFilter,
  profile,
  setShowProfileModal,
  unreadCount = 0,
}: HeroMobileProps) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!cityName) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.8, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [cityName, pulse]);

  return (
    <View style={styles.container}>
      {/* Background Image/Overlay */}
      <View style={styles.bgOverlay} />
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Pressable style={styles.locationPillHeader} onPress={refreshLocation}>
          <MapPin size={14} color="#00EA6B" fill="rgba(0, 234, 107, 0.2)" />
          {cityName ? (
            <Text style={styles.locationText}>
              {cityName}
            </Text>
          ) : (
            <Animated.View style={{ width: 80, height: 14, backgroundColor: 'rgba(0, 234, 107, 0.3)', borderRadius: 4, opacity: pulse }} />
          )}
        </Pressable>
        
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowProfileModal(true)} style={styles.avatarButton}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'AL'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingSub}>
          {(() => {
            const hour = new Date().getHours();
            if (hour >= 0 && hour < 5) return 'Good Night';
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            return 'Good Evening';
          })()}
        </Text>
        <Text style={styles.greetingMain}>
          {(() => {
            const fullName = profile?.full_name || profile?.username || 'Albie';
            return fullName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          })()}
        </Text>
        <Text style={styles.greetingPrompt}>
          What sport are you in mood to play today?
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchLeft}>
          <Search size={20} color="#00EA6B" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search grounds, sports..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Divider */}
        <View style={styles.searchDivider} />

        {/* Type Filter Selector */}
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowTypeMenu(prev => !prev)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={16} color="#00EA6B" strokeWidth={2.2} style={{ marginRight: 6 }} />
          <Text style={styles.filterButtonText} numberOfLines={1}>
            {SPORT_CATEGORIES.find(c => c.value === sportFilter)?.label || 'All'}
          </Text>
          <ChevronDown size={12} color="rgba(255, 255, 255, 0.6)" strokeWidth={2.5} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Dropdown Menu Overlay */}
        {showTypeMenu && (
          <View style={styles.dropdownMenu}>
            {SPORT_CATEGORIES.map((cat) => {
              const isActive = sportFilter === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => {
                    setSportFilter(cat.value);
                    setShowTypeMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#134d40', // Dark green background
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    position: 'relative',
    overflow: 'visible',
    zIndex: 2000,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)', // Subtle dark overlay
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#00EA6B',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#032B22',
    backgroundColor: '#00EA6B',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
  logoTextGreen: {
    color: '#00EA6B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 2,
    backgroundColor: '#00EA6B',
    borderWidth: 2,
    borderColor: '#06392E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  notificationDotText: {
    color: '#06392E',
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#034E3F',
    borderWidth: 1.5,
    borderColor: '#00EA6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#00EA6B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  greetingContainer: {
    marginBottom: 15,
  },
  greetingSub: {
    color: '#00EA6B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  greetingMain: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  greetingPrompt: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 16,
  },
  greenDot: {
    color: '#00EA6B',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.2)',
  },
  locationPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.2)',
  },
  locationText: {
    color: '#00EA6B',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  pillDot: {
    color: '#00EA6B',
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#134d40',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 30,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.2)',
    zIndex: 9999,
    position: 'relative',
  },
  searchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#00EA6B',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    right: 16,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    padding: 6,
    zIndex: 99999,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#036b33',
    fontWeight: '700',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationSelectText: {
    color: '#00EA6B',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },
  categoriesContainer: {
    paddingVertical: 4,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: '#00EA6B',
  },
  categoryChipInactive: {
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: '#0F172A',
  },
});
