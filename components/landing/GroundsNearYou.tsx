import React, { useEffect, useState, useMemo } from 'react';
import { MapPin, Navigation, Map as MapIcon, ChevronRight, Search, ExternalLink, Star } from 'lucide-react-native';
import { View, Text, StyleSheet, Platform, Pressable, ScrollView, ActivityIndicator, TextInput, Image, Linking, TouchableOpacity, useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { router } from 'expo-router';
import { makeGroundPath } from '@/utils/groundSlug';
import Card from '@/components/ui/Card';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow,
  useMap,
  useMapsLibrary,
  ControlPosition
} from '@vis.gl/react-google-maps';

const MAP_ID = "DEMO_MAP_ID"; // Required for Advanced Markers
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const CLEAN_MAP_STYLES = [
  {
    "featureType": "all",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "water",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "lightness": 100 }, { "visibility": "simplified" }]
  }
];

function MultiMarkerMap({ 
  grounds, 
  focusedGroundId, 
  onMarkerClick,
  userLocation
}: { 
  grounds: GroundWithImages[], 
  focusedGroundId: string | null,
  onMarkerClick: (id: string) => void,
  userLocation: {lat: number, lng: number} | null
}) {
  const map = useMap();
  const geocodingLibrary = useMapsLibrary('geocoding');
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);
  const [hoveredGroundId, setHoveredGroundId] = useState<string | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    if (focusedGroundId && map) {
      const g = grounds.find(x => x.id === focusedGroundId);
      const coords = resolvedCoords[focusedGroundId] || (g?.latitude && g?.longitude ? { lat: Number(g.latitude), lng: Number(g.longitude) } : null);
      
      if (coords) {
        map.panTo(coords);
        map.setZoom(15);
      }
    }
  }, [focusedGroundId, map, resolvedCoords]);

  // Auto-fit all markers if on small screen or no focus
  useEffect(() => {
    if (map && grounds.length > 0 && !focusedGroundId) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoords = false;
      
      grounds.forEach(g => {
        const lat = parseFloat(g.latitude) || resolvedCoords[g.id]?.lat;
        const lng = parseFloat(g.longitude) || resolvedCoords[g.id]?.lng;
        if (lat && lng) {
          bounds.extend({ lat, lng });
          hasValidCoords = true;
        }
      });
      
      if (hasValidCoords) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    }
  }, [map, grounds, resolvedCoords, focusedGroundId]);

  // Pan to user location when first detected (if no markers or focus)
  useEffect(() => {
    if (userLocation && map && !focusedGroundId && grounds.length === 0) {
      map.panTo(userLocation);
      map.setZoom(11);
    }
  }, [userLocation, map, grounds.length]);

  // Geocode grounds missing coordinates
  useEffect(() => {
    if (!geocodingLibrary) return;

    const groundsToGeocode = grounds.filter(g => {
      const lat = parseFloat(g.latitude);
      const lng = parseFloat(g.longitude);
      return (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) && !resolvedCoords[g.id];
    });

    if (groundsToGeocode.length === 0) return;

    const geocoder = new geocodingLibrary.Geocoder();
    
    groundsToGeocode.forEach((g) => {
      const address = `${g.name}, ${g.address}, ${g.city}, ${g.state}`;
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          setResolvedCoords(prev => ({
            ...prev,
            [g.id]: { lat: loc.lat(), lng: loc.lng() }
          }));
        } else {
          console.warn(`Geocoding failed for ${g.name}:`, status);
        }
      });
    });
  }, [grounds, geocodingLibrary]);

  const defaultCenter = userLocation || { lat: 28.4595, lng: 77.0266 }; // Gurgaon default

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Global SVG Definitions to prevent insertBefore errors */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="neonPinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#d8f79d', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#bfff49', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#00fd73', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={defaultCenter}
        defaultZoom={10}
        mapId={MAP_ID}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        clickableIcons={false}
      >
        {grounds.map((g) => {
          let lat = parseFloat(g.latitude);
          let lng = parseFloat(g.longitude);
          
          // Fallback to resolved coords if missing in DB
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            if (resolvedCoords[g.id]) {
              lat = resolvedCoords[g.id].lat;
              lng = resolvedCoords[g.id].lng;
            } else {
              return null;
            }
          }

          const isFocused = g.id === focusedGroundId;
          return (
            <React.Fragment key={g.id}>
              <AdvancedMarker
                position={{ lat, lng }}
                onClick={() => {
                  onMarkerClick(g.id);
                  setOpenInfoWindowId(g.id);
                }}
                onMouseEnter={() => setHoveredGroundId(g.id)}
                onMouseLeave={() => setHoveredGroundId(null)}
              >
                <View style={{
                  width: isFocused || hoveredGroundId === g.id ? 44 : 36,
                  height: isFocused || hoveredGroundId === g.id ? 44 : 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <path 
                      d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                      fill="url(#neonPinGradient)"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
                  </svg>
                </View>

                {/* Stable Hover Tooltip - always mounted to prevent child removal errors */}
                <View style={{
                  position: 'absolute',
                  bottom: 45,
                  left: -70,
                  width: 140,
                  backgroundColor: '#FFFFFF',
                  padding: 10,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 10,
                  // @ts-ignore - Web only property to prevent flicker
                  pointerEvents: 'none',
                  zIndex: 1000,
                  borderWidth: 1,
                  borderColor: '#F1F5F9',
                  opacity: (hoveredGroundId === g.id && openInfoWindowId !== g.id) ? 1 : 0,
                }}>
                <Text style={{ 
                  fontWeight: '800', 
                  fontSize: 13, 
                  color: '#0F172A', 
                  fontFamily: 'Inter', 
                  marginBottom: 4 
                }}>
                  {g.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} color="#10B981" />
                  <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter' }}>
                    {g.city}
                  </Text>
                </View>
                {/* Small Arrow */}
                <View style={{
                  position: 'absolute',
                  bottom: -6,
                  left: 70 - 6,
                  width: 12,
                  height: 12,
                  backgroundColor: '#FFFFFF',
                  transform: [{ rotate: '45deg' }],
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: '#F1F5F9',
                }} />
              </View>
            </AdvancedMarker>
            
            {openInfoWindowId === g.id && (
              <InfoWindow
                position={{ lat, lng }}
                pixelOffset={[0, -15]}
                onCloseClick={() => setOpenInfoWindowId(null)}
                headerDisabled={true}
              >
                <View style={{ padding: 4, minWidth: 140 }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: '#0F172A', fontFamily: 'Inter', marginBottom: 2 }}>
                    {g.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} color="#64748B" />
                    <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter' }}>
                      {g.city}
                    </Text>
                  </View>
                </View>
              </InfoWindow>
            )}
          </React.Fragment>
        );
      })}
      </Map>
    </View>
  );
}

