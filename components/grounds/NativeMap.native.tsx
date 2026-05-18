import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Map as MapIcon } from 'lucide-react-native';
import { GroundWithImages } from '@/types';

import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface NativeMapProps {
  ground: GroundWithImages;
}

export default function NativeMap({ ground }: NativeMapProps) {
  const [coords, setCoords] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    if (ground.latitude && ground.longitude) {
      const lat = parseFloat(ground.latitude);
      const lng = parseFloat(ground.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCoords({ latitude: lat, longitude: lng });
      }
    }
  }, [ground]);

  const handlePressPin = async () => {
    if (!coords) return;
    const { latitude, longitude } = coords;
    
    const label = encodeURIComponent(ground.name || 'Ground Location');
    
    // Construct platform-specific directions URL
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening directions:', error);
      try {
        await Linking.openURL(fallbackUrl);
      } catch (fallbackError) {
        console.error('Error opening fallback directions:', fallbackError);
      }
    }
  };

  if (!coords) {
    return (
      <View style={styles.mobileMapPlaceholder}>
        <MapIcon size={40} color="#94A3B8" strokeWidth={1.5} />
        <Text style={styles.mobileMapPlaceholderText}>Coordinates not available</Text>
      </View>
    );
  }

  return (
    <MapView
      style={{ flex: 1, borderRadius: 16 }}
      initialRegion={{
        ...coords,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={coords} title={ground.name} onPress={handlePressPin}>
        <View style={{ width: 36, height: 36 }}>
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <Defs>
              <LinearGradient id="groundNeonPinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#d8f79d" stopOpacity="1" />
                <Stop offset="50%" stopColor="#bfff49" stopOpacity="1" />
                <Stop offset="100%" stopColor="#00fd73" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path 
              d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
              fill="url(#groundNeonPinGradient)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <Circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
          </Svg>
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  mobileMapPlaceholder: {
    height: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  mobileMapPlaceholderText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
});
