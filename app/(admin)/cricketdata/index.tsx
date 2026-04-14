import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, RefreshCcw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

export default function AdminCricketOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalMatches: 0, liveMatches: 0, completedMatches: 0 });

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          match_live_state (*),
          innings (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setMatches(data);
        const live = data.filter(m => m.status === 'live' || !!m.match_live_state).length;
        const completed = data.filter(m => m.status === 'completed').length;
        setStats({
          totalMatches: data.length,
          liveMatches: live,
          completedMatches: completed
        });
      }
    } catch (err) {
      console.error('Error fetching admin cricket data:', err);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <CricketSubbar>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View />
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchMatches}>
            <RefreshCcw size={18} color="#10b981" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statsCard}>
            <Text style={styles.statsLabel}>Total Matches</Text>
            <Text style={styles.statsValue}>{stats.totalMatches}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Text style={styles.statsLabel}>Live Now</Text>
            <Text style={[styles.statsValue, { color: '#ef4444' }]}>{stats.liveMatches}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Text style={styles.statsLabel}>Completed</Text>
            <Text style={styles.statsValue}>{stats.completedMatches}</Text>
          </Card>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          <Button 
            variant="outline" 
            size="small" 
            title="New Match" 
            icon={Plus} 
            onPress={() => router.push('/cricket/scoring')}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matches found.</Text>
          </View>
        ) : (
          <View style={styles.matchList}>
            {matches.map((match) => (
              <TouchableOpacity 
                key={match.id} 
                style={styles.matchItem}
                onPress={() => router.push(`/live/${match.id}`)}
              >
                <View style={styles.matchInfo}>
                  <View style={styles.teamRow}>
                    <Text style={styles.teamName}>{match.team_a}</Text>
                    <Text style={styles.vs}>vs</Text>
                    <Text style={styles.teamName}>{match.team_b}</Text>
                  </View>
                  <Text style={styles.matchMeta}>
                    {new Date(match.created_at).toLocaleDateString()} • {match.venue || 'No Venue'}
                  </Text>
                </View>
                <View style={styles.matchStatus}>
                  <View style={[
                    styles.statusBadge,
                    match.status === 'live' ? styles.statusLive : (match.status === 'completed' ? styles.statusResult : styles.statusUpcoming)
                  ]}>
                    <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statsCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  matchList: {
    gap: 12,
  },
  matchItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchInfo: {
    flex: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  vs: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  matchMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusLive: {
    backgroundColor: '#FEF2F2',
  },
  statusResult: {
    backgroundColor: '#F3F4F6',
  },
  statusUpcoming: {
    backgroundColor: '#EFF6FF',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
