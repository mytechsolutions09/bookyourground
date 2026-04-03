import React from 'react';
import { Platform, View, StyleSheet, ScrollView } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../../components/MobileAppNavbar';

export default function GroundsTabScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.page}>
            <LandingBookingForm fullWidth />
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native: full-screen booking with navbar + logo.
  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar />
      <View style={styles.page}>
        <LandingBookingForm fullWidth noCard />
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


