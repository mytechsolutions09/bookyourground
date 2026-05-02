import React from 'react';
import { Platform, View } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminGroundTypesManage from '@/components/admin/AdminGroundTypesManage';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

export default function AdminSettingsGroundTypes() {
  const inner = (
    <SettingsSubbar>
      <AdminGroundTypesManage />
    </SettingsSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout>{inner}</WebLayout>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="GROUND TYPES" titleColor="#10b981" />
      {inner}
    </View>
  );
}
