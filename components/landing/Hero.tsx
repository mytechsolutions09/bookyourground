import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Tonight&apos;s perfect slot</Text>
              <Text style={styles.cardBadge}>Live</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardVenueRow}>
                <View style={styles.venueAvatar}>
                  <View style={styles.venueAvatarInner} />
                </View>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>Skyline Sports Arena</Text>
                  <Text style={styles.venueLocation}>Downtown • 7v7 football turf</Text>
                </View>
              </View>

              <View style={styles.cardSlotsRow}>
                <View style={styles.slotChipPrimary}>
                  <Text style={styles.slotChipPrimaryLabel}>08:00 – 09:00 PM</Text>
                  <Text style={styles.slotChipPrimarySub}>Prime time • Few spots left</Text>
                </View>
                <View style={styles.slotChipSecondary}>
                  <Text style={styles.slotChipSecondaryLabel}>06:00 – 07:00 PM</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.cardFooterStat}>
                  <Text style={styles.cardFooterStatLabel}>Surface</Text>
                  <Text style={styles.cardFooterStatValue}>FIFA-approved turf</Text>
                </View>
                <View style={styles.cardFooterStat}>
                  <Text style={styles.cardFooterStatLabel}>Price</Text>
                  <Text style={styles.cardFooterStatValue}>From ₹899 / hr</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.cardCtaButton,
                  pressed && styles.cardCtaButtonPressed,
                ]}
                onPress={() => router.push(primaryCtaTarget)}
              >
                <Text style={styles.cardCtaText}>Check all nearby grounds</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.floatingStats}>
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatNumber}>30+</Text>
              <Text style={styles.floatingStatLabel}>Cities</Text>
            </View>
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatNumber}>200+</Text>
              <Text style={styles.floatingStatLabel}>Verified venues</Text>
            </View>
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatNumber}>₹2M+</Text>
              <Text style={styles.floatingStatLabel}>Payouts to owners</Text>
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
    backgroundColor: '#020617',
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
    backgroundColor: 'rgba(56,189,248,0.12)',
    shadowColor: '#22d3ee',
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
    borderColor: 'rgba(148, 163, 184, 0.5)',
    backgroundColor: 'rgba(15,23,42,0.85)',
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
    color: '#dc8d3c',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#cbd5f5',
    maxWidth: 520,
    marginBottom: 28,
  },
  actionsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#dc8d3c',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 170,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc8d3c',
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
    color: '#111827',
  },
  secondaryButton: {
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(30,64,175,0.9)',
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
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  cardBody: {},
  cardVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  venueAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(220,141,60,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  venueAvatarInner: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#dc8d3c',
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 2,
  },
  venueLocation: {
    fontSize: 13,
    color: '#9ca3af',
  },
  cardSlotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  slotChipPrimary: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(220,141,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,141,60,0.55)',
  },
  slotChipPrimaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fed7aa',
  },
  slotChipPrimarySub: {
    fontSize: 12,
    color: '#fed7aa',
    marginTop: 2,
  },
  slotChipSecondary: {
    flex: 0.9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.85)',
  },
  slotChipSecondaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardFooterStat: {
    flex: 1,
  },
  cardFooterStatLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardFooterStatValue: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  cardCtaButton: {
    marginTop: 2,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.7)',
  },
  cardCtaButtonPressed: {
    backgroundColor: '#020617',
  },
  cardCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  floatingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 8,
  },
  floatingStat: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(31,41,55,0.9)',
    minWidth: 90,
  },
  floatingStatNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 2,
  },
  floatingStatLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
