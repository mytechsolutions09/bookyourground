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
          Choose the plan that fits your venue's needs. From getting started to managing multiple complexes.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Starter Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Starter</Text>
            <Text style={styles.cardPrice}>Free</Text>
            <Text style={styles.cardSubprice}>per successful booking</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Online listing</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Real-time availability calendar</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Booking confirmation</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Automated payout per booking</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Pro Card */}
        <View style={[styles.card, styles.cardFeatured]}>
          <View style={styles.cardFeaturedBadge}>
            <Text style={styles.cardFeaturedBadgeText}>POPULAR</Text>
          </View>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pro</Text>
            <Text style={styles.cardPrice}>₹50</Text>
            <Text style={styles.cardSubprice}>per team + GST</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Priority listing</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Analytics dashboard</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Multi-ground management</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.ctaButton, styles.ctaButtonFeatured]}
            onPress={() => router.push('/owner-signup' as any)}
          >
            <Text style={[styles.ctaButtonText, styles.ctaButtonTextFeatured]}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>

        {/* Enterprise Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Enterprise</Text>
            <Text style={styles.cardPrice}>Custom</Text>
            <Text style={styles.cardSubprice}>Tailored for your scale</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>For Multi-venue operators</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>For Sports complexes</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Dedicated account manager</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={18} color="#00ea6b" style={styles.featureIcon} />
              <Text style={styles.featureText}>Custom integrations</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/contact' as any)}
          >
            <Text style={styles.ctaButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Info size={20} color="#64748B" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Have questions about which plan is right for your venue? <Text style={styles.linkText} onPress={() => router.push('/contact' as any)}>Reach out to our partner team</Text> at support@bookyourground.com.
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
    maxWidth: 1200,
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
    alignItems: Platform.OS === 'web' ? 'stretch' : 'center',
    gap: 32,
    marginBottom: 40,
    width: '100%',
    flexWrap: 'wrap',
  },
  card: {
    flex: Platform.OS === 'web' ? 1 : 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: Platform.OS === 'web' ? 300 : '100%',
    maxWidth: 360,
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
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter',
    flex: 1,
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
