import React from 'react';
import { Platform } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminGroundTypesManage from '@/components/admin/AdminGroundTypesManage';
import WebLayout from '@/components/web/WebLayout';

export default function AdminSettingsGroundTypes() {
  const inner = (
    <SettingsSubbar>
      <AdminGroundTypesManage />
    </SettingsSubbar>
  );

  if (Platform.OS === 'web') return <WebLayout>{inner}</WebLayout>;
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="GROUND TYPES" titleColor="#10b981" />
      {inner}
    </View>
  );
}
