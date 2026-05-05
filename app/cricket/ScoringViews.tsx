import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
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
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={onBack}>
        <ChevronLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.selectionTitle}>Select Teams</Text>
        <Text style={styles.selectionSubtitle}>Choose your home and away teams</Text>
      </View>
      <View style={{ width: 24 }} />
    </View>
    
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 20, flexGrow: 1, justifyContent: 'center' }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.vsSelectionCard}>
        {/* Home Team Side */}
        <TouchableOpacity 
          style={[styles.vsSelectionSide, selectedTeamA && styles.vsSelectionSideActive]}
          onPress={onOpenPickerA}
        >
          <View style={styles.sideBadgeHome}>
             <Text style={styles.sideBadgeText}>HOME TEAM</Text>
          </View>
          <View style={[styles.vsSelectionAvatar, { borderColor: '#01b854' }]}>
            {selectedTeamA ? (
              <Text style={styles.vsSelectionInitial}>{selectedTeamA.initials || selectedTeamA.name[0]}</Text>
            ) : (
              <Briefcase size={32} color="#01b854" />
            )}
          </View>
          <Text style={styles.vsSelectionName} numberOfLines={1}>
            {selectedTeamA?.name || 'Select Home Team'}
          </Text>
          <Text style={styles.vsSelectionTap}>Tap to choose</Text>
        </TouchableOpacity>

        <View style={styles.vsBadgeContainerLarge}>
          <Text style={styles.vsBadgeTextLarge}>vs</Text>
        </View>

        {/* Away Team Side */}
        <TouchableOpacity 
          style={[styles.vsSelectionSide, selectedTeamB && styles.vsSelectionSideActive]}
          onPress={onOpenPickerB}
        >
          <View style={styles.sideBadgeAway}>
             <Text style={styles.sideBadgeText}>AWAY TEAM</Text>
          </View>
          <View style={[styles.vsSelectionAvatar, { borderColor: '#01b854' }]}>
            {selectedTeamB ? (
              <Text style={styles.vsSelectionInitial}>{selectedTeamB.initials || selectedTeamB.name[0]}</Text>
            ) : (
              <Briefcase size={32} color="#01b854" />
            )}
          </View>
          <Text style={styles.vsSelectionName} numberOfLines={1}>
            {selectedTeamB?.name || 'Select Away Team'}
          </Text>
          <Text style={styles.vsSelectionTap}>Tap to choose</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectionGuideBox}>
        <View style={styles.guideIconWrapper}>
          <Info size={20} color="#01b854" />
        </View>
        <Text style={styles.selectionGuideText}>
          Tap on a side to select or add a team via QR code.
        </Text>
        <TouchableOpacity style={styles.guideQrBtn} onPress={onScanQr}>
          <QrCode size={20} color="#01b854" />
        </TouchableOpacity>
      </View>

      <View style={styles.benefitsRow}>
        <View style={styles.benefitItem}>
          <Shield size={24} color="#01b854" />
          <Text style={styles.benefitTitle}>Official Teams</Text>
          <Text style={styles.benefitSub}>Verified & Updated</Text>
        </View>
        <View style={styles.benefitDivider} />
        <View style={styles.benefitItem}>
          <Users size={24} color="#01b854" />
          <Text style={styles.benefitTitle}>Easy Selection</Text>
          <Text style={styles.benefitSub}>Quick & Simple</Text>
        </View>
        <View style={styles.benefitDivider} />
        <View style={styles.benefitItem}>
          <Star size={24} color="#01b854" />
          <Text style={styles.benefitTitle}>Better Matches</Text>
          <Text style={styles.benefitSub}>More Exciting</Text>
        </View>
      </View>
    </ScrollView>

    <TouchableOpacity 
      style={[styles.confirmBtn, (!selectedTeamA || !selectedTeamB) && { opacity: 0.5 }]}
      onPress={onContinue}
      disabled={!selectedTeamA || !selectedTeamB}
    >
      <Text style={styles.confirmBtnText}>Continue to Players</Text>
      <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  </View>
);

