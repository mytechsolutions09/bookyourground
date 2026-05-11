import React from 'react';
import { Stack } from 'expo-router';

export default function AdminSettingsLayout() {
  return (
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="locations" />
      <Stack.Screen name="ground-types" />
      <Stack.Screen name="contract-submissions" />
    </Stack>
  );
}

