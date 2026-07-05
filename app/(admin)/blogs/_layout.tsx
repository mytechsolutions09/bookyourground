import React from 'react';
import { Stack } from 'expo-router';

export default function AdminBlogsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sitemap" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
