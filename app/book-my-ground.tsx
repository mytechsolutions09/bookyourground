import React from 'react';
import { Platform } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import GroundBrowse from '@/components/grounds/GroundBrowse';

export default function BookMyGroundPage() {
  const content = <GroundBrowse title="Book My Ground" />;
  if (Platform.OS === 'web') return <WebLayout>{content}</WebLayout>;
  return content;
}

