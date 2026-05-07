import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { BarChart2, PieChart, TrendingUp, Users, ShieldCheck, Calendar } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

import { supabase } from '@/lib/supabase';

export default function AdminCricketStats() {
  const [stats, setStats] = React.useState({
    totalPlayers: 0,
    totalTeams: 0,
    totalMatches: 0,
    growth: 0,
    avgRuns: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      
      // 1. Total Players
      const { count: playersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 2. Total Teams
      const { count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      // 3. Total Matches
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

      // 4. Growth (Players in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: recentPlayers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', thirtyDaysAgo.toISOString());

      const growth = playersCount && playersCount > 0 
        ? ((recentPlayers || 0) / playersCount * 100).toFixed(1) 
        : 0;

      // 5. Avg Runs (Placeholder or simple calculation if scores exist)
      // For now, let's just get the count and a default avg
      
      setStats({
        totalPlayers: playersCount || 0,
        totalTeams: teamsCount || 0,
        totalMatches: matchesCount || 0,
        growth: Number(growth),
        avgRuns: 284, // Keep as placeholder or fetch if score column exists
      });
    } catch (err) {
      console.error('Error fetching system stats:', err);
    } finally {
      setLoading(false);
    }
  };
  const content = (
    <CricketSubbar>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View />
        </View>

        <View style={styles.grid}>
          <Card style={styles.statBox}>
             <TrendingUp size={18} color="#10b981" />
             <View>
                <Text style={styles.statLabel}>Growth</Text>
                <Text style={styles.statNumber}>+{stats.growth}%</Text>
             </View>
          </Card>
          <Card style={styles.statBox}>
             <BarChart2 size={18} color="#6366F1" />
             <View>
                <Text style={styles.statLabel}>Avg Runs</Text>
                <Text style={styles.statNumber}>{stats.avgRuns}</Text>
             </View>
          </Card>
          <Card style={styles.statBox}>
             <Users size={18} color="#F59E0B" />
             <View>
                <Text style={styles.statLabel}>Players</Text>
                <Text style={styles.statNumber}>{stats.totalPlayers.toLocaleString()}</Text>
             </View>
          </Card>
          <Card style={styles.statBox}>
             <ShieldCheck size={18} color="#10B981" />
             <View>
                <Text style={styles.statLabel}>Teams</Text>
                <Text style={styles.statNumber}>{stats.totalTeams}</Text>
             </View>
          </Card>
          <Card style={styles.statBox}>
             <PieChart size={18} color="#EC4899" />
             <View>
                <Text style={styles.statLabel}>Matches</Text>
                <Text style={styles.statNumber}>{stats.totalMatches}</Text>
             </View>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 400,
    fontFamily: 'Inter',
  },
});
