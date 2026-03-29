import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Calendar, Shield } from 'lucide-react-native';

export default function Hero() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <MapPin size={16} color="#10B981" strokeWidth={2.5} />
          <Text style={styles.badgeText}>Book Sports Grounds Instantly</Text>
        </View>

        <Text style={styles.title}>
          Find & Book{'\n'}Premium Sports{'\n'}Grounds Near You
        </Text>

        <Text style={styles.subtitle}>
          Discover top-quality cricket, football, and multi-sport grounds in your city. Easy booking, verified venues, instant confirmation.
        </Text>

        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Calendar size={20} color="#6B7280" strokeWidth={2} />
            <Text style={styles.featureText}>Instant Booking</Text>
          </View>
          <View style={styles.feature}>
            <Shield size={20} color="#6B7280" strokeWidth={2} />
            <Text style={styles.featureText}>Verified Grounds</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 56 : 42,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 64 : 50,
    marginBottom: 20,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
  },
  buttonGroup: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
});
