import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Hero from '@/components/landing/Hero';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import Features from '@/components/landing/Features';
import CallToAction from '@/components/landing/CallToAction';
import WebLayout from '@/components/web/WebLayout';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const os = Platform.OS as string;

  useEffect(() => {
    // On mobile, keep redirecting authenticated users to the app tabs.
    // On web, we keep landing visible so the booking form can be used.
    if (!loading && user && os !== 'web') {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
    const loadingView = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={os === 'web' ? '#dc8d3c' : '#10B981'} />
      </View>
    );
    return os === 'web' ? <WebLayout>{loadingView}</WebLayout> : loadingView;
  }

  // On mobile we redirect authenticated users to the app tabs.
  // On web we keep the landing visible so the booking form can be used.
  if (user && os !== 'web') return null;

  return (
    os === 'web' ? (
      <WebLayout>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <Hero />
          <LandingBookingForm />
          <Features />
          <CallToAction />
        </ScrollView>
      </WebLayout>
    ) : (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Hero />
        <Features />
        <CallToAction />
      </ScrollView>
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
