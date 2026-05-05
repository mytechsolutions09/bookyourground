import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { 
  X, Users2, Trophy, MapPin, Calendar, ShieldCheck, 
  ChevronRight, Info, AlertCircle, CheckCircle2,
  QrCode, Share2, Plus, Trash2, Camera as CameraIcon, Eye, Users,
  TrendingUp, ChevronLeft, Swords, BarChart3, PlayCircle,
  Search
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';

export const MatchInfoModal = ({ 
  isVisible, 
  onClose, 
  selectedTeamA, 
  selectedTeamB, 
  matchConfig, 
  styles 
}) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={[styles.qrModalContent, { height: '85%', padding: 0, overflow: 'hidden' }]} onPress={(e) => e.stopPropagation()}>
        <LinearGradient
          colors={['#01b854', '#06392e']}
          style={styles.modalHeaderPremium}
        >
          <View>
            <Text style={styles.modalTitlePremium}>Match Information</Text>
            <Text style={styles.modalSubtitlePremium}>Details & Assignments</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeBtnPremium}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
           {/* Teams Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <Users2 size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>TEAMS</Text>
              </View>
              <View style={styles.matchTeamsRow}>
                 <View style={styles.matchTeamItem}>
                    <Text style={styles.matchTeamName}>{selectedTeamA?.name}</Text>
                    <Text style={styles.matchTeamRole}>Home Team</Text>
                 </View>
                 <View style={styles.vsBadgeContainer}>
                    <Text style={styles.vsBadgeSmall}>VS</Text>
                 </View>
                 <View style={styles.matchTeamItem}>
                    <Text style={[styles.matchTeamName, { textAlign: 'right' }]}>{selectedTeamB?.name}</Text>
                    <Text style={[styles.matchTeamRole, { textAlign: 'right' }]}>Away Team</Text>
                 </View>
              </View>
           </View>
           
           {/* Configuration Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <Trophy size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>MATCH DETAILS</Text>
              </View>
              <View style={styles.detailsGrid}>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Overs</Text>
                    <Text style={styles.detailValue}>{matchConfig.totalOvers} Overs</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Ball</Text>
                    <Text style={styles.detailValue}>{matchConfig.ballType}</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pitch</Text>
                    <Text style={styles.detailValue}>{matchConfig.pitchType}</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{matchConfig.type}</Text>
                 </View>
              </View>
           </View>

           {/* Venue Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <MapPin size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>VENUE & TIME</Text>
              </View>
              <View style={styles.venueContent}>
                 <Text style={styles.venueName}>{matchConfig.ground}</Text>
                 <Text style={styles.venueLocation}>{matchConfig.city}, {matchConfig.state}</Text>
                 <View style={styles.timeRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.timeText}>{matchConfig.dateTime}</Text>
                 </View>
              </View>
           </View>
           
           {/* Officials Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <ShieldCheck size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>MATCH OFFICIALS</Text>
              </View>
              
              <View style={styles.officialsGroup}>
                 {matchConfig.officials.umpires.map((u, i) => u && (
                   <View key={`u-${i}`} style={styles.officialCard}>
                      <View style={styles.officialAvatar}>
                         <Text style={styles.officialInitial}>{u[0]}</Text>
                      </View>
                      <View>
                         <Text style={styles.officialNamePremium}>{u}</Text>
                         <Text style={styles.officialRolePremium}>Umpire {i + 1}</Text>
                      </View>
                   </View>
                 ))}
                 {matchConfig.officials.scorer && (
                   <View style={styles.officialCard}>
                      <View style={styles.officialAvatar}>
                         <Text style={styles.officialInitial}>{matchConfig.officials.scorer[0]}</Text>
                      </View>
                      <View>
                         <Text style={styles.officialNamePremium}>{matchConfig.officials.scorer}</Text>
                         <Text style={styles.officialRolePremium}>Official Scorer</Text>
                      </View>
                   </View>
                 )}
              </View>
           </View>
        </ScrollView>

        <View style={styles.modalFooterPremium}>
           <TouchableOpacity 
             style={styles.closeBtnFooter}
             onPress={onClose}
           >
             <Text style={styles.closeBtnFooterText}>Dismiss</Text>
           </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

export const SuccessModal = ({ isVisible, onClose, styles, message }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.successModalContent} onPress={(e) => e.stopPropagation()}>
        <View style={styles.successIconWrapper}>
           <CheckCircle2 size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>Match Success!</Text>
        <Text style={styles.successMessage}>{message}</Text>
        <TouchableOpacity 
          style={styles.successCloseBtn}
          onPress={onClose}
        >
          <Text style={styles.successCloseBtnText}>Great, thanks!</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

export const QrModal = ({ isVisible, onClose, user, styles }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <Pressable 
      style={styles.qrModalOverlay}
      onPress={onClose}
    >
      <Pressable style={styles.qrCard} onPress={(e) => e.stopPropagation()}>
        <View style={styles.qrHeader}>
          <Text style={styles.qrTitle}>Player Profile QR</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.qrContent}>
          <View style={styles.qrWrapper}>
            <QrCode size={180} color="#06392e" />
          </View>
          <Text style={styles.qrPlayerName}>{user?.full_name || 'Player'}</Text>
          <Text style={styles.qrSubtext}>Scan to view profile</Text>
        </View>

        <TouchableOpacity 
          style={styles.shareQrBtn}
          onPress={() => Share.share({ message: `Check out my cricket profile: https://bookyourground.com/player/${user?.id}` })}
        >
          <Share2 size={20} color="#FFFFFF" />
          <Text style={styles.shareQrBtnText}>Share Profile</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

export const ActionModal = ({ isVisible, onClose, onAction, styles }) => {
  const actions = [
    { id: 'match_info', label: 'Match Info', icon: Info, color: '#3B82F6' },
    { id: 'wagon_wheel', label: 'Wagon Wheel', icon: PlayCircle, color: '#8B5CF6' },
    { id: 'revise_target', label: 'Revise Target', icon: AlertCircle, color: '#F59E0B' },
    { id: 'rules', label: 'Match Rules', icon: ShieldCheck, color: '#10B981' },
    { id: 'full_scorecard', label: 'Full Scorecard', icon: BarChart3, color: '#01b854' },
    { id: 'abandon', label: 'Abandon Match', icon: Trash2, color: '#EF4444' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <Pressable style={styles.actionModalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Match Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                onPress={() => {
                  onAction(action.id);
                  onClose();
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: action.color + '15' }]}>
                  <action.icon size={28} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.actionCloseBtn}
            onPress={onClose}
          >
            <Text style={styles.actionCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const TeamScannerModal = ({ isVisible, onClose, onScan, styles }) => {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (isVisible) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [isVisible]);

  if (isVisible && hasPermission === null) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.fullModalScanner} onPress={onClose}>
        <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Team QR</Text>
            <TouchableOpacity onPress={onClose} style={styles.scannerClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {hasPermission === false ? (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Text style={{ color: '#FFF', textAlign: 'center' }}>No access to camera. Please enable it in settings.</Text>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
                <Text style={{ color: '#01b854', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={({ data }) => {
                if (data) onScan(data);
              }}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          )}

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Align the team QR code within the frame</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const TeamMembersModal = ({ isVisible, onClose, team, styles }: any) => {
  const [members, setMembers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isVisible && team?.id) {
      fetchMembers();
    }
  }, [isVisible, team?.id]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles(avatar_url, full_name)')
        .eq('team_id', team.id);
      
      if (error) throw error;
      if (data) setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={[styles.sheetContent, { height: '85%', width: '100%' }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.sheetTitle}>{team?.name || 'Team'}</Text>
              <Text style={styles.sheetSubtitle}>{members.length} Players</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 20 }}>
              {isLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#01b854" />
                </View>
              ) : members.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Users size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
                  <Text style={{ color: '#94A3B8', fontWeight: '600' }}>No members found for this team</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.memberListRow}>
                      <View style={styles.memberAvatarSmall}>
                        {member.profiles?.avatar_url ? (
                          <Image source={{ uri: member.profiles.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                        ) : (
                          <Text style={styles.memberInitialText}>{(member.player_name || member.profiles?.full_name || '?')[0].toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberNameText}>{member.player_name || member.profiles?.full_name}</Text>
                        <Text style={styles.memberRoleText}>{member.role || 'Player'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const TeamPickerView = ({ onClose, teams, onSelect, onScanQr, onCreateTeam, styles, title }) => {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('My Teams');
  const [activeMemberTeam, setActiveMemberTeam] = React.useState<any>(null);
  
  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                         t.location?.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'My Teams') {
      return matchesSearch && t.created_by === user?.id;
    } else if (activeTab === 'Opponents') {
      return matchesSearch && t.created_by !== user?.id;
    }
    return matchesSearch;
  });

  const tabs = ['My Teams', 'Opponents', 'Add'];

  return (
    <View style={styles.pickerViewContainer}>
      <View style={styles.pickerHeaderPremium}>
        <View style={{ width: 40 }} />
        <Text style={styles.pickerTitleCenter}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.pickerTabsRow}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={styles.pickerTabItem} 
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.pickerTabText, activeTab === tab && styles.pickerTabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.pickerTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pickerSearchRow}>
        <View style={styles.pickerQuickSearch}>
          <Search size={18} color="#94A3B8" />
          <TextInput 
            placeholder="Quick search"
            style={styles.pickerSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity style={styles.pickerAddTeamsBtn} onPress={onCreateTeam}>
          <Plus size={16} color="#FFF" strokeWidth={3} />
          <Text style={styles.pickerAddTeamsBtnText}>Add Teams</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pickerTeamsList}>
          {activeTab === 'Add' ? (
            <TouchableOpacity style={styles.addNewTeamEmptyCard} onPress={onCreateTeam}>
              <View style={styles.addNewTeamIconCircle}>
                <Plus size={32} color="#01b854" />
              </View>
              <Text style={styles.addNewTeamTitle}>Create New Team</Text>
              <Text style={styles.addNewTeamSubtitle}>Set up your team and start scoring</Text>
            </TouchableOpacity>
          ) : filteredTeams.length === 0 ? (
            <View style={styles.pickerEmptyState}>
              <Users size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.pickerEmptyText}>No teams found in {activeTab}</Text>
              {activeTab === 'My Teams' && (
                <TouchableOpacity style={{ marginTop: 12 }} onPress={onCreateTeam}>
                  <Text style={{ color: '#01b854', fontWeight: '700' }}>Create your first team</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : filteredTeams.map((team) => (
            <TouchableOpacity 
              key={team.id} 
              style={styles.teamCardPremium}
              onPress={() => {
                onSelect(team);
                onClose();
              }}
            >
              <View style={styles.teamCardLogoContainer}>
                {team.image_url ? (
                  <Image source={{ uri: team.image_url }} style={styles.teamCardLogoImg} />
                ) : (
                  <View style={[styles.teamCardLogoPlaceholder, { backgroundColor: team.bgColor || '#F1F5F9' }]}>
                    <Text style={styles.teamCardInitialText}>
                      {(team.initials || team.name[0]).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.teamCardInfo}>
                <View style={styles.teamCardHeaderRow}>
                  <Text style={styles.teamCardNameText} numberOfLines={1}>{team.name}</Text>
                  <TouchableOpacity onPress={() => setActiveMemberTeam(team)}>
                    <Text style={styles.teamCardMembersBtn}>Members</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.teamCardMetaRow}>
                  <View style={styles.teamCardMetaItem}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.teamCardMetaText}>{team.location || 'Unknown'}</Text>
                  </View>
                  
                  <View style={styles.teamCardMetaItem}>
                    <View style={styles.captainIconCircle}>
                      <Text style={styles.captainIconText}>C</Text>
                    </View>
                    <Text style={styles.teamCardMetaText}>{team.captain || 'Assign Captain'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TeamMembersModal 
        isVisible={!!activeMemberTeam}
        onClose={() => setActiveMemberTeam(null)}
        team={activeMemberTeam}
        styles={styles}
      />
    </View>
  );
};

export const TeamPickerModal = ({ isVisible, onClose, teams, onSelect, onScanQr, onCreateTeam, styles, title }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={[styles.sheetContent, { height: '95%', padding: 0, overflow: 'hidden' }]} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <TeamPickerView 
          onClose={onClose}
          teams={teams}
          onSelect={onSelect}
          onScanQr={onScanQr}
          onCreateTeam={onCreateTeam}
          styles={styles}
          title={title}
        />
      </Pressable>
    </Pressable>
  </Modal>
);

export const ManualPlayerModal = ({ isVisible, onClose, onAdd, styles }: any) => {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ player_name: name.trim(), player_phone: phone.trim() });
    setName('');
    setPhone('');
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.actionModalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Player Manually</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Player Name</Text>
            <TextInput 
              style={styles.formInput}
              placeholder="e.g. John Doe"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Phone Number</Text>
            <TextInput 
              style={styles.formInput}
              placeholder="e.g. 9988776655"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.startMatchBtn, { marginTop: 10, opacity: name.trim() ? 1 : 0.5 }]}
            onPress={handleAdd}
            disabled={!name.trim()}
          >
            <Text style={styles.startMatchBtnText}>Add to Team</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
