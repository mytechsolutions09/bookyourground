import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
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

// Helper function to generate path-based SEO metadata
function getSeoMetadata(pathname: string) {
  const baseTitle = "BookYourGround";
  const defaultDesc = "Instantly book cricket, football, and other sports grounds online. Find the best venues near you, view real-time availability, and secure your slot today.";
  
  let title = "Cricket Ground Booking & Sports Venues - BookYourGround";
  let description = defaultDesc;
  let canonical = `https://bookyourground.com${pathname}`;
  
  if (pathname === '/' || pathname === '/index') {
    title = "Cricket Ground Booking & Sports Venues - BookYourGround";
  } else if (pathname === '/about') {
    title = `About Us - ${baseTitle}`;
    description = "Learn more about BookYourGround, our mission, and how we are making sports venue booking seamless and accessible for everyone.";
  } else if (pathname === '/contact') {
    title = `Contact Us - ${baseTitle}`;
    description = "Get in touch with the BookYourGround team. We are here to help you with support, venue listings, partnerships, and queries.";
  } else if (pathname === '/pricing') {
    title = `Pricing Plans - ${baseTitle}`;
    description = "Explore our flexible pricing plans for players, venue owners, and corporate clients.";
  } else if (pathname === '/faq') {
    title = `Frequently Asked Questions - ${baseTitle}`;
    description = "Find answers to frequently asked questions about booking, payments, cancellations, and venue registrations on BookYourGround.";
  } else if (pathname === '/how-it-works') {
    title = `How It Works - ${baseTitle}`;
    description = "Discover how easy it is to book sports grounds and register venues with BookYourGround. Step-by-step guide for players and owners.";
  } else if (pathname === '/corporate') {
    title = `Corporate Events & Venue Booking - ${baseTitle}`;
    description = "Custom sports solutions for corporate tournaments, team outings, and regular matches. Book premium grounds with customized facilities.";
  } else if (pathname === '/privacy') {
    title = `Privacy Policy - ${baseTitle}`;
  } else if (pathname === '/terms') {
    title = `Terms & Conditions - ${baseTitle}`;
  } else if (pathname === '/refund-policy') {
    title = `Refund & Cancellation Policy - ${baseTitle}`;
  } else if (pathname === '/shipping') {
    title = `Shipping Policy - ${baseTitle}`;
  } else if (pathname === '/select-sport') {
    title = `Select Your Sport - ${baseTitle}`;
  } else if (pathname.startsWith('/ground/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 3) {
      const city = parts[1].replace(/-/g, ' ');
      const slug = parts[2].replace(/-/g, ' ');
      const formatWord = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase());
      title = `${formatWord(slug)} Booking in ${formatWord(city)} - ${baseTitle}`;
      description = `Book slots at ${formatWord(slug)} in ${formatWord(city)} online. Real-time slot availability, pricing, photos, and amenities.`;
    } else {
      title = `Sports Grounds & Turfs - ${baseTitle}`;
    }
  } else {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const lastSegment = parts[parts.length - 1].replace(/-/g, ' ');
      const formatted = lastSegment.replace(/\b\w/g, c => c.toUpperCase());
      title = `${formatted} - ${baseTitle}`;
    }
  }

  return { title, description, canonical };
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const pathname = usePathname();
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

    const { title, description, canonical } = getSeoMetadata(pathname);

    // Update document title
    if (document.title !== title) {
      document.title = title;
    }

    const setMetaTag = (id: string, attribute: string, attrValue: string, content: string) => {
      let meta = document.getElementById(id) as HTMLMetaElement;
      if (!meta) {
        meta = document.querySelector(`meta[${attribute}="${attrValue}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attribute, attrValue);
          document.head.appendChild(meta);
        }
        meta.id = id;
      }
      meta.content = content;
    };

    const keywords = 'cricket ground booking, book football ground, sports venue booking online, book your ground, play cricket, sports turfs near me';

    // Set standard meta tags
    setMetaTag('meta-description', 'name', 'description', description);
    setMetaTag('meta-keywords', 'name', 'keywords', keywords);
    
    // Set Open Graph tags
    setMetaTag('meta-og-type', 'property', 'og:type', 'website');
    setMetaTag('meta-og-url', 'property', 'og:url', canonical);
    setMetaTag('meta-og-title', 'property', 'og:title', title);
    setMetaTag('meta-og-description', 'property', 'og:description', description);
    setMetaTag('meta-og-image', 'property', 'og:image', 'https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png');

    // Set Twitter tags
    setMetaTag('meta-twitter-card', 'property', 'twitter:card', 'summary_large_image');
    setMetaTag('meta-twitter-url', 'property', 'twitter:url', canonical);
    setMetaTag('meta-twitter-title', 'property', 'twitter:title', title);
    setMetaTag('meta-twitter-description', 'property', 'twitter:description', description);
    setMetaTag('meta-twitter-image', 'property', 'twitter:image', 'https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png');

    // Set Canonical link
    const canonicalId = 'canonical-link';
    let canonicalLink = document.getElementById(canonicalId) as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.id = canonicalId;
    }
    canonicalLink.href = canonical;

    // Inject Schema Markup (JSON-LD)
    const schemaId = 'seo-schema-markup';
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = schemaId;
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }

    const schemaMarkup = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://bookyourground.com/#website",
          "url": "https://bookyourground.com/",
          "name": "BookYourGround",
          "description": description,
          "publisher": {
            "@id": "https://bookyourground.com/#organization"
          }
        },
        {
          "@type": "Organization",
          "@id": "https://bookyourground.com/#organization",
          "name": "BookYourGround",
          "url": "https://bookyourground.com/",
          "logo": "https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png"
        }
      ]
    };

    schemaScript.innerHTML = JSON.stringify(schemaMarkup);
  }, [pathname]);

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
