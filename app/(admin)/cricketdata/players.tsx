import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, FlatList, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Search, Filter, ShieldCheck, Mail, Phone, Users, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

export default function AdminCricketPlayers() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Fetch team members with their team and team owner details
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles(full_name, phone, avatar_url),
          team:teams(
            name,
            owner:profiles(full_name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPlayers(data);
    } catch (err) {
      console.error('Error fetching admin players:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    const lowerQuery = searchQuery.toLowerCase();
    return players.filter(p => {
      const playerName = (p.player_name || p.profile?.full_name || '').toLowerCase();
      const teamName = (p.team?.name || '').toLowerCase();
      const adminName = (p.team?.owner?.full_name || '').toLowerCase();
      return playerName.includes(lowerQuery) || teamName.includes(lowerQuery) || adminName.includes(lowerQuery);
    });
  }, [players, searchQuery]);

  const content = (
    <CricketSubbar>
      <View style={styles.container}>
        <View style={styles.headerCompact}>
          <View style={styles.headerLeft}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search players, teams, or admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  borderWidth: 0,
                  outline: 'none',
                  fontSize: 14,
                  padding: 8,
                  width: 320,
                  backgroundColor: 'transparent',
                } as any}
              />
            </View>
          </View>
        </View>

        {isWeb && (
          <View style={styles.tableHeaderContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colPlayer]}>Player Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colTeam]}>Current Team</Text>
              <Text style={[styles.tableHeaderCell, styles.colAdmin]}>Team Admin (Owner)</Text>
              <Text style={[styles.tableHeaderCell, styles.colRole]}>Role</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderCell, styles.colContact]}>Contact</Text>
            </View>
          </View>
        )}

        <FlatList
          data={filteredPlayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchPlayers} color="#10b981" />
          }
          renderItem={({ item }) => {
            const playerName = item.player_name || item.profile?.full_name || 'Unknown Player';
            const teamAdmin = item.team?.owner?.full_name || 'System';
            
            if (isWeb) {
               return (
                 <View style={styles.tableRow}>
                   <View style={[styles.tableCell, styles.colPlayer]}>
                     <View style={styles.playerProfile}>
                        <View style={styles.avatarWrap}>
                            <Image 
                              source={item.profile?.avatar_url ? { uri: item.profile.avatar_url } : require('../../../assets/avatar.png')} 
                              style={styles.avatar} 
                            />
                        </View>
                        <View>
                            <Text style={styles.cellMainText}>{playerName}</Text>
                            <Text style={styles.cellSubText}>ID: {item.id.slice(0, 8)}</Text>
                        </View>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colTeam]}>
                     <Text style={styles.cellMainText}>{item.team?.name || 'No Team'}</Text>
                   </View>

                   <View style={[styles.tableCell, styles.colAdmin]}>
                     <Text style={styles.cellMainText}>{teamAdmin}</Text>
                     <Text style={styles.cellSubText}>{item.team?.owner?.phone || 'No phone'}</Text>
                   </View>

                   <View style={[styles.tableCell, styles.colRole]}>
                     <View style={[styles.roleBadge, item.role === 'captain' && styles.roleCaptain]}>
                        {item.role === 'captain' && <ShieldCheck size={10} color="#065f46" />}
                        <Text style={[styles.roleText, item.role === 'captain' && styles.roleTextCaptain]}>
                            {item.role.toUpperCase()}
                        </Text>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colStatus]}>
                     <Text style={[styles.statusTag, item.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
                        {item.status.toUpperCase()}
                     </Text>
                   </View>

                   <View style={[styles.tableCell, styles.colContact]}>
                     <Text style={styles.cellMainText}>{item.profile?.phone || item.player_phone || 'N/A'}</Text>
                   </View>
                 </View>
               );
            }

            return (
              <Card style={styles.mobileCard}>
                <View style={styles.mobileHeader}>
                    <Text style={styles.mobilePlayerName}>{playerName}</Text>
                    <View style={[styles.statusTag, item.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.mobileInfoRow}>
                    <Users size={14} color="#6B7280" />
                    <Text style={styles.mobileMetaText}>{item.team?.name || 'No Team'} • {item.role}</Text>
                </View>
                <View style={styles.mobileInfoRow}>
                    <User size={14} color="#6B7280" />
                    <Text style={styles.mobileMetaText}>Admin: {teamAdmin}</Text>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No registered players found in teams</Text>
            </View>
          }
        />
      </View>
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
    backgroundColor: Platform.OS === 'web' ? '#F5F5F5' : '#F9FAFB',
  },
  headerCompact: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  tableHeaderContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 24,
    paddingTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tableCell: {
    paddingRight: 12,
  },
  colPlayer: { flex: 2 },
  colTeam: { flex: 1.5 },
  colAdmin: { flex: 1.5 },
  colRole: { width: 100 },
  colStatus: { width: 100 },
  colContact: { width: 140 },
  
  playerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECECF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  cellMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cellSubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleCaptain: {
    backgroundColor: '#ECFDF5',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  roleTextCaptain: {
    color: '#065f46',
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  statusAccepted: {
    backgroundColor: '#F0FDF4',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
    color: '#92400E',
  },
  emptyContainer: {
    padding: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  mobileCard: {
    padding: 16,
    marginBottom: 12,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobilePlayerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  mobileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  mobileMetaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
