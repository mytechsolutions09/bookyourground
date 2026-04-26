import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Users, Sword, Trophy, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

export default function FindOpposition() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          <View style={styles.textContainer}>
            <View style={styles.badge}>
              <Users size={14} color="#01b854" strokeWidth={3} />
              <Text style={styles.badgeText}>MATCHMAKING</Text>
            </View>
            
            <Text style={styles.title}>Find an Opposition</Text>
            <Text style={styles.subtitle}>
              Ready for a challenge? Connect with teams in your area for friendly or competitive matches. 
              Find the perfect opponents that match your skill level and play style.
            </Text>

            <View style={styles.featuresRow}>
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
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => router.push('/(tabs)/find-an-opponent' as any)}
            >
              <Text style={styles.ctaText}>Find a Match</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={[styles.imagePlaceholder, isMobile && styles.imagePlaceholderMobile]}>
            {/* Using a stylized visual representation of teams */}
            <View style={styles.teamCard1}>
              <View style={styles.teamAvatarPlaceholder} />
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>Strikers FC</Text>
                <Text style={styles.teamRank}>Rank #4 • Pro Level</Text>
              </View>
              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>VS</Text>
              </View>
            </View>
            
            <View style={styles.teamCard2}>
              <View style={[styles.teamAvatarPlaceholder, { backgroundColor: '#F0FDF4' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>United Kings</Text>
                <Text style={styles.teamRank}>Rank #12 • Semi-Pro</Text>
              </View>
              <View style={styles.matchStatus}>
                <Text style={styles.matchStatusText}>Live</Text>
              </View>
            </View>

            <View style={styles.glowEffect} />
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
    paddingVertical: 80,
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
    gap: 40,
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
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 20,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 32,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
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
    backgroundColor: '#01b854',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    alignSelf: 'flex-start',
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  imagePlaceholder: {
    flex: 1,
    height: 400,
    backgroundColor: '#F8FAFC',
    borderRadius: 32,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholderMobile: {
    width: '100%',
    height: 300,
  },
  teamCard1: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    position: 'absolute',
    top: '20%',
    left: '10%',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamCard2: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  teamRank: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#0F172A',
    borderRadius: 6,
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  matchStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  matchStatusText: {
    color: '#01b854',
    fontSize: 10,
    fontWeight: '900',
  },
  glowEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(1, 184, 84, 0.05)',
    transform: [{ translateX: -100 }, { translateY: -100 }],
  }
});
