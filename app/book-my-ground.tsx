import React from 'react';
import { Platform, View, StyleSheet, ScrollView } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';

export default function BookMyGroundPage() {
  const inner = (
    <View style={styles.page}>
      <LandingBookingForm fullWidth />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {inner}
        </ScrollView>
      </WebLayout>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: Platform.OS === 'web' ? 96 : 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

