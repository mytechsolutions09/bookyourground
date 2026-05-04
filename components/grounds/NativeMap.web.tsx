import React from 'react';
import { View, Text } from 'react-native';
import { GroundWithImages } from '@/types';

interface NativeMapProps {
  ground: GroundWithImages;
}

/**
 * Web fallback for the native map component.
 * We use @vis.gl/react-google-maps directly in the pages for web,
 * so this component remains a simple placeholder if accidentally rendered.
 */
export default function NativeMap({ ground }: NativeMapProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
      <Text style={{ color: '#64748B' }}>Native Map not available on Web</Text>
    </View>
  );
}
