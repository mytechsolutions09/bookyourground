import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function CallToAction() {
  const { user, profile } = useAuth();
  const isLoggedIn = !!user || !!profile;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Ready to Get Started?</Text>
          <Text style={styles.subtitle}>
            Join thousands of sports enthusiasts who book their favorite grounds with ease
          </Text>

          <View style={styles.buttonGroup}>
            {isLoggedIn ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push('/(tabs)/bookings')}
              >
                <Text style={styles.primaryButtonText}>My Bookings</Text>
                <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push('/(auth)/signup')}
                >
                  <Text style={styles.primaryButtonText}>Create Free Account</Text>
                  <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>

                <Pressable
                  style={styles.linkButton}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.linkButtonText}>Already have an account? Sign in</Text>
                </Pressable>
              </>
            )}
          </View>
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
  card: {
    backgroundColor: '#043529',
    borderRadius: 24,
    padding: Platform.OS === 'web' ? 64 : 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#01b854',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontFamily: 'Inter',
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '500',
  },
});
