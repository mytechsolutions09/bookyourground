import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Users2 } from 'lucide-react-native';

const BATTING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '206' },
  { label: 'NO', value: '28' },
  { label: 'Runs', value: '6390' },
  { label: 'HS', value: '135' },
  { label: 'Avg', value: '35.9' },
  { label: 'SR', value: '156.54' },
  { label: '30s', value: '41' },
  { label: '50s', value: '37' },
  { label: '100s', value: '11' },
  { label: '4s', value: '756' },
  { label: '6s', value: '241' },
];

const BOWLING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '149' },
  { label: 'Overs', value: '416.3' },
  { label: 'Wkts', value: '150' },
  { label: 'Eco', value: '8.87' },
  { label: 'Avg', value: '24.63' },
];

export default function CricketStats() {
  const [subTab, setSubTab] = useState('batting');

  let currentStats = BATTING_STATS;
  if (subTab === 'bowling') currentStats = BOWLING_STATS;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.statsPromoHeader}>
         <Text style={styles.statsPromoText}>Want to improve your stats?</Text>
         <TouchableOpacity style={styles.analyzeBtn}><Text style={styles.analyzeBtnText}>Analyze</Text></TouchableOpacity>
      </View>

      <View style={styles.statsFilterBar}>
        {['Batting', 'Bowling', 'Fielding', 'Captain'].map((label) => (
          <TouchableOpacity 
            key={label}
            style={[styles.statPill, subTab === label.toLowerCase() && styles.statPillActive]} 
            onPress={() => setSubTab(label.toLowerCase())}
          >
            <Text style={[styles.statPillText, subTab === label.toLowerCase() && styles.statPillTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContent}>
         <View style={styles.statsSectionHeader}>
            <Text style={styles.statsSectionTitle}>Overall Performance</Text>
            <TouchableOpacity style={styles.compareBtn}>
               <Users2 size={14} color="#FFFFFF" strokeWidth={2.5} />
               <Text style={styles.compareBtnText}>Compare</Text>
            </TouchableOpacity>
         </View>

         <View style={styles.statsGrid}>
            {currentStats.map((stat, idx) => (
              <View key={idx} style={styles.statTile}>
                 <Text style={styles.statValue}>{stat.value}</Text>
                 <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
         </View>

         <View style={styles.adBanner}>
            <Image source={{ uri: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg' }} style={styles.adImage} />
            <View style={styles.adOverlay}>
               <Text style={styles.adTitle}>Amazon Prime{'\n'}<Text style={styles.adTitleBold}>Join Prime at ₹125/month*</Text></Text>
               <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Install now</Text></TouchableOpacity>
            </View>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsPromoHeader: {
    padding: 16,
    backgroundColor: '#01b854',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsPromoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  analyzeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  analyzeBtnText: {
    color: '#01b854',
    fontWeight: '800',
    fontSize: 13,
  },
  statsFilterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statPillTextActive: {
    color: '#FFFFFF',
  },
  statsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statTile: {
    width: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  adBanner: {
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  adTitleBold: {
    fontWeight: '900',
  },
  adBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  adBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
