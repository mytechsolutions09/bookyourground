import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Users, Sword, Trophy, ArrowRight, Star, Shield, Crown, BarChart2, Check, Target } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';

export default function FindOpposition() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Animation values (preserving the exact fluid enter animations)
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const card1X = useSharedValue(-50);
  const card2X = useSharedValue(50);
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withTiming(0, { duration: 800 });
    card1X.value = withDelay(400, withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }));
    card2X.value = withDelay(600, withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }));
    
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  const card1Style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: card1X.value }]
  }));

  const card2Style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: card2X.value }]
  }));

  return (
    <View style={[styles.root, isMobile && { paddingVertical: 60 }]}>
      <View style={styles.container}>
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          
          {/* Left Text and CTA Section */}
          <Animated.View style={[
            styles.textContainer, 
            animatedTextStyle,
            isMobile && { alignItems: 'center' }
          ]}>
            <TouchableOpacity 
              style={[styles.badge, isMobile && { alignSelf: 'center' }]}
              onPress={() => router.push('/find-an-opponent' as any)}
            >
              <Users size={14} color="#01b854" strokeWidth={3} />
              <Text style={styles.badgeText}>FIND AN OPPOSITION</Text>
            </TouchableOpacity>
            
            <Text style={[styles.title, isMobile && { textAlign: 'center' }]}>
              Find an{"\n"}<Text style={{ color: '#01b854' }}>Opposition</Text>
            </Text>
            
            <Text style={[styles.subtitle, isMobile && { textAlign: 'center' }]}>
              Connect with top cricket teams in your area for competitive matches. 
              Find the perfect opponents that match your skill level and play style.
            </Text>

            {/* Feature Cards Grid */}
            <View style={[styles.featuresRow, isMobile && { flexDirection: 'column', width: '100%' }]}>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Target size={20} color="#01b854" strokeWidth={2.5} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Skill Matching</Text>
                  <Text style={styles.featureDesc}>Get matches that fit your level</Text>
                </View>
              </View>
              
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Trophy size={20} color="#01b854" strokeWidth={2.5} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Leaderboards</Text>
                  <Text style={styles.featureDesc}>Compete & climb the rankings</Text>
                </View>
              </View>
            </View>

            {/* Call To Action Button */}
            <Pressable 
              style={({ pressed }) => [
                styles.ctaButton,
                isMobile && { alignSelf: 'center' },
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }
              ]}
              onPress={() => router.push('/(tabs)/find-an-opponent' as any)}
            >
              <View style={styles.ctaLeft}>
                <Sword size={18} color="#01b854" strokeWidth={2.5} style={{ marginRight: 8, transform: [{ rotate: '45deg' }] }} />
                <Text style={styles.ctaText}>Find a Match</Text>
              </View>
              <View style={styles.ctaArrowCircle}>
                <ArrowRight size={18} color="#043529" strokeWidth={3} />
              </View>
            </Pressable>

            {/* Bottom Highlights Row */}
            <View style={[styles.bulletsRow, isMobile && { justifyContent: 'center', flexWrap: 'wrap', gap: 12 }]}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletCheckCircle}>
                  <Check size={12} color="#01b854" strokeWidth={3} />
                </View>
                <Text style={styles.bulletText}>Verified Teams</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletCheckCircle}>
                  <Check size={12} color="#01b854" strokeWidth={3} />
                </View>
                <Text style={styles.bulletText}>Fair Play</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletCheckCircle}>
                  <Check size={12} color="#01b854" strokeWidth={3} />
                </View>
                <Text style={styles.bulletText}>Competitive Matches</Text>
              </View>
            </View>
          </Animated.View>

          {/* Right Cricket Field and Matchup Cards Section */}
          <View style={[styles.imagePlaceholder, isMobile && styles.imagePlaceholderMobile]}>
            {/* The Cricket Field grass graphic */}
            <View style={[styles.fieldBg, isMobile && styles.fieldBgMobile]}>
              {/* Outer boundary circle line */}
              <View style={styles.fieldBoundaryLine} />
              
              {/* Center pitch circle line */}
              <View style={styles.fieldCenterCircle} />
              
              {/* The Tan Pitch in the center */}
              <View style={styles.pitch}>
                <View style={styles.pitchCrease} />
                <View style={styles.pitchCrease} />
              </View>
            </View>

            {/* Central VS Badge */}
            <View style={styles.centerVsCircle}>
              <Text style={styles.centerVsText}>VS</Text>
            </View>

            {/* Team Card 1: Strikers FC */}
            <Animated.View style={[styles.teamCard1, card1Style, isMobile && styles.teamCardMobile]}>
              <View style={styles.logoAndName}>
                <View style={styles.logoContainer}>
                  <Sword size={18} color="#dcc093" strokeWidth={2.5} style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.teamName}>Strikers FC</Text>
                  <View style={styles.rankRow}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.rankText}>Rank #4 • Pro Level</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Shield size={14} color="#01b854" />
                  <Text style={styles.statVal}>87</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Users size={14} color="#01b854" />
                  <Text style={styles.statVal}>12</Text>
                  <Text style={styles.statLabel}>Players</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <BarChart2 size={14} color="#01b854" />
                  <Text style={styles.statVal}>92%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>

              <View style={styles.cardVsBadge}>
                <Text style={styles.cardVsText}>VS</Text>
              </View>
            </Animated.View>

            {/* Team Card 2: United Kings */}
            <Animated.View style={[styles.teamCard2, card2Style, isMobile && styles.teamCardMobile]}>
              <View style={styles.logoAndName}>
                <View style={styles.logoContainer}>
                  <Crown size={18} color="#dcc093" strokeWidth={2.5} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.teamName}>United Kings</Text>
                  <View style={styles.rankRow}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.rankText}>Rank #12 • Semi-Pro</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Shield size={14} color="#01b854" />
                  <Text style={styles.statVal}>82</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Users size={14} color="#01b854" />
                  <Text style={styles.statVal}>11</Text>
                  <Text style={styles.statLabel}>Players</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <BarChart2 size={14} color="#01b854" />
                  <Text style={styles.statVal}>89%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </Animated.View>

          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'web' ? 100 : 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 80,
  },
  contentMobile: {
    flexDirection: 'column',
    textAlign: 'center',
    gap: 48,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1.1,
    maxWidth: 580,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 56 : 38,
    fontWeight: '900',
    color: '#043529',
    fontFamily: 'Inter',
    marginBottom: 20,
    letterSpacing: -1.8,
    lineHeight: Platform.OS === 'web' ? 64 : 44,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 36,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  featureCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    borderRadius: 20,
    gap: 16,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featureTextContainer: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    backgroundColor: '#043529',
    shadowColor: '#043529',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 220,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  ctaArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ea6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 28,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  imagePlaceholder: {
    flex: 1,
    height: 480,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    width: '100%',
    maxWidth: 520,
  },
  imagePlaceholderMobile: {
    height: 420,
    marginTop: 20,
  },
  fieldBg: {
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#86B96B',
    borderWidth: 8,
    borderColor: '#73A559',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  fieldBgMobile: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  fieldBoundaryLine: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderStyle: 'dashed' as any,
  },
  fieldCenterCircle: {
    position: 'absolute',
    width: '55%',
    height: '55%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pitch: {
    position: 'absolute',
    width: 44,
    height: 140,
    backgroundColor: '#dcc093',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pitchCrease: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    width: '100%',
  },
  centerVsCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#043529',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  centerVsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  teamCard1: {
    width: 340,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    position: 'absolute',
    top: '4%',
    left: '-8%',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamCard2: {
    width: 340,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    position: 'absolute',
    bottom: '4%',
    right: '-8%',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamCardMobile: {
    width: '90%',
    left: '5%',
    right: '5%',
    position: 'absolute',
  },
  logoAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#043529',
    borderWidth: 1.5,
    borderColor: '#dcc093',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rankText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  cardVsBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#043529',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardVsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  liveBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  liveText: {
    color: '#01b854',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
});
