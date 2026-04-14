import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayCircle } from 'lucide-react-native';

export default function CricketHighlights() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.placeholderIconArea}><PlayCircle size={48} color="#01b854" /></View>
      <Text style={styles.placeholderTitle}>Match Highlights</Text>
      <Text style={styles.placeholderDesc}>Relive the best moments from recent matches. Watch videos and view gallery of top plays.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderIconArea: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
