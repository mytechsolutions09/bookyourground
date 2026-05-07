import React from 'react';
import { Platform, View } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminLocationsManage from '@/components/admin/AdminLocationsManage';
import WebLayout from '@/components/web/WebLayout';

/** Alias for older bundles / cached Metro output that still reference this name */
const AdminLocationsScreen = AdminLocationsManage;

export default function AdminSettingsLocations() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          <AdminLocationsScreen />
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AdminLocationsScreen />
      </View>
    </SettingsSubbar>
  );
}
