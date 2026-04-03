import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== 'web',
        headerStyle: { backgroundColor: '#043529' },
        headerTintColor: '#00ea6b',
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    />
  );
}
