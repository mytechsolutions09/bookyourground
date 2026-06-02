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
    return <WebLayout>{content}</WebLayout>;
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
    maxWidth: 1200,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 80,
  },
  heroSection: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 32,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  aiBlock: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  aiBlockText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#334155',
    fontFamily: 'Inter',
    marginBottom: 24,
  },
  featuresHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureCheck: {
    marginRight: 12,
    marginTop: 2,
  },
  featureItemText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    fontFamily: 'Inter',
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 100,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  gridContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
    maxWidth: 1000,
  },
  gridCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: Platform.OS === 'web' ? 220 : '100%',
    maxWidth: Platform.OS === 'web' ? '45%' : '100%',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gridCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  gridCardText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
});
