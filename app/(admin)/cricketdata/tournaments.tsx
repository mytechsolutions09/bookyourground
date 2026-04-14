import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Trophy, Plus } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';

export default function AdminCricketTournaments() {
  const content = (
    <CricketSubbar>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View />
          <Button title="Create Tournament" icon={Plus} onPress={() => {}} />
        </View>

        <Card style={styles.placeholderCard}>
          <Trophy size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
          <Text style={styles.placeholderTitle}>Tournament Engine</Text>
          <Text style={styles.placeholderText}>
            Advanced tournament management is coming soon. Features will include auto-scheduling, bracket generation, and league point tables.
          </Text>
        </Card>
      </ScrollView>
    </CricketSubbar>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholderCard: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
    marginTop: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },
});
