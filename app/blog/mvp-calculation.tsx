import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronLeft, Trophy, Swords, Target, Shield } from 'lucide-react-native';

export default function MVPCalculationBlog() {
  return (
    <WebLayout>
      <Stack.Screen options={{ title: 'How MVP is Calculated - Blog' }} />
      <ScrollView style={styles.container}>
        <View style={styles.hero}>
           <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/blog' as any)}>
              <ChevronLeft size={20} color="#6B7280" />
              <Text style={styles.backText}>Back to Blog</Text>
           </TouchableOpacity>
           <Text style={styles.category}>PLATFORM INSIGHTS</Text>
           <Text style={styles.title}>How Most Valuable Player (MVP) is Calculated?</Text>
           <View style={styles.meta}>
              <Text style={styles.metaItem}>April 13, 2026</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaItem}>5 min read</Text>
           </View>
        </View>

        <Image 
          source={{ uri: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' }} 
          style={styles.heroImage} 
        />

        <View style={styles.content}>
           <Text style={styles.paragraph}>
              In the heat of a live cricket match, every run scored, every wicket taken, and every catch held contributes to the final outcome. But who truly made the biggest difference? At Book your ground, we use a sophisticated MVP (Most Valuable Player) algorithm inspired by professional broadcasting standards to answer that very question.
           </Text>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <Swords size={24} color="#0D9488" />
                 <Text style={styles.sectionTitle}>Batting: Impact Over Quantity</Text>
              </View>
              <Text style={styles.paragraph}>
                 Runs are the lifeblood of cricket, but we reward the quality and intent behind them using the "10 Runs = 1 MVP Point" convention:
              </Text>
              <View style={styles.bulletList}>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Base Points:</Text> 0.1 point per run scored.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Strike Rate Bonus:</Text> Extra points if your Strike Rate is higher than the team's average.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Par Score Bonus:</Text> A 10% bonus for every run scored beyond your position's expected par.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Milestones:</Text> +0.5 for a 50, and +1.0 for a century.</Text>
              </View>
           </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <Target size={24} color="#0D9488" />
                 <Text style={styles.sectionTitle}>Bowling: Precision & Pressure</Text>
              </View>
              <Text style={styles.paragraph}>
                 Wicket values are dynamic and depend on the format and the specific batter dismissed:
              </Text>
              <View style={styles.bulletList}>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Dynamic Wickets:</Text> Base points (e.g., 1.8 for T20) adjusted by the batter's position (1-11).</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>The Par Bonus:</Text> Huge rewards for dismissing a top batter before they reach their expected score.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Format Scaling:</Text> Wickets are worth more in shorter matches where they are harder to get.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Multi-Wicket:</Text> +0.5 for 3 wickets, +1.0 for 5 wickets, and +1.5 for a 10-fer.</Text>
              </View>
           </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <Shield size={24} color="#0D9488" />
                 <Text style={styles.sectionTitle}>Fielding: The Game Changer</Text>
              </View>
              <Text style={styles.paragraph}>
                 Fielding points are tied to the impact of the wicket you helped create:
              </Text>
              <View style={styles.bulletList}>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Assisted (Catch/Stump):</Text> Fielder gets 20% of the total points for that wicket.</Text>
                 <Text style={styles.bullet}>• <Text style={styles.bold}>Unassisted (Direct Hit):</Text> Fielder gets 100% of the wicket points—just like a bowler!</Text>
              </View>
           </View>

           <View style={styles.conclusion}>
              <Trophy size={48} color="#0D9488" style={{ marginBottom: 16 }} />
              <Text style={styles.conclusionTitle}>The Final Calculation</Text>
              <Text style={styles.conclusionText}>
                 The MVP list you see in our Live Scorecard is a real-time accumulation of these metrics. It provides an objective, data-driven look at who is steering the match toward victory. Next time you see a player climbing the ranks, you'll know exactly what it took to get there!
              </Text>
           </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Want to see it in action?</Text>
           <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/cricket' as any)}>
              <Text style={styles.ctaText}>Explore Live Matches</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { padding: 40, alignItems: 'center', backgroundColor: '#F9FAF7' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 32 },
  backText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  category: { fontSize: 12, fontWeight: '800', color: '#0D9488', letterSpacing: 1.2, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', textAlign: 'center', lineHeight: 44, maxWidth: 800 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  metaItem: { fontSize: 13, color: '#6B7280' },
  dot: { marginHorizontal: 8, color: '#E5E7EB' },
  heroImage: { width: '100%', height: 400, resizeMode: 'cover' },
  content: { padding: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
  section: { marginBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  paragraph: { fontSize: 16, color: '#4B5563', lineHeight: 28, marginBottom: 20 },
  bulletList: { paddingLeft: 12, gap: 10 },
  bullet: { fontSize: 15, color: '#374151', lineHeight: 24 },
  bold: { fontWeight: '700', color: '#111827' },
  conclusion: { marginTop: 40, padding: 32, backgroundColor: '#F0FDFA', borderRadius: 24, alignItems: 'center' },
  conclusionTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 12 },
  conclusionText: { fontSize: 15, color: '#134E48', textAlign: 'center', lineHeight: 26 },
  footer: { padding: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  ctaBtn: { backgroundColor: '#0D9488', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
