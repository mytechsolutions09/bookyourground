import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { MapPin } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function DashboardMap() {
  const { latitude, longitude } = useLocation();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredGroundId, setHoveredGroundId] = useState<string | null>(null);
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);

  useEffect(() => {
    fetchGrounds();
  }, []);

  const fetchGrounds = async () => {
    try {
      const { data, error } = await supabase
        .from('grounds')
        .select('*, ground_images(*)')
        .eq('active', true)
        .eq('approved', true)
        .limit(50);
      
      if (error) throw error;
      setGrounds(data || []);
    } catch (e) {
      console.error('Error fetching grounds for map:', e);
    } finally {
      setLoading(false);
    }
  };



  const getDirectionsUrl = (g: GroundWithImages) => {
    const { latitude, longitude, address, city, state } = g;
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    let destination;
    if (latitude && longitude) {
      destination = `${latitude},${longitude}`;
    } else {
      const parts = [address, city, state].map((v) => String(v ?? '').trim()).filter(Boolean);
      destination = encodeURIComponent(parts.join(', '));
    }
    return `${baseUrl}&destination=${destination}&travelmode=driving`;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#00ea6b" />
      </View>
    );
  }

  const defaultCenter = (latitude && longitude) ? { lat: latitude, lng: longitude } : { lat: 28.6139, lng: 77.2090 }; // Delhi default

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Global SVG Definitions */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="dashboardNeonPinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
          mapId="DASHBOARD_MAP"
          disableDefaultUI={true}
          gestureHandling={'cooperative'}
        >
          {grounds.map(g => {
            const lat = parseFloat(g.latitude);
            const lng = parseFloat(g.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <React.Fragment key={g.id}>
                <AdvancedMarker 
                  position={{ lat, lng }}
                  onMouseEnter={() => setHoveredGroundId(g.id)}
                  onMouseLeave={() => setHoveredGroundId(null)}
                  onClick={() => setOpenInfoWindowId(g.id)}
                >
                  <View style={{ width: 40, height: 40, position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                      <path 
                        d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="url(#dashboardNeonPinGradient)"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
                    </svg>

                    {/* Hover Tooltip */}
                    <View style={{
                      position: 'absolute',
                      bottom: 45,
                      left: -70,
                      width: 140,
                      backgroundColor: '#FFFFFF',
                      padding: 10,
                      borderRadius: 12,
                      shadowColor: '#000',
                      // @ts-ignore
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                      {/* Arrow */}
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
                  </View>
                </AdvancedMarker>

                {openInfoWindowId === g.id && (
                  <InfoWindow
                    position={{ lat, lng }}
                    onCloseClick={() => setOpenInfoWindowId(null)}
                  >
                    <View style={{ padding: 4, minWidth: 120 }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: '#0F172A', marginBottom: 2 }}>{g.name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{g.city}</Text>
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(getDirectionsUrl(g))}
                        style={{ 
                          backgroundColor: '#10B981', 
                          paddingVertical: 6, 
                          paddingHorizontal: 12, 
                          borderRadius: 6,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>DIRECTIONS</Text>
                      </TouchableOpacity>
                    </View>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}
        </Map>
      </View>
    </APIProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
});
