import React, { useEffect, useState, useMemo } from 'react';
import { MapPin, Navigation, Map as MapIcon, ChevronRight, Search, ExternalLink } from 'lucide-react-native';
import { View, Text, StyleSheet, Platform, Pressable, ScrollView, ActivityIndicator, TextInput, Image, Linking, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { router } from 'expo-router';
import { makeGroundPath } from '@/utils/groundSlug';
import Card from '@/components/ui/Card';

export default function GroundsNearYou() {
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedGroundId, setFocusedGroundId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    loadGrounds();
  }, []);

  const loadGrounds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*)
        `)
        .eq('active', true)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const sorted = (data as GroundWithImages[]) || [];
      setGrounds(sorted);
      if (sorted.length > 0) {
        setFocusedGroundId(sorted[0].id);
      }
    } catch (err) {
      console.error('Error loading nearby grounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nearMeActive && !userLocation) {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            console.error("Geolocation error:", err);
            setNearMeActive(false);
          }
        );
      }
    }
  }, [nearMeActive, userLocation]);

  const filteredGrounds = useMemo(() => {
    let result = [...grounds];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.city.toLowerCase().includes(q)
      );
    }
    
    if (nearMeActive && userLocation) {
       result.sort((a, b) => {
         if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return 0;
         const distA = Math.sqrt(Math.pow(Number(a.latitude) - userLocation.lat, 2) + Math.pow(Number(a.longitude) - userLocation.lng, 2));
         const distB = Math.sqrt(Math.pow(Number(b.latitude) - userLocation.lat, 2) + Math.pow(Number(b.longitude) - userLocation.lng, 2));
         return distA - distB;
       });
    }
    
    return result.slice(0, 6);
  }, [grounds, searchQuery, nearMeActive, userLocation]);

  const isWeb = Platform.OS === 'web';

  const focusedGround = useMemo(() => 
    filteredGrounds.find(g => g.id === focusedGroundId) || filteredGrounds[0], 
  [filteredGrounds, focusedGroundId]);

  const freeMapEmbed = useMemo(() => {
    if (!focusedGround) {
      return `https://maps.google.com/maps?q=${encodeURIComponent("Cricket grounds near me")}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }
    const q = `${focusedGround.name}, ${focusedGround.address}, ${focusedGround.city}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
  }, [focusedGround]);

  if (loading) {
     return (
       <View style={styles.loader}>
         <ActivityIndicator color="#00ea6b" />
       </View>
     );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconCircle}>
            <MapIcon size={24} color="#00ea6b" />
          </View>
           <View>
            <Text style={styles.title}>Grounds Near You</Text>
            <Text style={styles.subtitle}>Discover and pinpoint cricket grounds in your area</Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.searchBAR}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search grounds or cities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchINPUT}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <Pressable 
            style={[styles.nearMeToggle, nearMeActive && styles.nearMeToggleActive]}
            onPress={() => setNearMeActive(!nearMeActive)}
          >
            <Navigation size={18} color={nearMeActive ? "#043529" : "#00ea6b"} />
            <Text style={[styles.nearMeText, nearMeActive && styles.nearMeTextActive]}>Near Me</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {/* Map Section */}
        <View style={styles.mapCard}>
          {isWeb ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: 16 }}
              loading="lazy"
              allowFullScreen
              src={freeMapEmbed}
            />
          ) : (
            <View style={styles.nativeMapPlaceholder}>
              <View style={styles.nativeMapIcon}>
                <Navigation size={40} color="rgba(0,234,107,0.3)" />
              </View>
              <Text style={styles.nativeMapText}>Pinpoint locations on the dynamic map</Text>
              <Pressable 
                style={styles.nativeMapButton}
                onPress={() => {
                  const q = encodeURIComponent(focusedGround ? `${focusedGround.name} ${focusedGround.city}` : "Cricket grounds near me");
                   const url = Platform.select({
                    ios: `maps:0,0?q=${q}`,
                    android: `geo:0,0?q=${q}`,
                    default: `https://www.google.com/maps/search/?api=1&query=${q}`
                  });
                  // @ts-ignore
                  import('react-native').then(rn => rn.Linking.openURL(url));
                }}
              >
                <Text style={styles.nativeMapButtonText}>Open in Google Maps</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Grounds List Section */}
        <View style={styles.listContainer}>
          <ScrollView
            horizontal={!isWeb}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredGrounds.map((ground) => {
              const isFocused = ground.id === focusedGroundId;
              return (
                <Pressable
                  key={ground.id}
                  style={styles.groundItem}
                  onPress={() => setFocusedGroundId(ground.id)}
                >
                  <Card style={[styles.itemCard, isFocused && styles.itemCardFocused]}>
                    <View style={styles.itemRow}>
                      <Image 
                        source={{ uri: ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' }} 
                        style={styles.itemImage} 
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>{ground.name}</Text>
                        <Text style={styles.itemCity}>{ground.city}</Text>
                        
                        <TouchableOpacity 
                          style={styles.locationLink}
                          onPress={() => {
                            const q = encodeURIComponent(`${ground.name}, ${ground.city}, ${ground.state}`);
                            const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
                            Linking.openURL(url);
                          }}
                        >
                          <MapPin size={12} color="#10b981" />
                          <Text style={styles.locationLinkText}>View on Map</Text>
                        </TouchableOpacity>
                      </View>
                      <Pressable 
                        onPress={() => router.push(makeGroundPath(ground) as any)}
                        style={styles.itemAction}
                      >
                         <ChevronRight size={20} color={isFocused ? "#10b981" : "#9CA3AF"} />
                      </Pressable>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>

          
          <Pressable 
            style={styles.viewMoreRow}
            onPress={() => router.push('/(tabs)/grounds' as any)}
          >
            <Text style={styles.viewMoreText}>View all grounds</Text>
            <ChevronRight size={16} color="#00ea6b" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    backgroundColor: Platform.OS === 'web' ? '#F9FAFB' : '#043529',
  },
  loader: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Inter',
    color: Platform.OS === 'web' ? '#111827' : '#00ea6b',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: Platform.OS === 'web' ? '#6B7280' : '#9CA3AF',
    marginTop: 4,
  },
  content: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 0,
    gap: 20,
  },
  mapCard: {
    flex: 3,
    height: 450,
    backgroundColor: Platform.OS === 'web' ? '#FFF' : '#06392e',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.15)',
    overflow: 'hidden',
    marginHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  listContainer: {
    flex: 2,
    gap: 12,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: 8,
    gap: 12,
  },
  groundItem: {
    width: Platform.OS === 'web' ? '100%' : 260,
  },
  itemCard: {
    padding: 16,
    backgroundColor: Platform.OS === 'web' ? '#FFF' : '#06392e',
    borderRadius: 16,
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      } as any,
    }),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  itemCardFocused: {
    transform: Platform.OS === 'web' ? [{ scale: 1.02 }, { translateY: -2 }] : [],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  locationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    textDecorationLine: 'underline',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#111827' : '#F9FAFB',
  },
  itemCity: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  itemAction: {
    padding: 4,
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
  },
  nativeMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  nativeMapIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeMapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  nativeMapButton: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nativeMapButtonText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 15,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  searchBAR: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? '#FFF' : '#06392e',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.1)',
  },
  searchINPUT: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    color: Platform.OS === 'web' ? '#111827' : '#00ea6b',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  nearMeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 234, 107, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.2)',
  },
  nearMeToggleActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  nearMeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
  },
  nearMeTextActive: {
    color: '#043529',
  },
});
