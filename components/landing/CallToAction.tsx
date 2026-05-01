import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function CallToAction() {
  const { user, profile } = useAuth();
  const isLoggedIn = !!user || !!profile;
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isLight = Platform.OS === 'web' && isCompact;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.card, isLight && styles.cardLight]}>
          <Text style={[styles.title, isLight && styles.titleLight]}>Ready to Get Started?</Text>
          <Text style={[styles.subtitle, isLight && styles.subtitleLight]}>
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
                  <Text style={[styles.linkButtonText, isLight && styles.linkButtonTextLight]}>Already have an account? Sign in</Text>
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
    backgroundColor: '#F8FAFC',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 32,
    padding: Platform.OS === 'web' ? 64 : 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowOpacity: 0.1,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 42 : 32,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  titleLight: {
    color: '#111827',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
  },
  subtitleLight: {
    color: '#64748B',
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 36,
    paddingVertical:Platform.OS === 'web' ? 20 : 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  linkButtonTextLight: {
    color: '#10B981',
  },
});
