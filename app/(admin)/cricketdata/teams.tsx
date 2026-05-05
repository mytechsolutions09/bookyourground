import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, FlatList, RefreshControl, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, RefreshCcw, Search, Filter, Calendar, Users, MapPin, User as UserIcon, X, Phone, ShieldCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

export default function AdminCricketTeams() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Member Modal State
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          owner:profiles(full_name, phone)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setTeams(data);
    } catch (err) {
      console.error('Error fetching admin teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (team: any) => {
    try {
      setSelectedTeam(team);
      setMembersLoading(true);
      setModalVisible(true);

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles(full_name, phone, avatar_url)
        `)
        .eq('team_id', team.id)
        .order('role', { ascending: false });

      if (error) throw error;
      if (data) setMembers(data);
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    return teams.filter(team => 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.captain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  const content = (
    <CricketSubbar>
      <View style={styles.container}>
        <View style={styles.headerCompact}>
          <View style={styles.headerLeft}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search teams, captains, admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  borderWidth: 0,
                  outline: 'none',
                  fontSize: 14,
                  padding: 8,
                  width: 300,
                  backgroundColor: 'transparent',
                } as any}
              />
            </View>
          </View>

          <Button 
            title="Register Team" 
            icon={Plus} 
            onPress={() => {}} 
            size="small"
            style={styles.compactBtn}
          />
        </View>

        {isWeb && (
          <View style={styles.tableHeaderContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Team Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
              <Text style={[styles.tableHeaderCell, styles.colCaptain]}>Captain</Text>
              <Text style={[styles.tableHeaderCell, styles.colOwner]}>Team Admin (Owner)</Text>
              <Text style={[styles.tableHeaderCell, styles.colCreated]}>Registered On</Text>
              <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
            </View>
          </View>
        )}

        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchTeams} color="#10b981" />
          }
          renderItem={({ item }) => {
            if (isWeb) {
               return (
                 <TouchableOpacity 
                    style={styles.tableRow}
                    onPress={() => fetchTeamMembers(item)}
                 >
                   <View style={[styles.tableCell, styles.colName]}>
                     <View style={styles.teamBrand}>
                       {item.image_url ? (
                         <Image source={{ uri: item.image_url }} style={styles.teamLogo} />
                       ) : (
                         <View style={[styles.logoPlaceholder, { backgroundColor: item.bg_color || '#ECECF1' }]}>
                           <Text style={styles.logoInitial}>{item.initials || item.name.charAt(0)}</Text>
                         </View>
                       )}
                       <View>
                        <Text style={styles.cellMainText}>{item.name}</Text>
                        <Text style={styles.cellSubText}>ID: {item.id.slice(0, 8)}</Text>
                       </View>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colLocation]}>
                     <View style={styles.iconInfo}>
                       <MapPin size={14} color="#9CA3AF" />
                       <Text style={styles.cellMainText}>{item.location}</Text>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colCaptain]}>
                     <View style={styles.iconInfo}>
                       <UserIcon size={14} color="#9CA3AF" />
                       <Text style={styles.cellMainText}>{item.captain}</Text>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colOwner]}>
                     <Text style={styles.cellMainText}>{item.owner?.full_name || 'System'}</Text>
                     <Text style={styles.cellSubText}>{item.owner?.phone || 'No phone'}</Text>
                   </View>

                   <View style={[styles.tableCell, styles.colCreated]}>
                     <Text style={styles.cellMainText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                   </View>

                   <View style={[styles.tableCell, styles.colActions]}>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => fetchTeamMembers(item)}
                      >
                         <Text style={styles.actionBtnText}>Squad List</Text>
                         <ChevronRight size={14} color="#10b981" />
                      </TouchableOpacity>
                   </View>
                 </TouchableOpacity>
               );
            }

            return (
              <TouchableOpacity onPress={() => fetchTeamMembers(item)}>
                <Card style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                    <View style={styles.teamBrand}>
                        <View style={[styles.logoPlaceholder, { backgroundColor: item.bg_color || '#ECECF1', width: 40, height: 40 }]}>
                        <Text style={[styles.logoInitial, { fontSize: 16 }]}>{item.initials || item.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.mobileTeamName}>{item.name}</Text>
                    </View>
                    </View>
                    <View style={styles.mobileDetails}>
                    <View style={styles.iconInfo}>
                        <MapPin size={12} color="#6B7280" />
                        <Text style={styles.mobileSubText}>{item.location}</Text>
                    </View>
                    <View style={styles.iconInfo}>
                        <UserIcon size={12} color="#6B7280" />
                        <Text style={styles.mobileSubText}>Capt: {item.captain}</Text>
                    </View>
                    </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No teams found</Text>
            </View>
          }
        />

        {/* Squad List Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                    <Text style={styles.modalTitle}>{selectedTeam?.name} Squad</Text>
                    <Text style={styles.modalSubtitle}>{members.length} Total Members</Text>
                </View>
                <TouchableOpacity 
                    style={styles.closeBtn}
                    onPress={() => setModalVisible(false)}
                >
                    <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              {membersLoading ? (
                <View style={styles.modalLoading}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
              ) : (
                <View style={styles.memberList}>
                  {members.length === 0 ? (
                    <View style={styles.modalEmpty}>
                        <Text style={styles.emptyText}>No members found for this team.</Text>
                    </View>
                  ) : (
                    <ScrollView>
                      {members.map((member) => (
                        <View key={member.id} style={styles.memberRow}>
                          <View style={styles.memberInfo}>
                             <View style={styles.avatarWrap}>
                                <Image 
                                  source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : require('../../../assets/avatar.png')} 
                                  style={styles.memberAvatar} 
                                />
                             </View>
                             <View>
                                <View style={styles.nameRow}>
                                    <Text style={styles.memberName}>{member.player_name || member.profile?.full_name}</Text>
                                    {member.role === 'captain' && (
                                        <View style={styles.captainBadge}>
                                            <ShieldCheck size={10} color="#065f46" />
                                            <Text style={styles.captainText}>CAPTAIN</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.memberRole}>{member.profile?.phone || member.player_phone || 'N/A'}</Text>
                             </View>
                          </View>
                          <View style={styles.memberStatus}>
                             <Text style={[styles.statusTag, member.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
                                {member.status.toUpperCase()}
                             </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginLeft: 0,
  },
  compactBtn: {
    minWidth: 140,
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
    alignItems: 'center',
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
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }
    })
  },
  tableCell: {
    paddingRight: 12,
  },
  colName: { flex: 2 },
  colLocation: { flex: 1.2 },
  colCaptain: { flex: 1.2 },
  colOwner: { flex: 1.5 },
  colCreated: { width: 140 },
  colActions: { width: 120 },
  
  teamBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  cellMainText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#111827' 
  },
  cellSubText: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    marginTop: 2 
  },
  iconInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  actionBtnText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#10b981' 
  },
  emptyContainer: { 
    padding: 80, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#9CA3AF' 
  },
  mobileCard: { 
    padding: 16, 
    marginBottom: 12 
  },
  mobileCardHeader: { 
    marginBottom: 12 
  },
  mobileTeamName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#111827' 
  },
  mobileDetails: { 
    gap: 8 
  },
  mobileSubText: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalLoading: {
    padding: 60,
  },
  modalEmpty: {
    padding: 60,
    alignItems: 'center',
  },
  memberList: {
    padding: 10,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  memberInfo: {
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
  memberAvatar: {
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
    fontWeight: '700',
    color: '#4B5563',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  captainText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
  },
  memberRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  memberStatus: {
    alignItems: 'flex-end',
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusAccepted: {
    backgroundColor: '#F0FDF4',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
    color: '#92400E',
  },
});
