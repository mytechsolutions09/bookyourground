import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import HomeScreenSkeleton from '@/components/landing/HomeScreenSkeleton';
import HomePageSkeleton from '@/components/landing/HomePageSkeleton';
import WebLayout from '@/components/web/WebLayout';
import Head from 'expo-router/head';

const WELCOME_SEEN_KEY = 'welcome_seen_v1';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();
  const os = Platform.OS as string;
  const [welcomeChecked, setWelcomeChecked] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setWelcomeChecked(true);
      return;
    }
    
    let cancelled = false;
    const checkWelcome = async () => {
      try {
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (cancelled) return;
        
        if (seen !== '1') {
          // Explicitly redirect and do NOT set welcomeChecked to true yet
          router.replace('/welcome');
        } else {
          setWelcomeChecked(true);
        }
      } catch (err) {
        console.error('Welcome storage check error:', err);
        if (!cancelled) setWelcomeChecked(true);
      }
    };
    
    checkWelcome();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // skip marketing homepage on mobile: go to app tabs immediately.
    if (!loading && welcomeChecked && os !== 'web') {
      if (user) {
        // Everyone goes to home_tab on mobile, including admins and owners
        router.replace('/(tabs)/home_tab');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, profile, loading, welcomeChecked, os]);

  if (!welcomeChecked || loading) {
    return os === 'web' ? <HomePageSkeleton /> : <HomeScreenSkeleton />;
  }


  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I book a sports ground on BookYourGround?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "To book a ground, search for your preferred sport (e.g., cricket, football) and city, choose a venue, select an available date and time slot, and securely pay online via UPI, cards, or net banking."
        }
      },
      {
        "@type": "Question",
        "name": "Are the slot availabilities shown real-time?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all slots shown on BookYourGround are synced in real-time with the venues. When you book a slot, it is instantly locked and confirmed."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel or reschedule my booking?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can cancel or reschedule bookings according to each venue's specific cancellation policy, which is clearly displayed on the checkout page before making a payment."
        }
      },
      {
        "@type": "Question",
        "name": "Is there any extra booking fee or markup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, BookYourGround offers 0% markup and no hidden fees for players. You pay the exact price listed by the venue owner."
        }
      }
    ]
  };

  // On web, we keep landing visible for authenticated users.
  return os === 'web' ? (
    <>
      <Head>
        <title>Book Sports Grounds & Nets Instantly | BookYourGround</title>
        <meta name="description" content="Instantly book cricket grounds, football turfs, box cricket, and cricket nets near you. Compare slots, pricing, and amenities online." />
        <link rel="canonical" href="https://bookyourground.com/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
        />
      </Head>
      <WebLayout>
        <LandingScrollContent variant="web" />
      </WebLayout>
    </>
  ) : null;
}
