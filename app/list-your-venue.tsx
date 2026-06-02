import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Calendar, CreditCard, ShieldCheck, BarChart3, Check } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';

export default function ListYourVenue() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.title}>BookYourGround for Venue Owners</Text>
        
        {/* AI-Extractable Block (Optimized for both human and AI readability) */}
        <View style={styles.aiBlock}>
          <Text style={styles.aiBlockText}>
            BookYourGround is a free-to-list platform that helps sports venue owners fill unused slots, collect upfront payments, and eliminate double-bookings through an automated online booking calendar. Venue owners keep control of their availability and pricing while BookYourGround handles discovery and payment processing.
          </Text>
          
          <Text style={styles.featuresHeading}>What venue owners get:</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Check size={20} color="#00ea6b" style={styles.featureCheck} />
              <Text style={styles.featureItemText}>Real-time availability calendar synced across all bookings</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color="#00ea6b" style={styles.featureCheck} />
              <Text style={styles.featureItemText}>Upfront online payments — no more no-shows</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color="#00ea6b" style={styles.featureCheck} />
              <Text style={styles.featureItemText}>Automated booking confirmation sent to players</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color="#00ea6b" style={styles.featureCheck} />
              <Text style={styles.featureItemText}>Dashboard showing utilization, revenue, and upcoming bookings</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={20} color="#00ea6b" style={styles.featureCheck} />
              <Text style={styles.featureItemText}>Zero setup cost — pay only a commission on confirmed bookings</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/owner-signup' as any)}
        >
          <Text style={styles.ctaButtonText}>List Your Venue For Free</Text>
        </TouchableOpacity>
      </View>

      {/* Visual Feature Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridCard}>
          <View style={styles.iconContainer}>
            <Calendar size={32} color="#00ea6b" />
          </View>
          <Text style={styles.gridCardTitle}>Smart Calendar</Text>
          <Text style={styles.gridCardText}>Manage your slots effortlessly. Our real-time syncing ensures zero double-bookings.</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={styles.iconContainer}>
            <CreditCard size={32} color="#00ea6b" />
          </View>
          <Text style={styles.gridCardTitle}>Guaranteed Payments</Text>
          <Text style={styles.gridCardText}>Players pay upfront securely. Weekly automated payouts directly to your bank account.</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={styles.iconContainer}>
            <BarChart3 size={32} color="#00ea6b" />
          </View>
          <Text style={styles.gridCardTitle}>Analytics Dashboard</Text>
          <Text style={styles.gridCardText}>Track your venue utilization, revenue trends, and most active player segments.</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={32} color="#00ea6b" />
          </View>
          <Text style={styles.gridCardTitle}>Complete Control</Text>
          <Text style={styles.gridCardText}>You define the pricing, operational hours, and specific cancellation policies.</Text>
        </View>
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
    padding: 16,
    maxWidth: 1000,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 60,
  },
  heroSection: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  aiBlock: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  aiBlockText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    fontFamily: 'Inter',
    marginBottom: 20,
  },
  featuresHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  featureCheck: {
    marginRight: 10,
    marginTop: 2,
  },
  featureItemText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    fontFamily: 'Inter',
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#043529',
    fontFamily: 'Inter',
  },
  gridContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    maxWidth: 900,
  },
  gridCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: Platform.OS === 'web' ? 220 : '100%',
    maxWidth: Platform.OS === 'web' ? '48%' : '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  gridCardText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
});
