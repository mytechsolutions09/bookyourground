import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Search, CalendarCheck2, Trophy, ArrowRight } from 'lucide-react-native';

const steps = [
  {
    icon: <Search size={28} color="#01b854" />,
    title: 'Discover Venues',
    description: 'Find the best cricket grounds and sports complexes in your city with detailed facility info.'
  },
  {
    icon: <CalendarCheck2 size={28} color="#01b854" />,
    title: 'Book Instantly',
    description: 'Check real-time availability and secure your slot with a few taps. No more phone calls.'
  },
  {
    icon: <Trophy size={28} color="#01b854" />,
    title: 'Play & Compete',
    description: 'Arrive at the field, enjoy your game, and track your performance in our elite community.'
  }
];

export default function HowItWorks() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>HOW IT WORKS</Text>
          </View>
          <Text style={styles.title}>Your Journey to the Field</Text>
          <Text style={styles.subtitle}>
            Booking a sports ground has never been this seamless. Three simple steps to get you playing.
          </Text>
        </View>

        <View style={[styles.grid, isWeb && !isMobile && styles.gridWeb]}>
          {steps.map((step, index) => (
            <View key={index} style={[styles.card, isWeb && !isMobile && styles.cardWeb]}>
              <View style={styles.iconContainer}>
                {step.icon}
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{step.title}</Text>
              <Text style={styles.cardDescription}>{step.description}</Text>
              {index < steps.length - 1 && isWeb && !isMobile && (
                <View style={styles.connector}>
                  <ArrowRight size={24} color="#E2E8F0" />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
  },
  container: {
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  badge: {
    backgroundColor: '#043529',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    marginBottom: 16,
  },
  badgeText: {
    color: '#01b854',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
    fontFamily: 'Inter',
  },
  grid: {
    flexDirection: 'column',
    gap: 32,
  },
  gridWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  cardWeb: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#01b854',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  cardDescription: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  connector: {
    position: 'absolute',
    right: -24,
    top: '40%',
    zIndex: 1,
  },
});
