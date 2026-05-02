import React from 'react';
import { Platform, View } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminLocationsManage from '@/components/admin/AdminLocationsManage';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

/** Alias for older bundles / cached Metro output that still reference this name */
const AdminLocationsScreen = AdminLocationsManage;

export default function AdminSettingsLocations() {
  const inner = (
    <SettingsSubbar>
      <AdminLocationsScreen />
    </SettingsSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout noCard>{inner}</WebLayout>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="LOCATIONS" titleColor="#10b981" />
      {inner}
    </View>
  );
}
