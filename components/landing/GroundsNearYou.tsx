import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  Map as MapIcon, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Search, 
  ExternalLink, 
  Star, 
  Share2, 
  Heart,
  SlidersHorizontal,
  X
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  Image, 
  Linking, 
  TouchableOpacity, 
  useWindowDimensions,
  Share
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { router } from 'expo-router';
import { makeGroundPath } from '@/utils/groundSlug';
import Card from '@/components/ui/Card';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';

const MAP_ID = "DEMO_MAP_ID"; // Required for Advanced Markers
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Amenities Generator
const getAmenities = (ground: any) => {
  const list = ['Washroom', 'Parking'];
  const nameLower = (ground.name || '').toLowerCase();
  const typeLower = (ground.pitch_type || '').toLowerCase();
  
  if (nameLower.includes('stadium') || nameLower.includes('trance') || nameLower.includes('colosseum') || nameLower.includes('cricket')) {
    list.unshift('Pavilion');
    list.push('Sight Screen');
  }
  if (nameLower.includes('flood') || nameLower.includes('light') || typeLower.includes('box')) {
    list.push('Flood Lights');
  }
  if (typeLower.includes('net') || nameLower.includes('net')) {
    list.push('Net Practice');
  }
  if (list.length < 3) {
    list.push('Sight Screen');
  }
  return Array.from(new Set(list));
};

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

  // Zoom out map to show exactly 40 km radius around userLocation when there is no focused ground
  useEffect(() => {
    if (map && userLocation && !focusedGroundId) {
      const bounds = new google.maps.LatLngBounds();
      // 40 km latitude delta = 40 / 111 = ~0.36 degrees
      const latDelta = 40 / 111.0;
      // 40 km longitude delta = 40 / (111 * cos(lat))
      const lngDelta = 40 / (111.0 * Math.cos(userLocation.lat * Math.PI / 180));
      
      const southWest = {
        lat: userLocation.lat - latDelta,
        lng: userLocation.lng - lngDelta
      };
      const northEast = {
        lat: userLocation.lat + latDelta,
        lng: userLocation.lng + lngDelta
      };
      
      bounds.extend(southWest);
      bounds.extend(northEast);
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
    }
  }, [map, userLocation, focusedGroundId]);

  // Fallback auto-fit regional Gurgaon bounds if userLocation is missing and no focused ground
  useEffect(() => {
    if (map && grounds.length > 0 && !focusedGroundId && !userLocation) {
      const bounds = new google.maps.LatLngBounds();
      const center = { lat: 28.4595, lng: 77.0266 };
      const latDelta = 40 / 111.0;
      const lngDelta = 40 / (111.0 * Math.cos(center.lat * Math.PI / 180));
      
      const southWest = {
        lat: center.lat - latDelta,
        lng: center.lng - lngDelta
      };
      const northEast = {
        lat: center.lat + latDelta,
        lng: center.lng + lngDelta
      };
      
      bounds.extend(southWest);
      bounds.extend(northEast);
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
    }
  }, [map, grounds, focusedGroundId, userLocation]);

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
        }
      });
    });
  }, [grounds, geocodingLibrary]);

  const defaultCenter = userLocation || { lat: 28.4595, lng: 77.0266 };

  return (
    <View style={{ flex: 1, position: 'relative' }}>


      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={defaultCenter}
        defaultZoom={8}
        mapId={MAP_ID}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        clickableIcons={false}
      >
        {grounds.map((g) => {
          let lat = parseFloat(g.latitude);
          let lng = parseFloat(g.longitude);
          
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            if (resolvedCoords[g.id]) {
              lat = resolvedCoords[g.id].lat;
              lng = resolvedCoords[g.id].lng;
            } else {
              return null;
            }
          }

          const isFocused = g.id === focusedGroundId;
          const isHovered = g.id === hoveredGroundId;
          
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
                {/* Premium Neon Gradient Pin matching detail page */}
                <View style={{
                  width: isFocused || isHovered ? 44 : 36,
                  height: isFocused || isHovered ? 44 : 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <defs>
                      <linearGradient id={`neonPinGradientDetail-${g.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#d8f79d', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#bfff49', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#00fd73', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                      fill={`url(#neonPinGradientDetail-${g.id})`}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
                  </svg>
                </View>

                {/* stable hover tooltip */}
                <View style={{
                  position: 'absolute',
                  bottom: 30,
                  left: -70,
                  width: 140,
                  backgroundColor: '#FFFFFF',
                  padding: 8,
                  borderRadius: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  opacity: (isHovered && openInfoWindowId !== g.id) ? 1 : 0,
                  zIndex: 9999,
                }}>
                  <Text style={{ fontWeight: '800', fontSize: 12, color: '#0F172A', fontFamily: 'Inter', marginBottom: 2 }}>
                    {g.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748B', fontFamily: 'Inter' }}>
                    {g.city}
                  </Text>
                </View>
              </AdvancedMarker>
              
              {openInfoWindowId === g.id && (
                <InfoWindow
                  position={{ lat, lng }}
                  pixelOffset={[0, -10]}
                  onCloseClick={() => setOpenInfoWindowId(null)}
                  headerDisabled={true}
                >
                  <View style={{ padding: 4, minWidth: 120 }}>
                    <Text style={{ fontWeight: '800', fontSize: 12, color: '#0F172A', fontFamily: 'Inter', marginBottom: 2 }}>
                      {g.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748B', fontFamily: 'Inter' }}>
                      {g.city}
                    </Text>
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
  const isSmallScreen = width < 1024;
  const isWeb = Platform.OS === 'web';

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedGroundId, setFocusedGroundId] = useState<string | null>(null);
  
  // Geolocation User Location state
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Navigation & Toggle States
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Accordion Filters State
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

  // Filter Categories State Values
  const [filterGroundName, setFilterGroundName] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [filterTiming, setFilterTiming] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterPriceRange, setFilterPriceRange] = useState<string>('all');
  const [filterBookingType, setFilterBookingType] = useState<string>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 3;

  useEffect(() => {
    loadGrounds();
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
          console.log("Geolocation permission error/denied:", err);
          // Default user location (Gurugram/NCR region) if geolocation is denied or unavailable
          setUserLocation({ lat: 28.4595, lng: 77.0266 });
        }
      );
    } else {
      setUserLocation({ lat: 28.4595, lng: 77.0266 });
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
        .limit(30);

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

  // Dynamic Date Formatting
  const formatSelectedDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    return `${dayName}, ${monthName} ${dayNum}`;
  };

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = async (ground: any) => {
    try {
      const url = `https://bookyourground.com/ground/${ground.city}/${ground.name}`;
      await Share.share({
        message: `Check out ${ground.name} in ${ground.city} on BookYourGround!`,
        url: url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilterGroundName('');
    setFilterArea('all');
    setFilterAvailability('all');
    setFilterTiming('all');
    setFilterRating('all');
    setFilterPriceRange('all');
    setFilterBookingType('all');
    setSelectedAmenities([]);
    setExpandedAccordion(null);
  };

  // Areas Loaded dynamically
  const areas = useMemo(() => {
    const list = grounds.map(g => g.city).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [grounds]);

  // Real-time Filtering Engine
  const filteredGrounds = useMemo(() => {
    return grounds.filter(g => {
      // 0. Proximity filter (Strict 40 km radius from user's current location)
      if (userLocation) {
        const lat = parseFloat(g.latitude);
        const lng = parseFloat(g.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          const R = 6371; // Radius of earth in km
          const dLat = (lat - userLocation.lat) * Math.PI / 180;
          const dLon = (lng - userLocation.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          
          if (distance > 40) return false; // Exclude venues outside 40km radius
        }
      }

      // 1. Ground Name
      if (filterGroundName.trim()) {
        const q = filterGroundName.toLowerCase();
        if (!g.name.toLowerCase().includes(q)) return false;
      }
      
      // 2. Area Name
      if (filterArea !== 'all') {
        if (g.city !== filterArea) return false;
      }
      
      // 3. Slot Availability
      if (filterAvailability !== 'all') {
        const isOdd = g.id.charCodeAt(0) % 2 === 0;
        if (filterAvailability === 'available' && !isOdd) return false;
        if (filterAvailability === 'booked' && isOdd) return false;
      }

      // 4. Slot Timings
      if (filterTiming !== 'all') {
        const code = g.id.charCodeAt(g.id.length - 1) % 4;
        const timingCode = filterTiming === 'morning' ? 0 : filterTiming === 'midday' ? 1 : filterTiming === 'afternoon' ? 2 : 3;
        if (code !== timingCode) return false;
      }
      
      // 5. Star Rating
      if (filterRating !== 'all') {
        const rating = g._avgRating || 3.8;
        if (filterRating === '4.0+' && rating < 4.0) return false;
        if (filterRating === '3.0+' && rating < 3.0) return false;
      }
      
      // 6. Price
      if (filterPriceRange !== 'all') {
        const price = g.min_price || g.base_price_per_hour || 0;
        if (filterPriceRange === 'under_1000' && price >= 1000) return false;
        if (filterPriceRange === '1000_2000' && (price < 1000 || price > 2000)) return false;
        if (filterPriceRange === 'over_2000' && price <= 2000) return false;
      }
      
      // 7. Booking Type
      if (filterBookingType !== 'all') {
        const type = (g.pitch_type || '').toLowerCase();
        if (filterBookingType === 'stadium' && !type.includes('stadium') && !g.name.toLowerCase().includes('stadium')) return false;
        if (filterBookingType === 'box' && !type.includes('box')) return false;
        if (filterBookingType === 'nets' && !type.includes('net')) return false;
      }
      
      // 8. Amenities
      if (selectedAmenities.length > 0) {
        const groundAmenities = getAmenities(g);
        const hasAll = selectedAmenities.every(a => groundAmenities.includes(a));
        if (!hasAll) return false;
      }
      
      return true;
    });
  }, [
    grounds, 
    userLocation,
    filterGroundName, 
    filterArea, 
    filterAvailability,
    filterTiming,
    filterRating, 
    filterPriceRange, 
    filterBookingType, 
    selectedAmenities
  ]);

  // Reset focused ground and page if list changes
  useEffect(() => {
    setFocusedGroundId(null);
    setCurrentPage(1);
  }, [filteredGrounds]);

  // Pagination Math
  const totalPages = Math.ceil(filteredGrounds.length / itemsPerPage) || 1;
  const paginatedGrounds = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGrounds.slice(start, start + itemsPerPage);
  }, [filteredGrounds, currentPage, itemsPerPage]);

  const startIdx = filteredGrounds.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredGrounds.length);

  const toggleAccordion = (name: string) => {
    setExpandedAccordion(prev => prev === name ? null : name);
  };

  // Helper to Render Accordion Filter Item
  const renderAccordionItem = (name: string, title: string, content: React.ReactNode) => {
    const isExpanded = expandedAccordion === name;
    return (
      <View style={styles.accordionContainer} key={name}>
        <TouchableOpacity 
          style={styles.accordionHeader} 
          activeOpacity={0.7}
          onPress={() => toggleAccordion(name)}
        >
          <Text style={[styles.accordionTitle, isExpanded && styles.accordionTitleActive]}>
            {title}
          </Text>
          <ChevronDown 
            size={18} 
            color="#0F172A" 
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} 
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.accordionContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  // Render filter drawer shared between views
  const renderFiltersDrawer = () => (
    <View style={styles.filtersDrawer}>
      <View style={styles.filterHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowFiltersDrawer(false)}>
            <ChevronLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.filterDrawerTitle}>Filters</Text>
        </View>
        
        <TouchableOpacity onPress={handleResetFilters}>
          <Text style={styles.resetBtnText}>RESET</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.filterSubtitle}>
        Showing {startIdx} - {endIdx} of {filteredGrounds.length} venues
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.filterAccordionScroll}>
        
        {/* Accordion 1: Ground Name */}
        {renderAccordionItem('ground_name', 'Ground Name', (
          <TextInput
            style={styles.filterInput}
            placeholder="Search by ground name..."
            placeholderTextColor="#94A3B8"
            value={filterGroundName}
            onChangeText={setFilterGroundName}
          />
        ))}

        {/* Accordion 2: Area Name */}
        {renderAccordionItem('area_name', 'Area Name', (
          <View style={styles.filterPillGroup}>
            {areas.map(area => (
              <TouchableOpacity
                key={area}
                style={[styles.filterPill, filterArea === area && styles.filterPillActive]}
                onPress={() => setFilterArea(area)}
              >
                <Text style={[styles.filterPillText, filterArea === area && styles.filterPillTextActive]}>
                  {area === 'all' ? 'All Areas' : area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 3: Slot Availability */}
        {renderAccordionItem('slot_avail', 'Slot Availability', (
          <View style={styles.filterPillGroup}>
            {['all', 'available', 'booked'].map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.filterPill, filterAvailability === mode && styles.filterPillActive]}
                onPress={() => setFilterAvailability(mode)}
              >
                <Text style={[styles.filterPillText, filterAvailability === mode && styles.filterPillTextActive]}>
                  {mode === 'all' ? 'Any' : mode === 'available' ? 'Available' : 'Booked'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 4: Slot Timings */}
        {renderAccordionItem('slot_timings', 'Slot Timings', (
          <View style={styles.filterPillGroup}>
            {['all', 'morning', 'midday', 'afternoon', 'night'].map(time => (
              <TouchableOpacity
                key={time}
                style={[styles.filterPill, filterTiming === time && styles.filterPillActive]}
                onPress={() => setFilterTiming(time)}
              >
                <Text style={[styles.filterPillText, filterTiming === time && styles.filterPillTextActive]}>
                  {time === 'all' ? 'Any Time' : time.charAt(0).toUpperCase() + time.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 5: Star Rating */}
        {renderAccordionItem('star_rating', 'Star Rating: 0.0 - 5.0', (
          <View style={styles.filterPillGroup}>
            {['all', '4.0+', '3.0+'].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[styles.filterPill, filterRating === rating && styles.filterPillActive]}
                onPress={() => setFilterRating(rating)}
              >
                <Text style={[styles.filterPillText, filterRating === rating && styles.filterPillTextActive]}>
                  {rating === 'all' ? 'All Ratings' : `${rating} ★`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 6: Price */}
        {renderAccordionItem('price', 'Price', (
          <View style={styles.filterPillGroup}>
            {[
              { value: 'all', label: 'All Prices' },
              { value: 'under_1000', label: 'Under ₹1,000' },
              { value: '1000_2000', label: '₹1,000 - ₹2,000' },
              { value: 'over_2000', label: 'Over ₹2,000' }
            ].map(range => (
              <TouchableOpacity
                key={range.value}
                style={[styles.filterPill, filterPriceRange === range.value && styles.filterPillActive]}
                onPress={() => setFilterPriceRange(range.value)}
              >
                <Text style={[styles.filterPillText, filterPriceRange === range.value && styles.filterPillTextActive]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 7: Booking Type */}
        {renderAccordionItem('booking_type', 'Booking Type', (
          <View style={styles.filterPillGroup}>
            {[
              { value: 'all', label: 'All Types' },
              { value: 'stadium', label: 'Stadium' },
              { value: 'box', label: 'Box Cricket' },
              { value: 'nets', label: 'Net Practice' }
            ].map(type => (
              <TouchableOpacity
                key={type.value}
                style={[styles.filterPill, filterBookingType === type.value && styles.filterPillActive]}
                onPress={() => setFilterBookingType(type.value)}
              >
                <Text style={[styles.filterPillText, filterBookingType === type.value && styles.filterPillTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Accordion 8: Amenities */}
        {renderAccordionItem('amenities', 'Amenities', (
          <View style={styles.filterPillGroup}>
            {['Pavilion', 'Washroom', 'Sight Screen', 'Flood Lights', 'Net Practice', 'Parking'].map(amenity => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
                    } else {
                      setSelectedAmenities(prev => [...prev, amenity]);
                    }
                  }}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {amenity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

      </ScrollView>

      {/* Apply/Done action button */}
      <TouchableOpacity 
        style={styles.applyFilterBtn}
        onPress={() => setShowFiltersDrawer(false)}
      >
        <Text style={styles.applyFilterBtnText}>Apply & Close</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#01b854" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER / ACTION BAR */}
      <View style={styles.topBar}>
        <View style={styles.tabsContainer}>
          {/* Map/List Switcher Group */}
          <View style={styles.toggleGroup}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
                List
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filters Button */}
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.filterBtn, showFiltersDrawer && styles.filterBtnSelected]}
            onPress={() => setShowFiltersDrawer(prev => !prev)}
          >
            <SlidersHorizontal size={14} color={showFiltersDrawer ? "#FFFFFF" : "#475569"} style={{ marginRight: 6 }} />
            <Text style={[styles.filterBtnText, showFiltersDrawer && { color: '#FFFFFF' }]}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Date Selector with Next/Prev Arrows */}
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.arrowBtn}
            onPress={handlePrevDate}
          >
            <ChevronLeft size={16} color="#475569" />
          </TouchableOpacity>

          <Text style={styles.dateText}>
            {formatSelectedDate(selectedDate)}
          </Text>

          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.arrowBtn}
            onPress={handleNextDate}
          >
            <ChevronRight size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SPLIT LAYOUT / MAIN DISPLAY */}
      {viewMode === 'map' ? (
        <View style={[styles.mainLayout, isSmallScreen && { flexDirection: 'column', height: 'auto' }]}>
          
          {/* Left panel: Venue List OR Slide-out Accordion Filters Drawer */}
          <View style={[styles.leftPanel, isSmallScreen && { width: '100%', height: 'auto', marginBottom: 20 }]}>
            
            {showFiltersDrawer ? (
              renderFiltersDrawer()
            ) : (
              /* ================= STANDARD MAP LIST PANEL ================= */
              <>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>
                    {filteredGrounds.length} Venues Found
                  </Text>
                </View>

                {filteredGrounds.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No venues match your active filters.</Text>
                    <TouchableOpacity onPress={handleResetFilters} style={styles.resetLink}>
                      <Text style={styles.resetLinkText}>Reset Filters</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    style={styles.cardScroll}
                    contentContainerStyle={{ gap: 16 }}
                  >
                    {paginatedGrounds.map((ground) => {
                      const isFocused = ground.id === focusedGroundId;
                      const groundImg = ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
                      const rating = ground._avgRating ? ground._avgRating.toFixed(1) : '3.8';
                      const amenities = getAmenities(ground);

                      return (
                        <View 
                          key={ground.id} 
                          style={[styles.venueCard, isFocused && styles.venueCardFocused]}
                        >
                          <Image source={{ uri: groundImg }} style={styles.cardImage} />
                          
                          <View style={styles.cardBody}>
                            <View style={styles.cardTitleRow}>
                              <Text style={styles.cardTitle} numberOfLines={1}>
                                {ground.name}
                              </Text>
                              <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => handleShare(ground)}>
                                  <Share2 size={16} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => toggleFavorite(ground.id)}>
                                  <Heart 
                                    size={16} 
                                    color={favorites[ground.id] ? "#EF4444" : "#64748B"} 
                                    fill={favorites[ground.id] ? "#EF4444" : "transparent"} 
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>

                            <View style={styles.cardLocRow}>
                              <MapPin size={12} color="#64748B" />
                              <Text style={styles.cardLocText} numberOfLines={1}>
                                {ground.address || `${ground.city}, ${ground.state}`}
                              </Text>
                            </View>

                            <View style={styles.cardRatingRow}>
                              <Star size={12} color="#FFA000" fill="#FFA000" />
                              <Text style={styles.cardRatingText}>
                                {rating}
                              </Text>
                            </View>

                            {/* Amenities Pills */}
                            <View style={styles.amenitiesRow}>
                              {amenities.slice(0, 3).map((amenity, index) => (
                                <View key={index} style={styles.amenityTag}>
                                  <Text style={styles.amenityCheck}>✓</Text>
                                  <Text style={styles.amenityText}>{amenity}</Text>
                                </View>
                              ))}
                              {amenities.length > 3 && (
                                <Text style={styles.amenityMore}>+{amenities.length - 3} more</Text>
                              )}
                            </View>

                            {/* Locate Button - styled elegantly using brand primary green */}
                            <TouchableOpacity 
                              activeOpacity={0.8}
                              style={styles.locateBtn}
                              onPress={() => {
                                setFocusedGroundId(ground.id);
                              }}
                            >
                              <MapPin size={14} color="#01b854" />
                              <Text style={styles.locateBtnText}>Locate</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>

          {/* Right panel: Google Map */}
          <View style={[styles.rightPanel, isSmallScreen && { width: '100%', height: 400 }]}>
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
                <Navigation size={40} color="rgba(1, 184, 84, 0.3)" style={{ marginBottom: 12 }} />
                <Text style={styles.nativeMapText}>Interactive Map is optimized for Web</Text>
                <TouchableOpacity 
                  style={styles.nativeMapBtn}
                  onPress={() => {
                    const focused = filteredGrounds.find(g => g.id === focusedGroundId) || filteredGrounds[0];
                    if (focused) {
                      const q = encodeURIComponent(`${focused.name}, ${focused.city}`);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                    }
                  }}
                >
                  <Text style={styles.nativeMapBtnText}>Open in Google Maps</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ================= LIST VIEW MODE (Beautiful grid explorer) ================= */
        <View style={[styles.mainLayout, isSmallScreen && { flexDirection: 'column', height: 'auto' }]}>
          
          {/* Left panel (only visible if filters drawer is open) */}
          {showFiltersDrawer && (
            <View style={[styles.leftPanel, isSmallScreen && { width: '100%', height: 'auto', marginBottom: 20 }]}>
              {renderFiltersDrawer()}
            </View>
          )}

          {/* Grid Panel on the Right (occupies 100% if filters closed, 65% if open) */}
          <View style={[
            styles.rightPanel, 
            { backgroundColor: 'transparent', borderWidth: 0 },
            !showFiltersDrawer && { width: '100%' },
            isSmallScreen && { width: '100%', height: 'auto' }
          ]}>
            {filteredGrounds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No venues match your active filters.</Text>
                <TouchableOpacity onPress={handleResetFilters} style={styles.resetLink}>
                  <Text style={styles.resetLinkText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
                <View style={styles.gridView}>
                  {paginatedGrounds.map((ground) => {
                    const groundImg = ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
                    const rating = ground._avgRating ? ground._avgRating.toFixed(1) : '3.8';
                    const amenities = getAmenities(ground);
                    const cardWidth = showFiltersDrawer ? '48%' : '31.5%';

                    return (
                      <TouchableOpacity 
                        key={ground.id} 
                        style={[
                          styles.gridCard, 
                          { width: isSmallScreen ? '100%' : cardWidth }
                        ]}
                        activeOpacity={0.95}
                        onPress={() => router.push(makeGroundPath(ground) as any)}
                      >
                        <Image source={{ uri: groundImg }} style={styles.gridCardImage} />
                        <View style={styles.gridCardBody}>
                          <View style={styles.cardTitleRow}>
                            <Text style={styles.gridCardTitle} numberOfLines={1}>
                              {ground.name}
                            </Text>
                            <TouchableOpacity onPress={(e) => {
                              e.stopPropagation();
                              toggleFavorite(ground.id);
                            }}>
                              <Heart 
                                size={16} 
                                color={favorites[ground.id] ? "#EF4444" : "#64748B"} 
                                fill={favorites[ground.id] ? "#EF4444" : "transparent"} 
                              />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.cardLocRow}>
                            <MapPin size={12} color="#64748B" />
                            <Text style={styles.cardLocText} numberOfLines={1}>
                              {ground.address || `${ground.city}, ${ground.state}`}
                            </Text>
                          </View>

                          <View style={styles.gridCardMeta}>
                            <View style={styles.cardRatingRow}>
                              <Star size={12} color="#FFA000" fill="#FFA000" />
                              <Text style={styles.cardRatingText}>{rating}</Text>
                            </View>
                            <Text style={styles.gridPrice}>
                              ₹{ground.min_price || ground.base_price_per_hour || 0}
                              <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '400' }}>/match</Text>
                            </Text>
                          </View>

                          <View style={styles.amenitiesRow}>
                            {amenities.slice(0, 3).map((amenity, index) => (
                              <View key={index} style={styles.amenityTag}>
                                <Text style={styles.amenityCheck}>✓</Text>
                                <Text style={styles.amenityText}>{amenity}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* 3. PAGINATION ROW */}
      <View style={styles.paginationRow}>
        <Text style={styles.paginationText}>
          Showing {startIdx} - {endIdx} of {filteredGrounds.length} venues
        </Text>

        <View style={styles.paginationButtons}>
          <TouchableOpacity 
            style={[styles.pgBtn, currentPage === 1 && { opacity: 0.5 }]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            <Text style={styles.pgBtnText}>Previous</Text>
          </TouchableOpacity>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pgNum) => (
            <TouchableOpacity 
              key={pgNum} 
              style={[styles.pgBtn, currentPage === pgNum && styles.pgBtnActive]}
              onPress={() => setCurrentPage(pgNum)}
            >
              <Text style={[styles.pgBtnText, currentPage === pgNum && styles.pgBtnTextActive]}>
                {pgNum}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={[styles.pgBtn, currentPage === totalPages && { opacity: 0.5 }]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            <Text style={styles.pgBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  loader: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 8,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  toggleBtnTextActive: {
    color: '#0F172A',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  filterBtnSelected: {
    backgroundColor: '#043529', // Active Brand dark green button style
    borderColor: '#043529',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    minWidth: 100,
    textAlign: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    height: 500,
    gap: 20,
  },
  leftPanel: {
    width: '35%',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
  },
  panelHeader: {
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  cardScroll: {
    flex: 1,
  },
  venueCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  venueCardFocused: {
    borderColor: '#01b854', // brand primary green focus outline
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardLocText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    flex: 1,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Inter',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  amenityCheck: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: 'bold',
  },
  amenityText: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  amenityMore: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#01b854', // brand primary green
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 12,
    width: '100%',
  },
  locateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01b854', // brand primary green
    fontFamily: 'Inter',
  },
  rightPanel: {
    width: '65%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    height: '100%',
  },
  mapFloatingBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
  },
  mapFloatingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  nativeMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  nativeMapText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  nativeMapBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nativeMapBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  paginationText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pgBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  pgBtnActive: {
    backgroundColor: '#043529', // website brand dark green active color
    borderColor: '#043529',
  },
  pgBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  pgBtnTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    height: 500,
  },
  gridScroll: {
    paddingBottom: 20,
  },
  gridView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  gridCardBody: {
    padding: 16,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
  },
  gridCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#01b854',
    fontFamily: 'Inter',
  },

  /* ================= NEW HIGH-FIDELITY ACCORDION FILTERS DRAWER STYLES ================= */
  filtersDrawer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'column',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterDrawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#043529', // website brand dark green color code
    fontFamily: 'Inter',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854', // website brand primary green color code
    fontFamily: 'Inter',
  },
  filterSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  filterAccordionScroll: {
    flex: 1,
    marginBottom: 16,
  },
  accordionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 14,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  accordionTitleActive: {
    color: '#043529', // website brand dark green active color code
  },
  accordionContent: {
    marginTop: 12,
    paddingBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'Inter',
    backgroundColor: '#F8FAFC',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  filterPillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#01b854', // brand primary green color code
    borderColor: '#01b854',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  applyFilterBtn: {
    backgroundColor: '#043529', // brand dark green button
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  applyFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  resetLink: {
    marginTop: 10,
  },
  resetLinkText: {
    fontSize: 13,
    color: '#01b854',
    fontWeight: '700',
    textDecorationLine: 'underline',
  }
});
