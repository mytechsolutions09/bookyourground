import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Users, Sword, Trophy, ArrowRight, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Svg } from 'react-native-svg';

export default function FindOpposition() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Animation values
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

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.1], [0.1, 0.2])
  }));


  return (
    <View style={[styles.root, isMobile && { paddingVertical: 60 }]}>
      <View style={styles.container}>
        <View style={[styles.content, isMobile && styles.contentMobile]}>
            <Animated.View style={[
              styles.textContainer, 
              animatedTextStyle,
              isMobile && { alignItems: 'center' }
            ]}>
              <LinearGradient
                colors={['#F0FDF4', '#DCFCE7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.badge, isMobile && { alignSelf: 'center' }]}
              >
                <Users size={14} color="#01b854" strokeWidth={3} />
                <Text style={styles.badgeText}>MATCHMAKING</Text>
              </LinearGradient>
              
              <Text style={[styles.title, isMobile && { textAlign: 'center' }]}>Find an{"\n"}<Text style={{ color: '#01b854' }}>Opposition</Text></Text>
              <Text style={[styles.subtitle, isMobile && { textAlign: 'center' }]}>
                Connect with elite teams in your area for competitive matches. 
                Find the perfect opponents that match your skill level and play style.
              </Text>

              <View style={[styles.featuresRow, isMobile && { justifyContent: 'center' }]}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconBox}>
                    <Sword size={18} color="#01b854" />
                  </View>
                  <Text style={styles.featureText}>Skill Matching</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconBox}>
                    <Trophy size={18} color="#01b854" />
                  </View>
                  <Text style={styles.featureText}>Leaderboards</Text>
                </View>
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.ctaButton,
                  isMobile && { alignSelf: 'center' },
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                ]}
                onPress={() => router.push('/(tabs)/find-an-opponent' as any)}
              >
                <Text style={styles.ctaText}>Find a Match</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </Animated.View>

          <View style={[styles.imagePlaceholder, isMobile && styles.imagePlaceholderMobile]}>
            <Animated.View style={[styles.pulseCircle, pulseStyle]} />
            
            <Animated.View style={[styles.teamCard1, card1Style]}>
              <View style={styles.cardGlow} />
              <LinearGradient
                colors={['#F8FAFC', '#FFFFFF']}
                style={styles.teamAvatarPlaceholder}
              >
                <Users size={24} color="#94A3B8" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>Strikers FC</Text>
                <View style={styles.ratingRow}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.teamRank}>Rank #4 • Pro Level</Text>
                </View>
              </View>
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.vsBadge}
              >
                <Text style={styles.vsText}>VS</Text>
              </LinearGradient>
            </Animated.View>
            
            <Animated.View style={[styles.teamCard2, card2Style]}>
              <View style={styles.cardGlow} />
              <LinearGradient
                colors={['#F0FDF4', '#FFFFFF']}
                style={styles.teamAvatarPlaceholder}
              >
                <Users size={24} color="#01b854" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>United Kings</Text>
                <View style={styles.ratingRow}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.teamRank}>Rank #12 • Semi-Pro</Text>
                </View>
              </View>
              <View style={styles.matchStatus}>
                <View style={styles.liveIndicator} />
                <Text style={styles.matchStatusText}>Live</Text>
              </View>
            </Animated.View>

            {/* Decorative Connection Line */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
               {/* Just a subtle dash line using a view as fallback if Svg not easy */}
            </Svg>
            <View style={styles.connectionLine} />
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
    paddingVertical: Platform.OS === 'web' ? 80 : 40,
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
    gap: 60,
  },
  contentMobile: {
    flexDirection: 'column',
    textAlign: 'center',
    gap: 48,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 42 : 32,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 16,
    letterSpacing: -1.5,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 32,
    textAlign: 'left',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
    justifyContent: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Inter',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 100,
    gap: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(1, 184, 84, 0.4)',
    borderColor: 'rgba(0, 234, 107, 0.5)',
    borderWidth: 1,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'visible',
    minWidth: 200,
    justifyContent: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  imagePlaceholder: {
    flex: 1,
    height: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  imagePlaceholderMobile: {
    width: '100%',
    height: 380,
    marginTop: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#01b854',
    zIndex: 0,
  },
  teamCard1: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    position: 'absolute',
    top: '10%',
    left: '5%',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  teamCard2: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    position: 'absolute',
    bottom: '10%',
    right: '5%',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.1)',
  },
  teamAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  teamRank: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  vsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    gap: 6,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  matchStatusText: {
    color: '#01b854',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  connectionLine: {
    position: 'absolute',
    width: 2,
    height: '40%',
    backgroundColor: '#F1F5F9',
    zIndex: 0,
    opacity: 0.5,
  }
});
