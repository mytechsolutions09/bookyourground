import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Search, MapPin, Users, Info, ChevronRight, Activity } from 'lucide-react-native';

export default function Hero() {
  const { user, profile } = useAuth();
  const isLoggedIn = !!user || !!profile;
  const { width } = useWindowDimensions();
  const showRightColumn = Platform.OS === 'web' && width >= 900;

  const primaryCtaTarget = isLoggedIn ? '/(tabs)/bookings' : '/(auth)/signup';
  const secondaryCtaTarget = isLoggedIn ? '/(tabs)/profile' : '/(auth)/login';

  const primaryCtaLabel = isLoggedIn ? 'Continue booking' : 'Start playing today';
  const secondaryCtaLabel = isLoggedIn ? 'View profile' : 'Sign in';

  return (
    <View style={styles.root}>
      <View style={styles.backgroundGlow} />

      <View style={styles.container}>
        <View style={styles.leftColumn}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>BookYourGround</Text>
            <Text style={styles.pillDot}>•</Text>
            <Text style={styles.pillText}>From search to first whistle in minutes</Text>
          </View>

          <Text style={styles.title}>
            Game-ready grounds,
            {'\n'}
            <Text style={styles.titleAccent}>just a tap away.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Browse curated football, cricket, and multi-sport venues with live availability, smart
            filters, and instant confirmation. No calls, no confusion—just perfect slots for your
            next match.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={() => router.push(primaryCtaTarget)}
            >
              <Text style={styles.primaryButtonText}>{primaryCtaLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={() => router.push(secondaryCtaTarget)}
            >
              <Text style={styles.secondaryButtonText}>{secondaryCtaLabel}</Text>
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaGroup}>
              <Text style={styles.metaNumber}>4.9</Text>
              <Text style={styles.metaLabel}>Average player rating</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaGroup}>
              <Text style={styles.metaNumber}>10k+</Text>
              <Text style={styles.metaLabel}>Hours booked this season</Text>
            </View>
          </View>
        </View>

        {showRightColumn && (
          <View style={styles.rightColumn}>
            <View style={styles.discoveryCard}>
              <View style={styles.discoveryHero}>
                <View style={styles.liveIndicator}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveText}>Live Availability</Text>
                </View>
                <Text style={styles.discoveryTitle}>Find your next match</Text>
                <Text style={styles.discoverySubtitle}>Real-time slots at 50+ venues</Text>
              </View>

              <View style={styles.discoveryBody}>
                <View style={styles.quickSearch}>
                  <Search size={18} color="#9CA3AF" />
                  <Text style={styles.quickSearchPlaceholder}>Search by city or venue name...</Text>
                </View>

                <View style={styles.miniStatsRow}>
                  <View style={styles.miniStatItem}>
                    <View style={styles.miniStatIcon}>
                      <Users size={16} color="#00ea6b" />
                    </View>
                    <View>
                      <Text style={styles.miniStatValue}>1,240+</Text>
                      <Text style={styles.miniStatLabel}>Players Online</Text>
                    </View>
                  </View>
                  <View style={styles.miniStatItem}>
                    <View style={[styles.miniStatIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                      <Activity size={16} color="#38bdf8" />
                    </View>
                    <View>
                      <Text style={styles.miniStatValue}>84</Text>
                      <Text style={styles.miniStatLabel}>Slots Available</Text>
                    </View>
                  </View>
                </View>

                <Pressable 
                  style={({ pressed }) => [
                    styles.discoveryCta,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={() => router.push('/(tabs)/grounds' as any)}
                >
                  <Text style={styles.discoveryCtaText}>Explore All Grounds</Text>
                  <ChevronRight size={18} color="#043529" />
                </Pressable>
              </View>
            </View>

            <View style={styles.statsHorizontal}>
              <View style={styles.hStat}>
                <Text style={styles.hStatNum}>30+</Text>
                <Text style={styles.hStatLab}>Cities</Text>
              </View>
              <View style={styles.hStatDivider} />
              <View style={styles.hStat}>
                <Text style={styles.hStatNum}>200+</Text>
                <Text style={styles.hStatLab}>Venues</Text>
              </View>
              <View style={styles.hStatDivider} />
              <View style={styles.hStat}>
                <Text style={styles.hStatNum}>₹2M+</Text>
                <Text style={styles.hStatLab}>Payouts</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#043529',
    paddingVertical: Platform.OS === 'web' ? 48 : 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        minHeight: '115vh' as any,
      },
    }),
  },
  backgroundGlow: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(0,234,107,0.12)',
    shadowColor: '#00ea6b',
    shadowOpacity: Platform.OS === 'web' ? 0.6 : 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 80,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 32,
  },
  leftColumn: {
    flex: 1.1,
    justifyContent: 'center',
  },
  rightColumn: {
    flex: 0.9,
    marginTop: Platform.OS === 'web' ? 0 : 40,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.25)',
    backgroundColor: '#06392e', // Deep theme green
    marginBottom: 18,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  pillDot: {
    marginHorizontal: 8,
    fontSize: 13,
    color: '#6b7280',
  },
  pillText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 52 : 36,
    lineHeight: Platform.OS === 'web' ? 60 : 44,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  titleAccent: {
    color: '#00ea6b',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#e5e7eb',
    maxWidth: 520,
    marginBottom: 28,
  },
  actionsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 170,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
  },
  secondaryButton: {
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.3)',
    backgroundColor: '#06392e', // Deep theme green
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: '#06392e',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
  },
  metaGroup: {
    flexShrink: 1,
  },
  metaNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(75,85,99,0.8)',
  },
  discoveryCard: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  discoveryHero: {
    padding: 24,
    backgroundColor: 'rgba(0, 234, 107, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 234, 107, 0.1)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ea6b',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ea6b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  discoveryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 4,
  },
  discoverySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  discoveryBody: {
    padding: 24,
    gap: 20,
  },
  quickSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickSearchPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  miniStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  miniStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f9fafb',
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discoveryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ea6b',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  discoveryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
  },
  statsHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,234,107,0.05)',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.1)',
  },
  hStat: {
    alignItems: 'center',
    flex: 1,
  },
  hStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 2,
  },
  hStatLab: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  hStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,234,107,0.1)',
  },
});
