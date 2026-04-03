import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function GroundsIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== 'web',
        headerStyle: { backgroundColor: '#043529' },
        headerTintColor: '#00ea6b',
        headerTitleStyle: {
          color: '#02c259',
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#F5F5F5' },
      }}
    />
  );
}