export default function GroundsNearYou() {
  const { width } = useWindowDimensions();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedGroundId, setFocusedGroundId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const isSmallScreen = width < 1024;
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadGrounds();
    loadLocations();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.log("Geolocation permission denied or error:", err);
        }
      );
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setAllLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const loadGrounds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating)
        `)
        .eq('active', true)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const sorted = (data as any[]) || [];
      const withReviews = sorted.map(g => {
        const reviews = (g.reviews || []) as { rating: number }[];
        const avg = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0;
        return { ...g, _avgRating: avg, _reviewsCount: reviews.length };
      });
      setGrounds(withReviews);
    } catch (err) {
      console.error('Error loading nearby grounds:', err);
    } finally {
      setLoading(false);
    }
  };



  const filteredGrounds = useMemo(() => {
    let result = [...grounds];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.city.toLowerCase().includes(q)
      );
    }

    if (userLocation) {
       // Filter and Sort by distance if location available
       // 30km is roughly 0.27 degrees (very rough approximation for filtering)
       const RADIUS_30KM = 0.27; 
       
       result = result.filter(g => {
         if (!g.latitude || !g.longitude) return true; // keep if no coords for now
         const dist = Math.sqrt(Math.pow(Number(g.latitude) - userLocation.lat, 2) + Math.pow(Number(g.longitude) - userLocation.lng, 2));
         return dist <= RADIUS_30KM;
       });

       result.sort((a, b) => {
         if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return 0;
         const distA = Math.sqrt(Math.pow(Number(a.latitude) - userLocation.lat, 2) + Math.pow(Number(a.longitude) - userLocation.lng, 2));
         const distB = Math.sqrt(Math.pow(Number(b.latitude) - userLocation.lat, 2) + Math.pow(Number(b.longitude) - userLocation.lng, 2));
         return distA - distB;
       });
    }

    if (locationFilter !== 'all') {
      result = result.filter(g => g.city === locationFilter);
    }
    
    return result.slice(0, 6);
  }, [grounds, searchQuery, locationFilter, userLocation]);

  const focusedGround = useMemo(() => 
    filteredGrounds.find(g => g.id === focusedGroundId), 
  [filteredGrounds, focusedGroundId]);

  const freeMapEmbed = useMemo(() => {
    if (!focusedGround) {
      if (userLocation) {
        return `https://maps.google.com/maps?q=Cricket+grounds+near+${userLocation.lat},${userLocation.lng}&t=&z=12&ie=UTF8&iwloc=&output=embed`;
      }
      return `https://maps.google.com/maps?q=${encodeURIComponent("Cricket grounds near me")}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }
    const q = `${focusedGround.name}, ${focusedGround.address}, ${focusedGround.city}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
  }, [focusedGround, userLocation]);

  const locationOptions = useMemo(() => {
    return ['all', ...allLocations.map(loc => loc.city)];
  }, [allLocations]);

  function LocalFilterDropdown({
    options,
    value,
    onChange,
  }: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
  }) {
    const [open, setOpen] = useState(false);
    const display = (v: string) => (v === 'all' ? 'All Locations' : v);

    return (
      <View style={[styles.dropdownOuter, { zIndex: 100 }]}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={[styles.dropdownButton, open && styles.dropdownButtonOpen]}
        >
          <Text style={styles.dropdownButtonText} numberOfLines={1}>{display(value)}</Text>
          <ChevronRight 
            size={14} 
            color="#9CA3AF" 
            style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }} 
          />
        </Pressable>

        {open ? (
          <>
            <Pressable 
              style={styles.dropdownBackdrop} 
              onPress={() => setOpen(false)} 
            />
            <View style={styles.dropdownMenu}>
              <ScrollView style={{ maxHeight: 200 }}>
                {options.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    style={[
                      styles.dropdownOption,
                      opt === value && styles.dropdownOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        opt === value && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {display(opt)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  if (loading) {
     return (
       <View style={styles.loader}>
         <ActivityIndicator color="#01e669" />
       </View>
     );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerContentRow, isSmallScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={styles.titleSection}>
            <View style={styles.iconCircle}>
              <MapIcon size={20} color="#01e669" />
            </View>
            <View>
              <Text style={styles.title}>Venues Near You</Text>
            </View>
          </View>

          <View style={[styles.headerControlsRow, isSmallScreen && { justifyContent: 'flex-start', width: '100%' }]}>
            <View style={[styles.locationDropdownWrapper, isSmallScreen && { width: '48%', flex: 1 }]}>
              <LocalFilterDropdown
                options={locationOptions}
                value={locationFilter}
                onChange={setLocationFilter}
              />
            </View>

            <View style={[styles.headerSearchWrapper, isSmallScreen && { width: '48%', flex: 1 }]}>
              <View style={styles.searchBAR}>
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchINPUT}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.content, (isSmallScreen || !isWeb) && { flexDirection: 'column' }]}>
        {/* Map Section */}
        <View style={[styles.mapCard, isSmallScreen && { height: 350 }]}>
          {isWeb ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <MultiMarkerMap 
                grounds={filteredGrounds} 
                focusedGroundId={focusedGroundId}
                onMarkerClick={setFocusedGroundId}
                userLocation={userLocation}
              />
            </APIProvider>
          ) : (
            <View style={styles.nativeMapPlaceholder}>
              <View style={styles.nativeMapIcon}>
                <Navigation size={40} color="rgba(1, 230, 105, 0.3)" />
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
                        <Text style={styles.itemCity}>{ground.city} • {ground.pitch_type || 'Standard'}</Text>
                        
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

                        <View style={styles.ratingRow}>
                          <Star size={10} color="#FFA000" fill="#FFA000" />
                          <Text style={styles.ratingText}>
                            {ground._avgRating > 0 
                              ? `${ground._avgRating.toFixed(1)} (${ground._reviewsCount})`
                              : 'New'}
                          </Text>
                        </View>
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
            onPress={() => router.push('/book-my-ground' as any)}
          >
            <Text style={styles.viewMoreText}>View all venues</Text>
            <ChevronRight size={16} color="#01e669" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    backgroundColor: '#F8FAFC',
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
    zIndex: 50,
    position: 'relative',
    overflow: 'visible',
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
    backgroundColor: 'rgba(1, 230, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Inter',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#64748B',
    marginTop: 2,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  listContainer: {
    flex: 2,
    gap: 12,
    ...Platform.select({
      web: {
        height: 450,
      }
    })
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 16,
    paddingBottom: 12,
    gap: 12,
  },
  groundItem: {
    width: Platform.OS === 'web' ? '100%' : 260,
  },
  itemCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      } as any,
    }),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemCardFocused: {
    transform: Platform.OS === 'web' ? [{ scale: 1.02 }, { translateY: -2 }] : [],
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    backgroundColor: '#FFFFFF',
    borderColor: '#01e669',
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
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
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  itemCity: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
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
    fontWeight: '600',
    color: '#01e669',
    fontFamily: 'Inter',
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
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nativeMapButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: 'Inter',
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    zIndex: 60,
    position: 'relative',
    overflow: 'visible',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 200,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    zIndex: 200,
    overflow: 'visible',
    position: 'relative',
    flex: 1,
    justifyContent: 'flex-end',
  },
  locationDropdownWrapper: {
    width: Platform.OS === 'web' ? 180 : '100%',
    zIndex: 300,
  },
  headerSearchWrapper: {
    width: Platform.OS === 'web' ? 240 : '100%',
    maxWidth: 400,
    zIndex: 100,
  },
  dropdownOuter: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' }
    }) as any,
  },
  dropdownButtonOpen: {
    borderColor: '#10B981',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownOptionTextActive: {
    color: '#10B981',
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  searchBAR: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' }
    }) as any,
  },
  searchINPUT: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
    fontFamily: 'Inter',
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  dropdownBackdrop: {
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    top: Platform.OS === 'web' ? 0 : -1000,
    left: Platform.OS === 'web' ? 0 : -1000,
    right: Platform.OS === 'web' ? 0 : -1000,
    bottom: Platform.OS === 'web' ? 0 : -1000,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
