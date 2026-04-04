import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Search, Clock, Shield, Wallet, Users, Star } from 'lucide-react-native';

const features = [
  {
    icon: Search,
    title: 'Easy Discovery',
    description: 'Find grounds by location, sport type, and availability with powerful search filters.',
  },
  {
    icon: Clock,
    title: 'Real-time Availability',
    description: 'See live slot availability and book instantly without phone calls or waiting.',
  },
  {
    icon: Shield,
    title: 'Verified Venues',
    description: 'All grounds are verified with photos, reviews, and accurate facility information.',
  },
  {
    icon: Wallet,
    title: 'Transparent Pricing',
    description: 'Clear pricing with no hidden fees. Pay securely and get instant confirmation.',
  },
  {
    icon: Users,
    title: 'For Ground Owners',
    description: 'List your ground, manage bookings, and grow your business with our platform.',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Make informed decisions with authentic reviews from the sports community.',
  },
];

export default function Features() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Features</Text>
        <Text style={styles.title}>Everything You Need</Text>
        <Text style={styles.subtitle}>
          A complete platform for discovering, booking, and managing sports grounds
        </Text>

        <View style={styles.grid}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={index} style={styles.card}>
                <View style={styles.iconContainer}>
                  <IconComponent
                    size={24}
                    color="#02c259"
                    strokeWidth={2}
                  />
                </View>
                <Text style={styles.cardTitle}>{feature.title}</Text>
                <Text style={styles.cardDescription}>{feature.description}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#02c259',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#043529',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 56,
    maxWidth: 600,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: Platform.OS === 'web' ? 360 : '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(4,53,41,0.12)', // #043529 tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#043529',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#6B7280',
    lineHeight: 24,
  },
});
