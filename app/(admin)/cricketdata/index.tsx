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
        const review = data.filter(m => m.is_under_review).length;

        // Fetch counts for other entities
        const { count: playersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });
        const { count: tournamentsCount } = await supabase.from('tournaments').select('*', { count: 'exact', head: true });
        
        // Captains are unique player IDs in team_members with role 'captain'
        const { data: captainsData } = await supabase
          .from('team_members')
          .select('profile_id')
          .eq('role', 'captain');
        
        const uniqueCaptains = new Set(captainsData?.map(c => c.profile_id).filter(Boolean)).size;

        setStats({
          totalMatches: data.length,
          liveMatches: live,
          completedMatches: completed,
          reviewMatches: review,
          totalPlayers: playersCount || 0,
          totalTeams: teamsCount || 0,
          totalTournaments: tournamentsCount || 0,
          totalCaptains: uniqueCaptains || 0
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
        <View style={styles.compactHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle}>Cricket Overview</Text>
            <View style={styles.verticalDivider} />
            <View style={styles.compactStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Matches</Text>
                <Text style={styles.statValue}>{stats.totalMatches}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Live</Text>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.liveMatches}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>In Review</Text>
                <Text style={[styles.statValue, { color: '#EA580C' }]}>{stats.reviewMatches}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Button 
              variant="outline" 
              size="small" 
              title="New Match" 
              icon={Plus} 
              onPress={() => router.push('/cricket/scoring')}
              style={styles.newMatchBtn}
            />
            <TouchableOpacity style={styles.refreshBtnCompact} onPress={fetchMatches}>
              <RefreshCcw size={14} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.dashboardGrid}>
            <View style={styles.dashboardCard}>
               <Text style={styles.cardTitle}>Platform Scale</Text>
               <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Players</Text>
                    <Text style={styles.metricValue}>{stats.totalPlayers}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Teams</Text>
                    <Text style={styles.metricValue}>{stats.totalTeams}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Captains</Text>
                    <Text style={styles.metricValue}>{stats.totalCaptains}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Tournaments</Text>
                    <Text style={styles.metricValue}>{stats.totalTournaments}</Text>
                  </View>
               </View>
            </View>

            <View style={styles.dashboardCard}>
               <Text style={styles.cardTitle}>System Alerts</Text>
               <View style={styles.alertList}>
                 {stats.reviewMatches > 0 ? (
                   <TouchableOpacity 
                    style={styles.alertItem}
                    onPress={() => router.push('/cricketdata/matches')}
                   >
                     <View style={[styles.alertDot, { backgroundColor: '#EA580C' }]} />
                     <Text style={styles.alertText}>{stats.reviewMatches} matches require moderation review</Text>
                   </TouchableOpacity>
                 ) : (
                   <View style={styles.alertItem}>
                     <View style={[styles.alertDot, { backgroundColor: '#10b981' }]} />
                     <Text style={styles.alertText}>System healthy. No pending reviews.</Text>
                   </View>
                 )}
               </View>
            </View>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 0,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  verticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  compactStats: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  newMatchBtn: {
    borderRadius: 0,
    height: 32,
  },
  refreshBtnCompact: {
    width: 32,
    height: 32,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  dashboardCard: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 40,
  },
  metricItem: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  alertList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
});
