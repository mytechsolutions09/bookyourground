import React from 'react';
import { Platform } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminLocationsManage from '@/components/admin/AdminLocationsManage';
import WebLayout from '@/components/web/WebLayout';

/** Alias for older bundles / cached Metro output that still reference this name */
const AdminLocationsScreen = AdminLocationsManage;

export default function AdminSettingsLocations() {
  const inner = (
    <SettingsSubbar>
      <AdminLocationsScreen />
    </SettingsSubbar>
  );

  if (Platform.OS === 'web') return <WebLayout>{inner}</WebLayout>;
  return inner;
}
