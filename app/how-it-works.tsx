import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Search, CalendarCheck, CreditCard, PlayCircle } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function HowItWorks() {
  const { width } = useWindowDimensions();
  const steps = [
    {
      id: 1,
      title: 'Find Your Venue',
      description: 'Search for sports grounds, turfs, and courts near you. Filter by sport, location, and availability to find the perfect spot for your game.',
      icon: <Search size={32} color="#00ea6b" />,
    },
    {
      id: 2,
      title: 'Choose a Slot',
      description: 'Check real-time availability and select a time slot that works for you and your team. No more back-and-forth phone calls.',
      icon: <CalendarCheck size={32} color="#00ea6b" />,
    },
    {
      id: 3,
      title: 'Book & Pay',
      description: 'Secure your booking instantly with our safe and seamless payment gateway. Get immediate confirmation sent to your email.',
      icon: <CreditCard size={32} color="#00ea6b" />,
    },
    {
      id: 4,
      title: 'Play Your Game',
      description: 'Show up at the venue, present your booking confirmation, and start playing! Focus on the game, we handle the rest.',
      icon: <PlayCircle size={32} color="#00ea6b" />,
    },
  ];

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>How It Works</Text>
        <Text style={styles.subtitle}>
          Booking your favorite sports ground has never been easier. Just 4 simple steps to get you playing.
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepCard}>
            <View style={styles.iconContainer}>
              {step.icon}
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{step.id}</Text>
              </View>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            {index < steps.length - 1 && Platform.OS === 'web' && (
              <View style={[styles.connector, { display: width > 1024 ? 'flex' : 'none' }]} />
            )}
          </View>
        ))}
      </View>

      <View style={styles.ctaContainer}>
        <Text style={styles.ctaTitle}>Ready to start playing?</Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/book-my-ground' as any)}
        >
          <Text style={styles.ctaButtonText}>Browse Venues Now</Text>
        </TouchableOpacity>
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
  stepsContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
    width: '100%',
  },
  stepCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: Platform.OS === 'web' ? 220 : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  stepNumberBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  connector: {
    position: 'absolute',
    right: -20,
    top: 54,
    width: 20,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  ctaContainer: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 32,
    borderRadius: 24,
    width: '100%',
    maxWidth: 700,
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#043529',
    fontFamily: 'Inter',
  },
});
