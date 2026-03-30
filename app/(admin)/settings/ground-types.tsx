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
  return inner;
}
