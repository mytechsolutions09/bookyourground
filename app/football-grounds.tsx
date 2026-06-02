import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Search, ShieldCheck, MapPin } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';

export default function FootballGroundsPage() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.badge}>⚽ FOOTBALL GROUND RENTAL NEAR ME</Text>
        <Text style={styles.title}>Book the Best Football Turfs Online</Text>
        <Text style={styles.subtitle}>
          Stop scrolling through WhatsApp groups to find an open football turf. Discover top-rated 5v5, 7v7, and 11v11 football grounds near you and book instantly.
        </Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/search?sport=Football' as any)}
        >
          <Text style={styles.ctaButtonText}>Find Football Turfs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresSection}>
        <View style={styles.featureCard}>
          <MapPin size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Turfs Near You</Text>
          <Text style={styles.featureText}>Filter your search by location, turf size, and amenities like bibs, footballs provided, or floodlights for night matches.</Text>
        </View>

        <View style={styles.featureCard}>
          <Search size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Instant Confirmation</Text>
          <Text style={styles.featureText}>When you book through our platform, your slot is instantly locked in the venue's master calendar. Zero chance of a double-booking.</Text>
        </View>

        <View style={styles.featureCard}>
          <ShieldCheck size={32} color="#00ea6b" style={styles.featureIcon} />
          <Text style={styles.featureTitle}>Transparent Pricing</Text>
          <Text style={styles.featureText}>No hidden booking fees. You pay the exact venue rate securely online and split the cost with your team later.</Text>
        </View>
      </View>

      <View style={styles.faqBlock}>
        <Text style={styles.faqHeading}>Why book a football turf online?</Text>
        <Text style={styles.faqText}>
          Booking a football ground via phone calls or texts often leads to miscommunications, unrecorded bookings, and wasted time. By using an online football ground rental platform, you get a 100% guarantee on your slot, transparent pricing, and the ability to discover new, highly-rated turfs in your city with just a few clicks.
        </Text>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout isPublicNoSidebar={true}>{content}</WebLayout>;
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
    backgroundColor: '#0F172A',
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
