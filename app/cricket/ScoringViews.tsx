import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Image,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  IdCard, 
  ChevronDown, 
  Calendar, 
  MapPin,
  X,
  AlertCircle,
  QrCode,
  Info,
  Crown,
  Check,
  Briefcase,
  ArrowRight,
  Shield,
  Star,
  Users,
  Compass,
  Home,
  Target,
  Circle,
  CircleDot,
  Grid,
  Layers,
  Wind,
  MoreHorizontal,
  Zap,
  Dribbble,
  Hash,
  Clock,
  Sliders,
  Trophy,
  Flag,
  CircleCheck,
  ClipboardList,
  Play,
  CheckCircle2,
} from 'lucide-react-native';
import { styles } from './scoring-styles';

const windowWidth = Dimensions.get('window').width;

// --- DASHBOARD VIEW ---
export const DashboardView = ({ fetchedMatches, onStartNewMatch, onMatchPress }: any) => (
  <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
    <View style={styles.dashboardHeader}>
      <Text style={styles.dashboardTitle}>Scoring Hub</Text>
      <TouchableOpacity style={styles.startMatchMainBtn} onPress={onStartNewMatch}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.startMatchMainBtnText}>Start New Match</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.matchesSection}>
      <Text style={styles.sectionTitle}>Recent Matches</Text>
      {fetchedMatches.length === 0 ? (
        <View style={styles.emptyMatches}>
           <Text style={styles.emptyMatchesText}>No recent matches found.</Text>
        </View>
      ) : fetchedMatches.map((match: any) => (
        <TouchableOpacity 
          key={match.id} 
          style={styles.matchCard}
          onPress={() => onMatchPress(match.id)}
        >
          <View style={styles.matchCardHeader}>
            <Text style={styles.matchType}>{match.match_type || 'T20'}</Text>
            {match.status === 'live' && (
              <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
            )}
          </View>
          <Text style={styles.matchTeams}>{match.team_a} vs {match.team_b}</Text>
          <Text style={styles.matchMeta}>{match.venue || 'Standard Ground'} • {new Date(match.created_at).toLocaleDateString()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

// --- TEAM SELECTION VIEW ---
export const TeamSelectionView = ({ 
  teams, selectedTeamA, selectedTeamB, 
  onOpenPickerA, onOpenPickerB, onScanQr,
  onBack, onContinue 
}: any) => (
  <View style={styles.selectionView}>
    <View style={styles.selectionHeaderPremium}>
      <TouchableOpacity onPress={onBack} style={styles.backBtnCircle}>
        <ChevronLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={styles.selectionTitlePremium}>Match Setup</Text>
        <Text style={styles.selectionSubtitlePremium}>Step 1: Choose Teams</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
    
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.matchSetupCard}>
        <View style={styles.matchTeamsVertical}>
          {/* Home Team Side */}
          <TouchableOpacity 
            style={[styles.teamSelectBox, selectedTeamA && styles.teamSelectBoxActive]}
            onPress={onOpenPickerA}
          >
            <View style={styles.teamBadgeHome}>
               <Text style={styles.teamBadgeText}>HOME TEAM</Text>
            </View>
            
            <View style={styles.teamAvatarLarge}>
              {selectedTeamA ? (
                selectedTeamA.image_url ? (
                  <Image source={{ uri: selectedTeamA.image_url }} style={styles.teamAvatarImg} />
                ) : (
                  <Text style={styles.teamInitialLarge}>{selectedTeamA.name[0]}</Text>
                )
              ) : (
                <View style={styles.emptyAvatarCircle}>
                  <Users size={32} color="#94A3B8" />
                </View>
              )}
            </View>
            
            <View style={styles.teamInfoContainer}>
              <Text style={styles.teamNameLabel} numberOfLines={1}>
                {selectedTeamA?.name || 'Select Home Team'}
              </Text>
              <Text style={styles.teamSubLabel}>
                {selectedTeamA ? (selectedTeamA.location || 'Official Team') : 'Tap to select home squad'}
              </Text>
            </View>
            
            {selectedTeamA && (
              <View style={styles.selectedCheckCircle}>
                <Check size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.vsBadgePremium}>
            <View style={styles.vsLine} />
            <View style={styles.vsCircle}>
              <Text style={styles.vsTextPremium}>VS</Text>
            </View>
            <View style={styles.vsLine} />
          </View>

          {/* Away Team Side */}
          <TouchableOpacity 
            style={[styles.teamSelectBox, selectedTeamB && styles.teamSelectBoxActive]}
            onPress={onOpenPickerB}
          >
            <View style={styles.teamBadgeAway}>
               <Text style={styles.teamBadgeText}>AWAY TEAM</Text>
            </View>
            
            <View style={[styles.teamAvatarLarge, { borderColor: '#f8688a' }]}>
              {selectedTeamB ? (
                selectedTeamB.image_url ? (
                  <Image source={{ uri: selectedTeamB.image_url }} style={styles.teamAvatarImg} />
                ) : (
                  <Text style={[styles.teamInitialLarge, { color: '#f8688a' }]}>{selectedTeamB.name[0]}</Text>
                )
              ) : (
                <View style={styles.emptyAvatarCircle}>
                  <Users size={32} color="#94A3B8" />
                </View>
              )}
            </View>
            
            <View style={styles.teamInfoContainer}>
              <Text style={styles.teamNameLabel} numberOfLines={1}>
                {selectedTeamB?.name || 'Select Away Team'}
              </Text>
              <Text style={styles.teamSubLabel}>
                {selectedTeamB ? (selectedTeamB.location || 'Official Team') : 'Tap to select away squad'}
              </Text>
            </View>

            {selectedTeamB && (
              <View style={[styles.selectedCheckCircle, { backgroundColor: '#f8688a' }]}>
                <Check size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.setupInfoBox}>
        <View style={styles.setupInfoItem}>
          <Shield size={20} color="#01b854" />
          <Text style={styles.setupInfoText}>Official Player Stats Tracking</Text>
        </View>
        <View style={styles.setupInfoItem}>
          <Zap size={20} color="#01b854" />
          <Text style={styles.setupInfoText}>Real-time Score Updates</Text>
        </View>
      </View>

      {!selectedTeamA || !selectedTeamB ? (
        <View style={styles.hintCard}>
          <Info size={20} color="#64748B" />
          <Text style={styles.hintText}>
            You need to select both teams to proceed with the match setup.
          </Text>
        </View>
      ) : (
        <View style={styles.successSetupBox}>
          <CheckCircle2 size={20} color="#01b854" />
          <Text style={styles.successSetupText}>Teams Ready for Action!</Text>
        </View>
      )}
    </ScrollView>

    <View style={styles.stickyFooterSelection}>
      <TouchableOpacity 
        style={[styles.continueBtnPremium, (!selectedTeamA || !selectedTeamB) && styles.continueBtnDisabled]}
        onPress={onContinue}
        disabled={!selectedTeamA || !selectedTeamB}
      >
        <LinearGradient
          colors={(!selectedTeamA || !selectedTeamB) ? ['#CBD5E1', '#94A3B8'] : ['#01b854', '#06392e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueBtnGradient}
        >
          <Text style={styles.continueBtnTextPremium}>Continue to Players</Text>
          <ArrowRight size={20} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);


// --- PLAYER SELECTION VIEW ---
export const PlayerSelectionView = ({ 
  team, teamMembers, playingXi, onTogglePlayer, onToggleCaptain, 
  onBack, onContinue, currentCaptain, searchQuery, setSearchQuery, onScanPlayer, onAddPlayer,
  title
}: any) => {
  const isLive = !!title;
  const filteredMembers = teamMembers.filter((m: any) => {
    const name = m.name || m.player_name || '';
    return name.toLowerCase().includes((searchQuery || '').toLowerCase());
  });

  return (
    <View style={styles.selectionView}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.selectionTitle} numberOfLines={1}>{title || team?.name || 'Select Players'}</Text>
          <Text style={styles.selectionSubtitle}>{playingXi.length} Players Selected</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[styles.searchBarPremium, { flex: 1 }]}>
            <Search size={20} color="#94A3B8" />
            <TextInput 
              placeholder="Search team players..."
              style={styles.searchInputPremium}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#F1F5F9', 
              width: 46, 
              height: 46, 
              borderRadius: 12, 
              justifyContent: 'center', 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
            onPress={() => onAddPlayer && onAddPlayer()}
          >
            <Plus size={24} color="#01b854" />
          </TouchableOpacity>
        </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredMembers.map((m: any) => {
            const isSelected = !!playingXi.find((p: any) => p.id === m.id);
            const isCaptain = currentCaptain?.id === m.id;
            return (
              <View key={m.id} style={[styles.playerSelectRowPremium, isSelected && styles.playerSelectRowPremiumActive]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <TouchableOpacity 
                    style={[styles.checkBoxPremium, isSelected && styles.checkBoxPremiumActive]}
                    onPress={() => onTogglePlayer(m)}
                  >
                    {isSelected && <Check size={16} color="#FFF" />}
                  </TouchableOpacity>
                  
                  <View style={styles.playerAvatarSmallCompact}>
                    <Text style={styles.playerInitialSmallCompact}>{(m.name || m.player_name || '?')[0].toUpperCase()}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.playerNamePremiumCompact, isSelected && styles.playerNamePremiumActive]} numberOfLines={1}>{m.name || m.player_name}</Text>
                    <Text style={styles.playerRolePremiumCompact}>{m.role || 'Player'}</Text>
                  </View>
                </View>

                {isSelected && !isLive && (
                  <TouchableOpacity 
                    style={[styles.captainBtn, isCaptain && styles.captainBtnActive, { width: 36, height: 36, borderRadius: 18 }]} 
                    onPress={() => onToggleCaptain(m)}
                  >
                    <Crown size={18} color={isCaptain ? '#FFF' : '#01b854'} />
                  </TouchableOpacity>
                )}
              </View>
            );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {!currentCaptain && playingXi.length > 0 && !isLive && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8, gap: 8 }}>
            <Crown size={14} color="#EA580C" />
            <Text style={{ fontSize: 12, color: '#EA580C', fontWeight: '600' }}>Please assign a captain to proceed</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.confirmBtn, (playingXi.length < (isLive ? 1 : 2) || (!isLive && !currentCaptain)) && { opacity: 0.5 }, { marginHorizontal: 16 }]}
        onPress={() => {
          if (!isLive && playingXi.length < 2) {
            if (Platform.OS === 'web') alert('Please select at least 2 players to proceed');
            else Alert.alert('Min. Players Required', 'Please select at least 2 players to proceed.');
            return;
          }
          if (!isLive && !currentCaptain) {
            if (Platform.OS === 'web') alert('Please assign a captain before proceeding');
            else Alert.alert('Captain Required', 'Please assign a captain for the team before proceeding.');
            return;
          }
          onContinue();
        }}
        disabled={playingXi.length < (isLive ? 1 : 2) || (!isLive && !currentCaptain)}
      >
        <Text style={styles.confirmBtnText}>{isLive ? 'Confirm Selection' : 'Confirm Team & Captain'}</Text>
        <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
};


// --- MATCH CONFIGURATION VIEW ---
export const MatchConfigurationView = ({ 
  selectedTeamA, selectedTeamB, playingXiA, playingXiB, matchConfig, setMatchConfig, 
  onBack, onNext, onSelectPlayersA, onSelectPlayersB, 
  showStateDropdown, setShowStateDropdown, searchGrounds, groundResults, 
  showGroundDropdown, setShowGroundDropdown, isSearchingGround 
}: any) => {
  const matchTypes = [
    { id: 'limited overs', label: 'Limited Overs', icon: <Compass size={18} /> },
    { id: 'box cricket', label: 'Box Cricket', icon: <Home size={18} /> },
    { id: 'test match', label: 'Test Match', icon: <Calendar size={18} /> }
  ];

  const ballTypes = [
    { id: 'leather', label: 'Leather', icon: <Target size={18} /> },
    { id: 'tennis', label: 'Tennis', icon: <Circle size={18} /> },
    { id: 'other', label: 'Other', icon: <CircleDot size={18} /> }
  ];

  const pitchTypes = [
    { id: 'Rough', label: 'Rough', icon: <Grid size={18} /> },
    { id: 'Matting', label: 'Matting', icon: <Layers size={18} /> },
    { id: 'Turf', label: 'Turf', icon: <Wind size={18} /> },
    { id: 'Other', label: 'Other', icon: <MoreHorizontal size={18} /> }
  ];

  return (
    <View style={styles.selectionView}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.selectionTitle}>Match Details</Text>
          <Text style={styles.selectionSubtitle}>Set up the match</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.vsDisplayCompact}>
          <TouchableOpacity style={styles.vsTeamCompact} onPress={onSelectPlayersA}>
            <View style={styles.teamAvatarSmall}>
               {selectedTeamA?.image ? (
                 <Image source={{ uri: selectedTeamA.image }} style={styles.teamAvatarSmallImage} />
               ) : (
                 <Text style={styles.teamInitialSmall}>{selectedTeamA?.initials || selectedTeamA?.name?.[0]}</Text>
               )}
            </View>
            <View style={styles.vsInfoContainer}>
              <Text style={styles.vsTeamNameCompact} numberOfLines={1}>{selectedTeamA?.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.vsTeamSubCompact}>{playingXiA.length} Players</Text>
                <ChevronRight size={12} color="#01b854" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.vsBadgeCompact}>
            <Text style={styles.vsBadgeTextCompact}>VS</Text>
          </View>

          <TouchableOpacity style={[styles.vsTeamCompact, { flexDirection: 'row-reverse' }]} onPress={onSelectPlayersB}>
            <View style={styles.teamAvatarSmall}>
               {selectedTeamB?.image ? (
                 <Image source={{ uri: selectedTeamB.image }} style={styles.teamAvatarSmallImage} />
               ) : (
                 <Text style={styles.teamInitialSmall}>{selectedTeamB?.initials || selectedTeamB?.name?.[0]}</Text>
               )}
            </View>
            <View style={[styles.vsInfoContainer, { alignItems: 'flex-end', marginRight: 12, marginLeft: 0 }]}>
              <Text style={styles.vsTeamNameCompact} numberOfLines={1}>{selectedTeamB?.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.vsTeamSubCompact}>{playingXiB.length} Players</Text>
                <ChevronRight size={12} color="#01b854" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Zap size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Match Type</Text>
          </View>
          <View style={styles.configChipGrid}>
            {matchTypes.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[styles.configChip, matchConfig.type === t.id && styles.configChipActive]}
                onPress={() => setMatchConfig({ ...matchConfig, type: t.id })}
              >
                {React.cloneElement(t.icon as React.ReactElement, { 
                  color: matchConfig.type === t.id ? '#01b854' : '#64748B' 
                })}
                <Text style={[styles.configChipText, matchConfig.type === t.id && styles.configChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Dribbble size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Ball Type</Text>
          </View>
          <View style={styles.configChipGrid}>
            {ballTypes.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[styles.configChip, matchConfig.ballType === t.id && styles.configChipActive]}
                onPress={() => setMatchConfig({ ...matchConfig, ballType: t.id })}
              >
                {React.cloneElement(t.icon as React.ReactElement, { 
                  color: matchConfig.ballType === t.id ? '#01b854' : '#64748B' 
                })}
                <Text style={[styles.configChipText, matchConfig.ballType === t.id && styles.configChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Hash size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Pitch Type</Text>
          </View>
          <View style={styles.configChipGrid}>
            {pitchTypes.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[styles.configChip, matchConfig.pitchType === t.id && styles.configChipActive]}
                onPress={() => setMatchConfig({ ...matchConfig, pitchType: t.id })}
              >
                {React.cloneElement(t.icon as React.ReactElement, { 
                  color: matchConfig.pitchType === t.id ? '#01b854' : '#64748B' 
                })}
                <Text style={[styles.configChipText, matchConfig.pitchType === t.id && styles.configChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.configSection, { flex: 1 }]}>
            <View style={styles.configSectionHeader}>
               <Clock size={18} color="#01b854" />
               <Text style={styles.configSectionTitle}>No. of Overs</Text>
            </View>
            <View style={styles.configInputPremium}>
               <TextInput 
                 keyboardType="numeric"
                 style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#06392e' }}
                 value={(matchConfig.totalOvers || 20).toString()}
                 onChangeText={(val) => setMatchConfig({ ...matchConfig, totalOvers: val })}
               />
            </View>
          </View>

          <View style={[styles.configSection, { flex: 1 }]}>
            <View style={styles.configSectionHeader}>
               <Users size={18} color="#01b854" />
               <Text style={styles.configSectionTitle}>Overs/Bowler</Text>
            </View>
            <View style={styles.configInputPremium}>
               <TextInput 
                 keyboardType="numeric"
                 style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#06392e' }}
                 value={(matchConfig.oversPerBowler || 4).toString()}
                 onChangeText={(val) => setMatchConfig({ ...matchConfig, oversPerBowler: val })}
               />
            </View>
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Zap size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Powerplay Overs</Text>
          </View>
          <View style={styles.configInputPremium}>
             <TextInput 
               keyboardType="numeric"
               style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#06392e' }}
               value={(matchConfig.powerplayOvers || 6).toString()}
               onChangeText={(val) => setMatchConfig({ ...matchConfig, powerplayOvers: val })}
             />
             <Text style={{ color: '#94A3B8', fontSize: 12 }}>Balls 1 to X</Text>
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <MapPin size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Venue Details</Text>
          </View>
          <View style={{ gap: 12 }}>
            <View style={styles.searchBarPremium}>
               <Search size={20} color="#94A3B8" />
               <TextInput 
                 placeholder="Ground Name"
                 style={styles.searchInputPremium}
                 value={matchConfig.ground}
                 onChangeText={(val) => {
                   setMatchConfig({ ...matchConfig, ground: val });
                   searchGrounds(val);
                 }}
                 placeholderTextColor="#94A3B8"
               />
            </View>
            
            {showGroundDropdown && groundResults.length > 0 && (
              <View style={styles.dropdownList}>
                 <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                   {groundResults.map((g: any) => (
                     <TouchableOpacity 
                       key={g.id} 
                       style={styles.dropdownItem}
                       onPress={() => {
                          setMatchConfig({ ...matchConfig, ground: g.name });
                          setShowGroundDropdown(false);
                       }}
                     >
                       <MapPin size={14} color="#94A3B8" style={{ marginRight: 10 }} />
                       <Text style={styles.dropdownItemText}>{g.name}</Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
               <TextInput 
                  style={[styles.configInputPremium, { flex: 1 }]} 
                  placeholder="State"
                  value={matchConfig.state}
                  onChangeText={(val) => setMatchConfig({ ...matchConfig, state: val })}
                  placeholderTextColor="#94A3B8"
               />
               <TextInput 
                  style={[styles.configInputPremium, { flex: 1 }]} 
                  placeholder="City"
                  value={matchConfig.city}
                  onChangeText={(val) => setMatchConfig({ ...matchConfig, city: val })}
                  placeholderTextColor="#94A3B8"
               />
            </View>
          </View>
        </View>

        <View style={[styles.configSection, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={styles.configSectionHeader}>
             <Target size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Wagon Wheel Tracking</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setMatchConfig({ ...matchConfig, wagonWheel: !matchConfig.wagonWheel })}
            style={{ 
              width: 50, height: 28, borderRadius: 14, backgroundColor: matchConfig.wagonWheel ? '#01b854' : '#E2E8F0',
              paddingHorizontal: 4, justifyContent: 'center'
            }}
          >
            <View style={{ 
              width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF',
              alignSelf: matchConfig.wagonWheel ? 'flex-end' : 'flex-start'
            }} />
          </TouchableOpacity>
        </View>

        <View style={{ marginVertical: 10, height: 1, backgroundColor: '#F1F5F9' }} />
        
        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Users size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Match Officials</Text>
          </View>
          <View style={{ gap: 12 }}>
             <TextInput 
                style={styles.configInputPremium} 
                placeholder="Main Umpire"
                value={matchConfig.officials?.umpires?.[0]}
                onChangeText={(txt) => setMatchConfig({ 
                  ...matchConfig, 
                  officials: { ...matchConfig.officials, umpires: [txt, matchConfig.officials?.umpires?.[1] || ''] } 
                })}
                placeholderTextColor="#94A3B8"
             />
             <TextInput 
                style={styles.configInputPremium} 
                placeholder="Official Scorer"
                value={matchConfig.officials?.scorer}
                onChangeText={(txt) => setMatchConfig({ ...matchConfig, officials: { ...matchConfig.officials, scorer: txt } })}
                placeholderTextColor="#94A3B8"
             />
          </View>
        </View>

      </ScrollView>

      <TouchableOpacity style={styles.confirmBtn} onPress={onNext}>
        <Text style={styles.confirmBtnText}>Next: Configure Toss</Text>
        <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
};

// --- TOSS CONFIGURATION VIEW ---
export const TossConfigurationView = ({ 
  selectedTeamA, selectedTeamB, tossResult, setTossResult, onBack, onNext, isFlipping, handleFlip 
}: any) => (
  <View style={styles.selectionView}>
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={onBack}>
        <ChevronLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.selectionTitle}>Toss Details</Text>
      </View>
      <View style={{ width: 24 }} />
    </View>

    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.coinCardPremium}>
        <TouchableOpacity 
          style={[styles.coinIconContainer, isFlipping && styles.coinFlipping]} 
          onPress={handleFlip}
          disabled={isFlipping}
        >
          <View style={styles.coinRingOuter}>
            <View style={styles.coinRingInner}>
               <Text style={styles.coinCurrency}>₹</Text>
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.coinTapText}>
          {isFlipping ? 'Flipping...' : 'Tap the coin for a randomized result'}
        </Text>
      </View>

      <View style={styles.tossSection}>
        <View style={styles.tossSectionHeader}>
           <View style={styles.tossIconBox}>
              <Trophy size={16} color="#01b854" />
           </View>
           <Text style={styles.tossSectionTitle}>Who won the toss?</Text>
        </View>
        <View style={styles.tossChoiceGrid}>
           {[selectedTeamA, selectedTeamB].map(team => {
             const isActive = tossResult.winner?.id === team?.id;
             return (
               <TouchableOpacity 
                 key={team?.id} 
                 style={[styles.tossTeamCard, isActive && styles.tossTeamCardActive]}
                 onPress={() => setTossResult({ ...tossResult, winner: team })}
               >
                 {isActive && (
                   <View style={styles.tossCheckmark}>
                      <CircleCheck size={18} color="#01b854" fill="#FFF" />
                   </View>
                 )}
                 <View style={styles.teamAvatarMedium}>
                    <Text style={styles.teamInitialMedium}>{team?.initials || team?.name[0]}</Text>
                 </View>
                 <Text style={[styles.tossTeamNameText, isActive && styles.tossTeamNameActive]}>{team?.name}</Text>
               </TouchableOpacity>
             );
           })}
        </View>
      </View>

      {tossResult.winner && (
        <View style={styles.tossSection}>
          <View style={styles.tossSectionHeader}>
             <View style={styles.tossIconBox}>
                <Target size={16} color="#01b854" />
             </View>
             <Text style={styles.tossSectionTitle}>{tossResult.winner.name} elected to:</Text>
          </View>
          <View style={styles.tossChoiceGrid}>
             {[
               { id: 'bat', label: 'Bat', icon: <Compass size={24} /> },
               { id: 'bowl', label: 'Bowl', icon: <Dribbble size={24} /> }
             ].map(opt => {
               const isActive = tossResult.decision === opt.id;
               return (
                 <TouchableOpacity 
                   key={opt.id} 
                   style={[styles.tossDecisionCard, isActive && styles.tossDecisionCardActive]}
                   onPress={() => setTossResult({ ...tossResult, decision: opt.id as any })}
                 >
                   {isActive && (
                      <View style={styles.tossCheckmark}>
                         <CircleCheck size={18} color="#FFF" />
                      </View>
                   )}
                   <View style={[styles.tossDecisionIconBox, isActive && styles.tossDecisionIconBoxActive]}>
                      {React.cloneElement(opt.icon as React.ReactElement, { 
                        color: isActive ? '#01b854' : '#64748B' 
                      })}
                   </View>
                   <Text style={[styles.tossDecisionText, isActive && styles.tossDecisionTextActive]}>{opt.label}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>
        </View>
      )}

      {tossResult.winner && tossResult.decision && (
        <View style={styles.tossResultBanner}>
           <View style={styles.tossResultIconBox}>
              <CircleCheck size={20} color="#01b854" />
           </View>
           <View style={{ flex: 1 }}>
              <Text style={styles.tossResultTitle}>Toss completed</Text>
              <Text style={styles.tossResultDesc}>
                {tossResult.winner.name} won the toss and chose to {tossResult.decision}.
              </Text>
           </View>
        </View>
      )}
    </ScrollView>

    <TouchableOpacity 
      style={[styles.confirmBtn, (!tossResult.winner || !tossResult.decision) && { opacity: 0.5 }, { marginHorizontal: 16, marginBottom: 16 }]} 
      onPress={onNext}
      disabled={!tossResult.winner || !tossResult.decision}
    >
      <Text style={styles.confirmBtnText}>Ready to Play</Text>
    </TouchableOpacity>
  </View>
);

// --- OPENING SELECTION VIEW ---
export const OpeningSelectionView = ({ 
  selectedTeamA, selectedTeamB, playingXiA, playingXiB, tossResult, matchState, setMatchState, onBack, onStart 
}: any) => {
  const battingTeamObj = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
  const bowlingTeamObj = battingTeamObj?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
  const battingPlayers = battingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;
  const bowlingPlayers = bowlingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;

  const SelectionSection = ({ title, subtitle, icon, players, value, onSelect, teamName }: any) => (
    <View style={styles.openerSection}>
      <View style={styles.openerSectionHeader}>
        <View style={styles.openerIconBox}>
          {React.cloneElement(icon as React.ReactElement, { size: 16, color: '#01b854' })}
        </View>
        <View>
          <Text style={styles.openerSectionTitle}>{title} ({teamName})</Text>
          <Text style={styles.openerSectionSub}>{subtitle}</Text>
        </View>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.openerPlayerGrid}
      >
        {players.map((p: any) => {
          const isActive = value?.id === p.id;
          return (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.openerPlayerChip, isActive && styles.openerPlayerChipActive]}
              onPress={() => onSelect(p)}
            >
              <Text style={[styles.openerPlayerName, isActive && styles.openerPlayerNameActive]} numberOfLines={1}>
                {p.name || p.player_name}
              </Text>
              {isActive && <CircleCheck size={14} color="#01b854" fill="#FFF" style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const allSelected = matchState.striker && matchState.nonStriker && matchState.bowler && matchState.keeper;

  return (
    <View style={styles.selectionView}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={onBack}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.selectionTitle}>Select</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCardPremium}>
          <View style={styles.infoIconBox}>
            <Users size={20} color="#01b854" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>Select the opening players to start the match</Text>
            <Text style={styles.infoCardSub}>You can change them later if needed</Text>
          </View>
        </View>

        <SelectionSection 
          title="Striker"
          subtitle="Choose the player who will face the first ball"
          icon={<Zap />}
          players={battingPlayers}
          value={matchState.striker}
          onSelect={(p: any) => setMatchState({ ...matchState, striker: p })}
          teamName={battingTeamObj?.name}
        />

        <SelectionSection 
          title="Non-Striker"
          subtitle="Choose the player at the other end"
          icon={<Zap />}
          players={battingPlayers.filter((p: any) => p.id !== matchState.striker?.id)}
          value={matchState.nonStriker}
          onSelect={(p: any) => setMatchState({ ...matchState, nonStriker: p })}
          teamName={battingTeamObj?.name}
        />

        <SelectionSection 
          title="Opening Bowler"
          subtitle="Select the bowler who will open the attack"
          icon={<Dribbble />}
          players={bowlingPlayers}
          value={matchState.bowler}
          onSelect={(p: any) => setMatchState({ ...matchState, bowler: p })}
          teamName={bowlingTeamObj?.name}
        />

        <SelectionSection 
          title="Wicket Keeper"
          subtitle="Select the wicket keeper for the match"
          icon={<Target />}
          players={bowlingPlayers.filter((p: any) => p.id !== matchState.bowler?.id)}
          value={matchState.keeper}
          onSelect={(p: any) => setMatchState({ ...matchState, keeper: p })}
          teamName={bowlingTeamObj?.name}
        />

        {allSelected && (
          <View style={styles.selectionSummaryCard}>
             <View style={styles.summaryIconBox}>
                <ClipboardList size={20} color="#01b854" />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>Your Selections</Text>
                <View style={styles.summaryGrid}>
                   <Text style={styles.summaryText}>
                      <Text style={{ fontWeight: '700' }}>Striker:</Text> {matchState.striker.name || matchState.striker.player_name}
                   </Text>
                   <Text style={styles.summaryText}>
                      <Text style={{ fontWeight: '700' }}>Non-Striker:</Text> {matchState.nonStriker.name || matchState.nonStriker.player_name}
                   </Text>
                   <Text style={styles.summaryText}>
                      <Text style={{ fontWeight: '700' }}>Bowler:</Text> {matchState.bowler.name || matchState.bowler.player_name}
                   </Text>
                   <Text style={styles.summaryText}>
                      <Text style={{ fontWeight: '700' }}>Keeper:</Text> {matchState.keeper.name || matchState.keeper.player_name}
                   </Text>
                </View>
             </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.confirmBtn, !allSelected && { opacity: 0.5 }, { marginHorizontal: 16, marginBottom: 16 }]} 
        onPress={onStart}
        disabled={!allSelected}
      >
        <Text style={styles.confirmBtnText}>Start Match</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- SCORING SETTINGS SIDE SHEET ---
export const ScoringSettingsSheet = ({ isVisible, onClose, onAction }: any) => {
  const sections = [
    {
      title: 'Match Settings',
      icon: <Target size={18} color="#666" />,
      items: [
        { label: 'Edit Scorecard', id: 'edit_scorecard' },
        { label: 'Change Match Overs', id: 'change_overs' },
        { label: 'Match Rules (WD, NB, WW)', id: 'match_rules' },
        { label: 'Revise Target (DLS/VJD)', id: 'revise_target' },
        { label: 'Add Bonus Runs', id: 'bonus_runs' },
        { label: 'Give Penalty Runs', id: 'penalty_runs' },
        { label: 'End / Declare Innings', id: 'end_innings' },
        { label: 'End Match', id: 'end_match' },
      ]
    },
    {
      title: 'Players Settings',
      icon: <Users size={18} color="#666" />,
      items: [
        { label: 'Change Playing Squad', id: 'change_squad' },
        { label: 'Change Bowler', id: 'change_bowler' },
        { label: 'Replace Batters', id: 'replace_batters' },
        { label: 'Retired Hurt (Batter)', id: 'retired_hurt' },
      ]
    },
    {
      title: 'Scorer Settings',
      icon: <Briefcase size={18} color="#666" />,
      items: [
        { label: 'Change Scorer', id: 'change_scorer' },
        { label: 'Add Match Officials/Streamer', id: 'add_officials' },
        { label: 'Select Power Play Overs', id: 'powerplay' },
        { label: 'Set Match Breaks', id: 'match_breaks' },
        { label: 'Add Scorer Notes', id: 'scorer_notes' },
      ]
    },
    {
      title: 'Other Options',
      icon: <Layers size={18} color="#666" />,
      items: [
        { label: 'Scoring Help', id: 'help' },
        { label: 'Share the App', id: 'share' },
      ]
    }
  ];

  console.log('[ScoringSettingsSheet] Render, isVisible:', isVisible);
  if (!isVisible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sideSheetOverlay}>
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={onClose} 
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </Pressable>
        
        <View style={{ flex: 1, flexDirection: 'row', pointerEvents: 'box-none' }}>
          <View style={{ flex: 0.2 }} />
          <View style={[styles.sideSheetContainer, { flex: 0.8, height: '100%' }]}>
            <View style={styles.sideSheetHeader}>
              <Text style={styles.sideSheetTitle}>Settings</Text>
              <TouchableOpacity onPress={onClose} style={styles.sideSheetCloseBtn}>
                <X size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sideSheetContent} showsVerticalScrollIndicator={false}>
              {sections.map((section, idx) => (
                <View key={idx} style={styles.sideSheetSection}>
                  <View style={styles.sideSheetSectionHeader}>
                    {section.icon}
                    <Text style={styles.sideSheetSectionTitle}>{section.title}</Text>
                    <ChevronDown size={16} color="#999" />
                  </View>
                  <View style={styles.sideSheetSectionItems}>
                    {section.items.map((item, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.sideSheetItem}
                        onPress={() => {
                          onAction(item.id);
                          onClose();
                        }}
                      >
                        <Text style={styles.sideSheetItemText}>{item.label}</Text>
                        <ChevronRight size={14} color="#CCC" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};
