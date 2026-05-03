import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import MapView, { Marker } from 'react-native-maps';
import { useLocation } from '@/contexts/LocationContext';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function DashboardMap() {
  const { latitude, longitude } = useLocation();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);

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



  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#00ea6b" />
      </View>
    );
  }

  const defaultCenter = (latitude && longitude) ? { lat: latitude, lng: longitude } : { lat: 28.6139, lng: 77.2090 }; // Delhi default

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: defaultCenter.lat,
        longitude: defaultCenter.lng,
        latitudeDelta: 0.4,
        longitudeDelta: 0.4,
      }}
    >
      {grounds.map(g => {
        const lat = parseFloat(g.latitude);
        const lng = parseFloat(g.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;
        return (
          <Marker
            key={g.id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={g.name}
            description={g.city}
          >
            <View style={{ width: 36, height: 36 }}>
              <Svg width="100%" height="100%" viewBox="0 0 24 24">
                <Defs>
                  <LinearGradient id="mobileNeonPinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#d8f79d" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#bfff49" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#00fd73" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Path 
                  d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                  fill="url(#mobileNeonPinGradient)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <Circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
              </Svg>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  }
});
