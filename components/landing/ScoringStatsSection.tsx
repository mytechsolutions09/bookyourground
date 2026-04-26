import React from 'react';
import { View, Text, StyleSheet, Image, Platform, useWindowDimensions, Pressable } from 'react-native';
import { Trophy, Target, Zap, Activity, Users2, Award, Swords } from 'lucide-react-native';

export default function ScoringStatsSection() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;

  const features = [
    {
      icon: <Zap size={24} color="#01b854" />,
      title: "Real-time Scoring",
      description: "Digital scoreboards for every match. Track runs, wickets, and overs live as they happen."
    },
    {
      icon: <Activity size={24} color="#01b854" />,
      title: "Deep Analytics",
      description: "Comprehensive player stats including strike rate, economy, and performance charts."
    },
    {
      icon: <Trophy size={24} color="#01b854" />,
      title: "Leaderboards",
      description: "See where you stand. Compete for the top spot in city-wide and tournament rankings."
    },
    {
      icon: <Award size={24} color="#01b854" />,
      title: "Achievements",
      description: "Earn badges and trophies for your milestones. Build your legacy on the field."
    }
  ];

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={[styles.content, isWeb && !isMobile && styles.contentWeb]}>
          
          <View style={styles.textColumn}>
            <View style={styles.badge}>
              <Activity size={14} color="#01b854" style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>ELITE ANALYTICS</Text>
            </View>
            
            <Text style={styles.title}>
              Don't just play.{'\n'}
              <Text style={styles.titleAccent}>Analyze and Conquer.</Text>
            </Text>
            
            <Text style={styles.description}>
              Elevate your game with our professional-grade scoring and statistics engine. 
              From local box cricket to major tournaments, every ball counts.
            </Text>

            <View style={styles.featuresGrid}>
              {features.map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    {f.icon}
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDescription}>{f.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.imageColumn}>
            <View style={styles.statsPreviewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.profileInfo}>
                  <View style={styles.avatarPlaceholder} />
                  <View>
                    <Text style={styles.playerName}>Abhishek Sharma</Text>
                    <Text style={styles.playerRole}>Top Order Batter</Text>
                  </View>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#1 RANK</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>2,482</Text>
                  <Text style={styles.statLabel}>Total Runs</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>164.5</Text>
                  <Text style={styles.statLabel}>Strike Rate</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>42.8</Text>
                  <Text style={styles.statLabel}>Average</Text>
                </View>
              </View>

              <View style={styles.chartPlaceholder}>
                <View style={styles.chartBars}>
                  {[40, 75, 55, 90, 65, 85, 50].map((h, i) => (
                    <View key={i} style={[styles.chartBar, { height: h, backgroundColor: i === 3 ? '#01b854' : '#F1F5F9' }]} />
                  ))}
                </View>
                <Text style={styles.chartLabelText}>Last 7 Matches Performance</Text>
              </View>

              <View style={styles.milestoneRow}>
                <Swords size={18} color="#01b854" />
                <Text style={styles.milestoneText}>Recently scored 84* (32 balls) at Gurugram Stadium</Text>
              </View>
            </View>

            {/* Floating decoration */}
            <View style={styles.floatingDecoration} />
          </View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
  },
  container: {
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  content: {
    flexDirection: 'column',
    gap: 32,
  },
  contentWeb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  imageColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043529',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    color: '#01b854',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: Platform.OS === 'web' ? 48 : 38,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  titleAccent: {
    color: '#01b854', 
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'Inter',
  },
  featuresGrid: {
    gap: 32,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#043529',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  statsPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  playerRole: {
    fontSize: 12,
    color: '#64748B',
  },
  rankBadge: {
    backgroundColor: '#01b854',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#043529',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartPlaceholder: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    marginBottom: 12,
  },
  chartBar: {
    width: '10%',
    borderRadius: 4,
  },
  chartLabelText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  milestoneText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  floatingDecoration: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    zIndex: 1,
  }
});
