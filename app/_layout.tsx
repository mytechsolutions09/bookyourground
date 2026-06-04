import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import { MobileTabBarHost } from '@/components/navigation/MobileTabBarHost';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
  });

  const splashHidden = useRef(false);
  const renderCount = useRef(0);
  if (__DEV__ && Platform.OS === 'web') {
    renderCount.current++;
    console.log('Root layout render:', renderCount.current);
  }

  useFrameworkReady();

  useEffect(() => {
    if ((fontsLoaded || fontError) && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

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

    // Google Tag Injection
    const trackingId = 'G-2K1150PVEP';
    const tagScriptId = 'google-tag-manager';
    if (!document.getElementById(tagScriptId)) {
      const script = document.createElement('script');
      script.id = tagScriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      document.head.appendChild(script);

      const configScript = document.createElement('script');
      configScript.id = `${tagScriptId}-config`;
      configScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingId}');
      `;
      document.head.appendChild(configScript);
    }

    // Google Site Verification Meta Tag Injection
    const verificationCode = process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION;
    const verificationMetaId = 'google-site-verification';
    if (verificationCode && !document.getElementById(verificationMetaId)) {
      const meta = document.createElement('meta');
      meta.id = verificationMetaId;
      meta.name = 'google-site-verification';
      meta.content = verificationCode;
      document.head.appendChild(meta);
    }

    const styleId = 'global-app-font';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        *::-webkit-scrollbar {
          display: none !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
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
        img {
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          pointer-events: auto;
        }
      `;
      document.head.appendChild(style);
    }

    // Disable right click on images
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    };

    // Disable dragging images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocationProvider>
          <AuthProvider>
            <UIProvider>
              <RootLayoutInner />
              <StatusBar style="auto" />
            </UIProvider>
          </AuthProvider>
        </LocationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutInner() {
  const { tabAnimation } = useUI();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF', flex: 1 },
            animation: tabAnimation,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(owner)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="select-sport" />
          <Stack.Screen name="shop/cart" />
          <Stack.Screen name="chat/[id]" options={{ animation: 'none', gestureEnabled: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
      <MobileTabBarHost />
    </View>
  );
}
