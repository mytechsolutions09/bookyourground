import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Award, Trophy } from 'lucide-react-native';

export default function CricketTrophies() {
  return (
    <View style={styles.container}>
      <View style={styles.statusBox}>
        <Trophy size={40} color="#01b854" />
        <Text style={styles.statusTitle}>No Trophies Yet</Text>
        <Text style={styles.statusSubtitle}>Win tournaments to showcase your glory here!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  statusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    fontFamily: 'Inter',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Inter',
  },
});
