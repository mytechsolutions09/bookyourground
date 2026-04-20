import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';

export default function CricketPhotos() {
  return (
    <View style={styles.container}>
      <View style={styles.statusBox}>
        <Camera size={40} color="#01b854" />
        <Text style={styles.statusTitle}>No Photos Uploaded</Text>
        <Text style={styles.statusSubtitle}>Share your match moments with the community.</Text>
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
