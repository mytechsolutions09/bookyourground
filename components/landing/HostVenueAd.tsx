import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ImageBackground, Platform } from 'react-native';
import { router } from 'expo-router';
import { Building2, ArrowRight, ShieldCheck, TrendingUp, CalendarClock, Trophy, MapPin, CalendarPlus, Users } from 'lucide-react-native';
import { useIsCompact } from '@/hooks/useIsCompact';
import { useAuth } from '@/contexts/AuthContext';

export default function HostVenueAd() {
  const isCompact = useIsCompact();
  const { width, height } = useWindowDimensions();
  const { user, profile } = useAuth();

  return (
    <View style={[styles.container, { minHeight: height }, isCompact && styles.containerCompact]}>
      <View style={[styles.card, isCompact && styles.cardCompact]}>
        <View style={styles.content}>
          <View style={styles.badgeWrapper}>
            <View style={styles.badge}>
              <Building2 size={14} color="#00ea6b" />
              <Text style={styles.badgeText}>FOR VENUE OWNERS</Text>
            </View>
          </View>
          
          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Maximize Your Ground's Revenue & Utilization
          </Text>
          
          <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
            Partner with BookYourGround. List your sports venue, manage bookings efficiently, and fill your unused slots effortlessly with our AI-driven matchmaking.
          </Text>

          <View style={[styles.features, isCompact && styles.featuresCompact]}>
            <View style={styles.featureItem}>
              <TrendingUp size={20} color="#00ea6b" />
              <Text style={styles.featureText}>Increase Bookings</Text>
            </View>
            <View style={styles.featureItem}>
              <CalendarClock size={20} color="#00ea6b" />
              <Text style={styles.featureText}>Automated Slots</Text>
            </View>
            <View style={styles.featureItem}>
              <ShieldCheck size={20} color="#00ea6b" />
              <Text style={styles.featureText}>Secure Payments</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => {
              if (!user) {
                router.push('/(auth)/login' as any);
              } else if (profile?.role === 'ground_owner') {
                router.push('/(owner)/owner-dashboard' as any);
              } else {
                router.push('/list-venue' as any);
              }
            }}
            {...(Platform.OS === 'web' && { 
              onMouseEnter: (e: any) => e.target.style.opacity = '0.9',
              onMouseLeave: (e: any) => e.target.style.opacity = '1'
            } as any)}
          >
            <Text style={styles.ctaText}>List Your Venue Now</Text>
            <ArrowRight size={18} color="#0c5746" />
          </TouchableOpacity>
        </View>

        {!isCompact && (
          <View style={styles.imageWrapper}>
            <View style={styles.graphic}>
              <View style={styles.circle1} />
              <View style={styles.circle2} />
              <View style={styles.circle3} />
              <Trophy size={140} color="rgba(0, 234, 107, 0.2)" style={styles.mainIcon} />
              <View style={styles.floatingIcon1}>
                <CalendarPlus size={48} color="rgba(0, 234, 107, 0.4)" />
              </View>
              <View style={styles.floatingIcon2}>
                <MapPin size={56} color="rgba(0, 234, 107, 0.5)" />
              </View>
              <View style={styles.floatingIcon3}>
                <Users size={40} color="rgba(0, 234, 107, 0.3)" />
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0c5746',
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerCompact: {
  },
  card: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  cardCompact: {
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    padding: 48,
    justifyContent: 'center',
  },
  badgeWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.2)',
    gap: 6,
  },
  badgeText: {
    color: '#00ea6b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    marginBottom: 16,
    lineHeight: 48,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    fontFamily: 'Inter',
    lineHeight: 28,
    marginBottom: 32,
    maxWidth: 500,
  },
  subtitleCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  featuresCompact: {
    flexDirection: 'column',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 12,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    ...(Platform.OS === 'web' && { transition: 'opacity 0.2s ease' } as any),
  },
  ctaText: {
    color: '#0c5746',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  imageWrapper: {
    width: 400,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphic: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 234, 107, 0.05)',
    top: -50,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    bottom: -20,
    left: -20,
  },
  circle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 234, 107, 0.06)',
    top: 40,
    left: 20,
  },
  mainIcon: {
    transform: [{ rotate: '-5deg' }],
    zIndex: 2,
  },
  floatingIcon1: {
    position: 'absolute',
    top: 60,
    right: 40,
    transform: [{ rotate: '15deg' }],
    zIndex: 3,
  },
  floatingIcon2: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    transform: [{ rotate: '-10deg' }],
    zIndex: 3,
  },
  floatingIcon3: {
    position: 'absolute',
    bottom: 80,
    right: 60,
    transform: [{ rotate: '5deg' }],
    zIndex: 3,
  },
});
