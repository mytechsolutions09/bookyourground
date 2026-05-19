import React from 'react';
import { Stack } from 'expo-router';

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default', // Overrides swipe animations to use the natural native transition
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
