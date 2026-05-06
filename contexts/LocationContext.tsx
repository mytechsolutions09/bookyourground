import React, { createContext, useContext, useState, useEffect } from 'react';
import * as ExpoLocation from 'expo-location';
import { fetchCityName, fetchWeather } from '@/utils/weather';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  cityName: string;
  weather: {
    temp: number;
    conditionText: string;
  } | null;
  loading: boolean;
  error: string | null;
}

interface LocationContextType extends LocationData {
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    cityName: 'Checking...',
    weather: null,
    loading: true,
    error: null,
  });

  const refreshLocation = async () => {
    try {
      setLocationData(prev => ({ ...prev, loading: true }));
      
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationData({
          latitude: null,
          longitude: null,
          cityName: 'Permission Denied',
          weather: null,
          loading: false,
          error: 'Location permission denied',
        });
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;

      // Parallel fetch for speed
      const [weatherData, cityName] = await Promise.all([
        fetchWeather(latitude, longitude),
        fetchCityName(latitude, longitude)
      ]);

      setLocationData({
        latitude,
        longitude,
        cityName: cityName || 'Unknown',
        weather: weatherData ? {
          temp: weatherData.temp,
          conditionText: weatherData.conditionText
        } : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error in LocationProvider:', err);
      setLocationData(prev => ({
        ...prev,
        cityName: 'Unavailable',
        loading: false,
        error: 'Failed to get location',
      }));
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  const value = React.useMemo(() => ({
    ...locationData,
    refreshLocation
  }), [locationData]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
