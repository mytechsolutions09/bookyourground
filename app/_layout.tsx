import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { UIProvider } from '@/contexts/UIContext';
import { MobileTabBarHost } from '@/components/navigation/MobileTabBarHost';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Hide the splash screen as soon as the root layout is mounted and framework is ready
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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

    const styleId = 'global-app-font';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        html, body, #root, [data-reactroot], div, span, p, h1, h2, h3, h4, h5, h6, a, label {
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        input, select, textarea, button {
          font-family: "Inter", system-ui, sans-serif !important;
        }
        /* Ensure Lucide icons (SVG) don't get affected by font-family if they wrap text, 
           though they usually don't. This is just for safety. */
        .lucide {
          font-family: inherit !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocationProvider>
        <AuthProvider>
          <UIProvider>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
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
          </UIProvider>
        </AuthProvider>
      </LocationProvider>
    </GestureHandlerRootView>
  );
}
