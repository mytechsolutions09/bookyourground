import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Check, Info } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';

export default function PricingPage() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple, Transparent Pricing</Text>
        <Text style={styles.subtitle}>
          No hidden fees, no surprises. Whether you're a player looking for a game, or a venue owner looking for players.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Owner Card */}
        <View style={[styles.card, styles.cardFeatured]}>
          <View style={styles.cardFeaturedBadge}>
            <Text style={styles.cardFeaturedBadgeText}>POPULAR</Text>
          </View>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>For Venue Owners</Text>
            <Text style={styles.cardPrice}>5%</Text>
            <Text style={styles.cardSubprice}>per successful booking</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>₹0 Setup fee</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Weekly payouts</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Comprehensive dashboard</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>24/7 priority support</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.ctaButton, styles.ctaButtonFeatured]}
            onPress={() => router.push('/owner-signup' as any)}
          >
            <Text style={[styles.ctaButtonText, styles.ctaButtonTextFeatured]}>Partner With Us</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Info size={20} color="#64748B" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Are you managing multiple venues or looking for an enterprise solution? <Text style={styles.linkText} onPress={() => router.push('/contact' as any)}>Contact us</Text> for custom pricing.
        </Text>
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
    padding: 16,
    maxWidth: 1000,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    maxWidth: 600,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  cardsContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 40,
    width: '100%',
    maxWidth: 800,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: Platform.OS === 'web' ? 320 : '100%',
  },
  cardFeatured: {
    borderColor: '#00ea6b',
    borderWidth: 2,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
    position: 'relative',
  },
  cardFeaturedBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 99,
  },
  cardFeaturedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#043529',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  cardPrice: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    lineHeight: 56,
  },
  cardSubprice: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  cardBody: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  ctaButtonFeatured: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  ctaButtonTextFeatured: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 600,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  linkText: {
    color: '#00ea6b',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
