import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronLeft, CloudRain, Shield, AlertCircle } from 'lucide-react-native';

export default function RainRefundBlog() {
  return (
    <WebLayout>
      <Stack.Screen options={{ title: 'Rain Refund Policy - Blog' }} />
      <ScrollView style={styles.container}>
        <View style={styles.hero}>
           <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/blog' as any)}>
              <ChevronLeft size={20} color="#6B7280" />
              <Text style={styles.backText}>Back to Blog</Text>
           </TouchableOpacity>
           <Text style={styles.category}>PLATFORM UPDATES</Text>
           <Text style={styles.title}>Rain Playing Spoilsport? We've Got You Covered!</Text>
           <View style={styles.meta}>
              <Text style={styles.metaItem}>May 21, 2026</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaItem}>3 min read</Text>
           </View>
        </View>

        <Image 
          source={require('@/assets/images/rain-refund.png')} 
          style={styles.heroImage} 
        />

        <View style={styles.content}>
           <Text style={styles.paragraph}>
              There's nothing quite as exciting as turning up to the ground on a Sunday morning, kit bag in hand, ready for a cracking game of T20 cricket. But as every cricketer knows, there is one opponent we can't beat: <Text style={styles.bold}>the weather</Text>.
           </Text>
           <Text style={styles.paragraph}>
              Rain interruptions have always been a gray area in amateur cricket. How much do you pay if the game is washed out? What if you only batted for 10 overs? We heard your concerns, and at <Text style={styles.bold}>BookYourGround (BYG)</Text>, we believe in keeping things fair, transparent, and strictly by the book.
           </Text>
           <Text style={styles.paragraph}>
              That's why we're rolling out our <Text style={styles.bold}>Official T20 Rain Refund Policy</Text>—designed so you know exactly where you stand if the skies open up.
           </Text>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <CloudRain size={24} color="#0D9488" />
                 <Text style={styles.sectionTitle}>The T20 Rain Refund Breakdown</Text>
              </View>
              <Text style={styles.paragraph}>
                 Since BYG matches are predominantly T20s (20 overs), we've adopted a clean, simple rule based on innings and overs—very similar to how professional leagues handle rain interruptions. Here is exactly what you get back if your match gets rained out:
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableHeaderText}>Situation</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableHeaderText}>Refund %</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableHeaderText}>Example (₹10k)</Text></View>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableText}>No toss yet</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableText}>100%</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableText}>₹10,000</Text></View>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableText}>1st innings {'<'} 6 overs</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableText}>75%</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableText}>₹7,500</Text></View>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableText}>1st innings 6-20 overs</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableText}>50%</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableText}>₹5,000</Text></View>
                </View>
                <View style={styles.tableRow}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableText}>1st innings complete, 2nd innings {'<'} 6 overs</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableText}>25%</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableText}>₹2,500</Text></View>
                </View>
                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.tableCellLeft}><Text style={styles.tableText}>2nd innings 6+ overs</Text></View>
                  <View style={styles.tableCellCenter}><Text style={styles.tableText}>0%</Text></View>
                  <View style={styles.tableCellRight}><Text style={styles.tableText}>₹0</Text></View>
                </View>
              </View>
           </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <AlertCircle size={24} color="#0D9488" />
                 <Text style={styles.sectionTitle}>What About Platform Fees?</Text>
              </View>
              <Text style={styles.paragraph}>
                 It takes resources to keep the platform running smoothly and reserve your slots. For this reason, <Text style={styles.bold}>platform and convenience fees are non-refundable once a match is successfully booked.</Text> If you qualify for a partial refund, that percentage is calculated strictly on the base ground price.
              </Text>
           </View>

           <View style={styles.conclusion}>
              <Shield size={48} color="#0D9488" style={{ marginBottom: 16 }} />
              <Text style={styles.conclusionTitle}>Book With Confidence</Text>
              <Text style={styles.conclusionText}>
                 Our goal at BYG is to make sure you spend less time arguing over ground fees and more time focusing on your cover drive. With our new transparent refund policy, your wallet is protected when the weather takes a turn for the worse.
              </Text>
           </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Ready for your next match?</Text>
           <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/cricket' as any)}>
              <Text style={styles.ctaText}>Book a Ground Now</Text>
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
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  tableCellLeft: {
    flex: 2,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  tableCellCenter: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 14,
  },
  tableText: {
    color: '#4B5563',
    fontSize: 14,
  },
  conclusion: { marginTop: 40, padding: 32, backgroundColor: '#F0FDFA', borderRadius: 24, alignItems: 'center' },
  conclusionTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 12 },
  conclusionText: { fontSize: 15, color: '#134E48', textAlign: 'center', lineHeight: 26 },
  footer: { padding: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  ctaBtn: { backgroundColor: '#0D9488', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
