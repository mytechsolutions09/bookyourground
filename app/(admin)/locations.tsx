import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function AdminLocationsRedirect() {
  useEffect(() => {
    // Keep backward compatibility: /admin/locations → /admin/settings/locations
    router.replace('/(admin)/settings/locations' as any);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Platform.OS === 'web' ? '#10b981' : '#2196F3'} />
    </View>
  );
}
