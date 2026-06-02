import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Search, CalendarCheck, CreditCard, PlayCircle } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function HowItWorks() {
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
              <View style={styles.connector} />
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
    maxWidth: 600,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'Inter',
  },
  stepsContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 80,
    width: '100%',
  },
  stepCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: Platform.OS === 'web' ? 240 : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  stepNumberBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  stepDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  connector: {
    position: 'absolute',
    right: -32,
    top: 72,
    width: 32,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    display: Dimensions.get('window').width > 1024 ? 'flex' : 'none',
  },
  ctaContainer: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 48,
    borderRadius: 32,
    width: '100%',
    maxWidth: 800,
    marginBottom: 40,
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
});