// --- PLAYER SELECTION VIEW ---
export const PlayerSelectionView = ({ 
  team, teamMembers, playingXi, onTogglePlayer, onToggleCaptain, 
  onBack, onContinue, currentCaptain, searchQuery, setSearchQuery, onScanPlayer 
}: any) => {
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
          <Text style={styles.selectionTitle} numberOfLines={1}>{team?.name || 'Select Players'}</Text>
          <Text style={styles.selectionSubtitle}>{playingXi.length} Players Selected</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={styles.searchBarPremium}>
          <Search size={20} color="#94A3B8" />
          <TextInput 
            placeholder="Search team players..."
            style={styles.searchInputPremium}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity 
            style={styles.qrBtnSmall}
            onPress={onScanPlayer}
          >
            <QrCode size={20} color="#01b854" />
          </TouchableOpacity>
        </View>
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

                {isSelected && (
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

      <TouchableOpacity 
        style={[styles.confirmBtn, playingXi.length === 0 && { opacity: 0.5 }, { marginHorizontal: 16 }]}
        onPress={onContinue}
        disabled={playingXi.length === 0}
      >
        <Text style={styles.confirmBtnText}>Confirm Team & Captain</Text>
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
               <Text style={styles.teamInitialSmall}>{selectedTeamA?.initials || selectedTeamA?.name?.[0]}</Text>
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
               <Text style={styles.teamInitialSmall}>{selectedTeamB?.initials || selectedTeamB?.name?.[0]}</Text>
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

        <View style={styles.configSection}>
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
             <ChevronDown size={20} color="#01b854" />
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <MapPin size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Ground Name</Text>
          </View>
          <View style={styles.searchBarPremium}>
             <Search size={20} color="#94A3B8" />
             <TextInput 
               placeholder="Search or Enter Ground"
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
               <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
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

        <View style={styles.configSection}>
          <View style={styles.configSectionHeader}>
             <Shield size={18} color="#01b854" />
             <Text style={styles.configSectionTitle}>Match Rules</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
             <View style={[styles.configInputPremium, { flex: 1, height: 48 }]}>
                <Text style={{ fontSize: 12, color: '#64748B', marginRight: 8 }}>Wide:</Text>
                <TextInput 
                   keyboardType="numeric"
                   style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#06392e' }}
                   value={matchConfig.wideRuns?.toString()}
                   onChangeText={(val) => setMatchConfig({ ...matchConfig, wideRuns: val })}
                />
             </View>
             <View style={[styles.configInputPremium, { flex: 1, height: 48 }]}>
                <Text style={{ fontSize: 12, color: '#64748B', marginRight: 8 }}>No Ball:</Text>
                <TextInput 
                   keyboardType="numeric"
                   style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#06392e' }}
                   value={matchConfig.noBallRuns?.toString()}
                   onChangeText={(val) => setMatchConfig({ ...matchConfig, noBallRuns: val })}
                />
             </View>
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
        <Text style={styles.selectionSubtitle}>Match setup</Text>
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
                        color: isActive ? '#FFF' : '#64748B' 
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
      style={[styles.confirmBtn, (!tossResult.winner || !tossResult.decision) && { opacity: 0.5 }]} 
      onPress={onNext}
      disabled={!tossResult.winner || !tossResult.decision}
    >
      <Flag size={20} color="#FFF" style={{ marginRight: 8 }} />
      <Text style={styles.confirmBtnText}>Ready to Play</Text>
      <ArrowRight size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
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
          <Text style={styles.selectionTitle}>Select Openers</Text>
          <Text style={styles.selectionSubtitle}>Choose players for key positions</Text>
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
        style={[styles.confirmBtn, !allSelected && { opacity: 0.5 }]} 
        onPress={onStart}
        disabled={!allSelected}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Play size={20} color="#FFF" fill="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.confirmBtnText}>Start Match</Text>
          <ArrowRight size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
        </View>
      </TouchableOpacity>
    </View>
  );
};
