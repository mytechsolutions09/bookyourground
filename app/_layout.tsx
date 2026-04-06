import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { MobileTabBarHost } from '@/components/navigation/MobileTabBarHost';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    const id = 'inter-font-link';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }

    document.body.style.fontFamily = '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              // Avoid default nav/card tint flashing blue before the landing paints.
              contentStyle: { backgroundColor: '#FFFFFF', flex: 1 },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(owner)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <MobileTabBarHost />
      </View>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
