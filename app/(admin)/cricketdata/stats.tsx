import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { BarChart2, PieChart, TrendingUp } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

export default function AdminCricketStats() {
  const content = (
    <CricketSubbar>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View />
        </View>

        <View style={styles.grid}>
          <Card style={styles.statBox}>
             <TrendingUp size={24} color="#10b981" />
             <Text style={styles.statLabel}>Participation Growth</Text>
             <Text style={styles.statNumber}>+24%</Text>
          </Card>
          <Card style={styles.statBox}>
             <BarChart2 size={24} color="#6366F1" />
             <Text style={styles.statLabel}>Avg. Runs/Match</Text>
             <Text style={styles.statNumber}>284</Text>
          </Card>
        </View>

        <Card style={styles.placeholderCard}>
          <BarChart2 size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
          <Text style={styles.placeholderTitle}>Advanced Analytics</Text>
          <Text style={styles.placeholderText}>
            This section will eventually provide detailed player rankings, venue scoring patterns, and historical match data visualizations.
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
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 20,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
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
