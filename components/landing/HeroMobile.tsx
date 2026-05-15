import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, Platform } from 'react-native';
import { Search, MapPin, Bell, ChevronDown, LayoutGrid, Circle, Trophy, Square, Grid, Layers } from 'lucide-react-native';
import { router } from 'expo-router';

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
}

const SPORT_CATEGORIES = [
  { label: 'All', value: 'all', icon: LayoutGrid },
  { label: 'Football', value: 'football', icon: Circle },
  { label: 'Cricket', value: 'cricket', icon: Trophy },
  { label: 'Box Cricket', value: 'box', icon: Square },
  { label: 'Nets', value: 'nets', icon: Grid },
  { label: 'Multi-Sport', value: 'multi', icon: Layers },
];

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
}: HeroMobileProps) {
  return (
    <View style={styles.container}>
      {/* Background Image/Overlay */}
      <View style={styles.bgOverlay} />
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Pressable style={styles.locationPillHeader} onPress={refreshLocation}>
          <MapPin size={14} color="#00EA6B" fill="rgba(0, 234, 107, 0.2)" />
          <Text style={styles.locationText}>
            {cityName || 'Nangloi, Delhi'}
          </Text>
        </Pressable>
        
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => router.push('/profile/notifications' as any)}>
            <Bell size={20} color="#01e669" />
            <View style={styles.notificationDot} />
          </Pressable>
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
          {new Date().getHours() < 12 
            ? 'GOOD MORNING' 
            : new Date().getHours() < 16 
              ? 'GOOD AFTERNOON' 
              : 'GOOD EVENING'}
        </Text>
        <Text style={styles.greetingMain}>
          Hey, {(profile?.full_name?.split(' ')[0] || profile?.username || 'Albie').toUpperCase()}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchLeft}>
          <Search size={20} color="#00EA6B" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search grounds, sports..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {SPORT_CATEGORIES.map((cat) => {
          const isActive = sportFilter === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => setSportFilter(cat.value)}
              style={[
                styles.categoryChip,
                isActive ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}
            >
              <Text style={[styles.categoryText, isActive ? styles.categoryTextActive : styles.categoryTextInactive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#06392e', // Dark green background
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00EA6B',
    borderWidth: 1.5,
    borderColor: '#06392E',
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
    marginBottom: 45,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
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
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
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
