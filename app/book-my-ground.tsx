import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../components/MobileAppNavbar';

export default function BookMyGroundPage() {
  const { width } = useWindowDimensions();

  // On small web screens, always render booking under the Grounds tab (with bottom bar).
  useEffect(() => {
    if (Platform.OS === 'web' && width < 900) {
      router.replace('/(tabs)/grounds' as any);
    }
  }, [width]);

  if (Platform.OS === 'web' && width < 900) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.page}>
            <LandingBookingForm fullWidth separateSearchResults />
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native (iOS / Android): full-screen booking form with simple navbar.
  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar />
      <View style={styles.page}>
        <LandingBookingForm fullWidth separateSearchResults noCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  page: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 96 : 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

