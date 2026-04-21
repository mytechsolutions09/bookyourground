import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, Animated, Easing, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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

  const [matchCount, setMatchCount] = React.useState(0);
  const [onlinePlayers, setOnlinePlayers] = React.useState(1240);
  const [heroSearchQuery, setHeroSearchQuery] = React.useState('');
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fetch real match count
    const fetchStats = async () => {
      try {
        const todayISO = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.rpc('get_open_matchmaking_bookings', { p_today: todayISO });
        if (!error && data) {
          setMatchCount(data.length);
        }
      } catch (err) {
        console.warn('Hero stats fetch error:', err);
      }
    };

    fetchStats();
    
    // Simulate active player fluctuations
    const interval = setInterval(() => {
      setOnlinePlayers(prev => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleHeroSearch = () => {
    if (!heroSearchQuery.trim()) return;
    router.push({
      pathname: '/search',
      params: { q: heroSearchQuery.trim() }
    } as any);
  };

  return (
    <View style={[styles.root, Platform.OS === 'web' && { paddingVertical: width < 900 ? 24 : 48 }]}>
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
                  <Animated.View style={[styles.livePulse, { opacity: pulseAnim }]} />
                  <Text style={styles.liveText}>Live Availability</Text>
                </View>
                <Text style={styles.discoveryTitle}>Find your next match</Text>
                <Text style={styles.discoverySubtitle}>Real-time slots at 50+ venues</Text>
              </View>

              <View style={styles.discoveryBody}>
                <View style={styles.quickSearch}>
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.heroSearchInput}
                    placeholder="Search by city or venue name..."
                    placeholderTextColor="#9CA3AF"
                    value={heroSearchQuery}
                    onChangeText={setHeroSearchQuery}
                    onSubmitEditing={handleHeroSearch}
                    returnKeyType="search"
                  />
                </View>

                <View style={styles.miniStatsRow}>
                  <View style={styles.miniStatItem}>
                    <View style={styles.miniStatIcon}>
                      <Users size={16} color="#01b854" />
                    </View>
                    <View>
                      <Text style={styles.miniStatValue}>{onlinePlayers.toLocaleString()}+</Text>
                      <Text style={styles.miniStatLabel}>Players Online</Text>
                    </View>
                  </View>
                  <View style={styles.miniStatItem}>
                    <View style={[styles.miniStatIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                      <Activity size={16} color="#38bdf8" />
                    </View>
                    <View>
                      <Text style={styles.miniStatValue}>{matchCount || 84}</Text>
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
                  <ChevronRight size={18} color="#FFFFFF" />
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
    paddingVertical: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        minHeight: '110vh' as any,
      },
    }),
  },
  backgroundGlow: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 400,
    height: 400,
    borderRadius: 999,
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
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
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 18,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  pillDot: {
    marginHorizontal: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  pillText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 52 : 36,
    lineHeight: Platform.OS === 'web' ? 60 : 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -1.2,
    fontFamily: 'Inter',
  },
  titleAccent: {
    color: '#00ea6b',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 520,
    marginBottom: 28,
    fontFamily: 'Inter',
  },
  actionsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 170,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  secondaryButton: {
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  metaLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter',
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  discoveryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  discoveryHero: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Inter',
  },
  discoveryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  discoverySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter',
  },
  discoveryBody: {
    padding: 24,
    gap: 20,
  },
  quickSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
    fontFamily: 'Inter',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    }) as any,
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  miniStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter',
  },
  discoveryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  discoveryCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  statsHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hStat: {
    alignItems: 'center',
    flex: 1,
  },
  hStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  hStatLab: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  hStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
