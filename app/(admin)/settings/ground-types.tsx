import React from 'react';
import { Platform, View } from 'react-native';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import AdminGroundTypesManage from '@/components/admin/AdminGroundTypesManage';
import WebLayout from '@/components/web/WebLayout';

export default function AdminSettingsGroundTypes() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          <AdminGroundTypesManage />
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AdminGroundTypesManage />
      </View>
    </SettingsSubbar>
  );
}
