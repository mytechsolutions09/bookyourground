import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ImageBackground } from 'react-native';
import { Search, ShieldCheck, MapPin } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import Head from 'expo-router/head';

export default function CricketGroundsPage() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.badge}>🏏 CRICKET GROUND BOOKING APP</Text>
        <Text style={styles.title}>Book Premium Cricket Grounds Online</Text>
        <Text style={styles.subtitle}>
          Stop calling multiple venues to find an open net or full pitch. Browse the best cricket grounds near you, check real-time availability, and confirm your slot instantly with 0% markup.
        </Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/search?sport=Cricket' as any)}
        >
          <Text style={styles.ctaButtonText}>Find Cricket Grounds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresSection}>
        <View style={styles.featureCard}>
          <MapPin size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Grounds Near You</Text>
          <Text style={styles.featureText}>Easily filter by location, amenities (like floodlights or bowling machines), and pitch type (turf, mat, or box cricket).</Text>
        </View>

        <View style={styles.featureCard}>
          <Search size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Real-Time Availability</Text>
          <Text style={styles.featureText}>No more double bookings or unconfirmed slots. If a slot is green on our calendar, it's 100% yours.</Text>
        </View>

        <View style={styles.featureCard}>
          <ShieldCheck size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Secure Payments</Text>
          <Text style={styles.featureText}>Pay upfront securely and split the cost with your team later. Transparent cancellation policies mean no hidden fees.</Text>
        </View>
      </View>

      <View style={styles.faqBlock}>
        <Text style={styles.faqHeading}>Why use a cricket ground booking app?</Text>
        <Text style={styles.faqText}>
          Booking a cricket ground the traditional way—calling venues or messaging WhatsApp groups—takes an average of 30 minutes and offers no guarantee. An online booking platform like BookYourGround allows you to secure a premium cricket pitch or net in under 2 minutes, with a guaranteed confirmation.
        </Text>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <>
        <Head>
          <title>Book Cricket Grounds & Nets Online | BookYourGround</title>
          <meta name="description" content="Discover and book cricket grounds, turfs, and nets near you. Real-time availability, zero markup pricing, secure slots, and instant confirmations." />
          <link rel="canonical" href="https://bookyourground.com/cricket-grounds" />
        </Head>
        <WebLayout isPublicNoSidebar={true}>{content}</WebLayout>
      </>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    maxWidth: 1000,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 80,
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 60,
    backgroundColor: '#043529',
    padding: 48,
    borderRadius: 24,
  },
  badge: {
    backgroundColor: 'rgba(0, 234, 107, 0.15)',
    color: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Inter',
    maxWidth: 700,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 100,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  featuresSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    gap: 24,
    marginBottom: 60,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  featureIcon: {
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  faqBlock: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  faqText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
    fontFamily: 'Inter',
  },
});
