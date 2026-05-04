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
  Check
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
  onOpenPickerA, onOpenPickerB, 
  onBack, onContinue 
}: any) => (
  <View style={styles.selectionView}>
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={onBack}>
        <ChevronLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      <Text style={styles.selectionTitle}>Select Teams</Text>
      <View style={{ width: 24 }} />
    </View>
    
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
      <View style={styles.vsSelectionCard}>
        <TouchableOpacity 
          style={[styles.vsSelectionSide, selectedTeamA && styles.vsSelectionSideActive]}
          onPress={onOpenPickerA}
        >
          <View style={[styles.vsSelectionAvatar, { backgroundColor: selectedTeamA?.bgColor || '#F1F5F9' }]}>
            {selectedTeamA ? (
              <Text style={styles.vsSelectionInitial}>{selectedTeamA.initials || selectedTeamA.name[0]}</Text>
            ) : (
              <Plus size={32} color="#94A3B8" />
            )}
          </View>
          <Text style={styles.vsSelectionName} numberOfLines={1}>
            {selectedTeamA?.name || 'Select Team A'}
          </Text>
          <Text style={styles.vsSelectionRole}>HOME TEAM</Text>
        </TouchableOpacity>

        <View style={styles.vsBadgeContainerLarge}>
          <Text style={styles.vsBadgeTextLarge}>VS</Text>
        </View>

        <TouchableOpacity 
          style={[styles.vsSelectionSide, selectedTeamB && styles.vsSelectionSideActive]}
          onPress={onOpenPickerB}
        >
          <View style={[styles.vsSelectionAvatar, { backgroundColor: selectedTeamB?.bgColor || '#F1F5F9' }]}>
            {selectedTeamB ? (
              <Text style={styles.vsSelectionInitial}>{selectedTeamB.initials || selectedTeamB.name[0]}</Text>
            ) : (
              <Plus size={32} color="#94A3B8" />
            )}
          </View>
          <Text style={styles.vsSelectionName} numberOfLines={1}>
            {selectedTeamB?.name || 'Select Team B'}
          </Text>
          <Text style={styles.vsSelectionRole}>AWAY TEAM</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectionGuideBox}>
        <Info size={20} color="#01b854" />
        <Text style={styles.selectionGuideText}>
          Tap on a side to select or add a team via QR code.
        </Text>
      </View>
    </ScrollView>

    <TouchableOpacity 
      style={[styles.confirmBtn, (!selectedTeamA || !selectedTeamB) && { opacity: 0.5 }]}
      onPress={onContinue}
      disabled={!selectedTeamA || !selectedTeamB}
    >
      <Text style={styles.confirmBtnText}>Continue to Players</Text>
    </TouchableOpacity>
  </View>
);

// --- PLAYER SELECTION VIEW ---
export const PlayerSelectionView = ({ 
  team, teamMembers, playingXi, currentCaptain, 
  onTogglePlayer, onToggleCaptain, 
  onBack, onContinue, isLoading 
}: any) => (
  <View style={styles.selectionView}>
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={onBack}>
        <ChevronLeft size={24} color="#1E293B" />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.selectionTitle}>Select Players</Text>
        <Text style={styles.selectionSubTitleSmall}>{team?.name} • {playingXi.length} picked</Text>
      </View>
      <View style={{ width: 24 }} />
    </View>

    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      {isLoading ? (
        <View style={{ flex: 1, padding: 100, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#01b854" />
        </View>
      ) : teamMembers.length === 0 ? (
        <View style={styles.emptyMembersBox}>
          <Text style={styles.emptyMembersText}>No players found for this team.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {teamMembers.map((member: any) => {
            const isSelected = !!playingXi.find((p: any) => p.id === member.id);
            const isCaptain = currentCaptain?.id === member.id;
            return (
              <View key={member.id} style={[styles.playerSelectRowPremium, isSelected && styles.playerSelectRowPremiumActive]}>
                <TouchableOpacity 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} 
                  onPress={() => onTogglePlayer(member)}
                >
                  <View style={[styles.checkBoxPremium, isSelected && styles.checkBoxPremiumActive]}>
                    {isSelected && <Check size={16} color="#FFF" strokeWidth={3} />}
                  </View>
                  <View>
                    <Text style={[styles.playerNamePremium, isSelected && styles.playerNamePremiumActive]}>{member.player_name}</Text>
                    <Text style={styles.playerRolePremium}>{member.role || 'Player'}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.captainBtn, isCaptain && styles.captainBtnActive]} 
                  onPress={() => onToggleCaptain(member)}
                >
                  <Crown size={20} color={isCaptain ? '#01b854' : '#CBD5E1'} />
                  {isCaptain && <Text style={styles.captainLabel}>CAPT</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>

    <View style={styles.configFooter}>
       <TouchableOpacity 
         style={[styles.confirmBtn, (playingXi.length === 0 || !currentCaptain) && { opacity: 0.5 }]}
         onPress={onContinue}
         disabled={playingXi.length === 0 || !currentCaptain}
       >
         <Text style={styles.confirmBtnText}>Confirm Team & Captain</Text>
       </TouchableOpacity>
    </View>
  </View>
);


// --- MATCH CONFIGURATION VIEW ---
export const MatchConfigurationView = ({ 
  selectedTeamA, selectedTeamB, playingXiA, playingXiB, matchConfig, setMatchConfig, 
  onBack, onNext, onSelectPlayersA, onSelectPlayersB, 
  showStateDropdown, setShowStateDropdown, searchGrounds, groundResults, 
  showGroundDropdown, setShowGroundDropdown, isSearchingGround 
}: any) => {
  const types = [
    { id: 'limited overs', label: 'Limited Overs' },
    { id: 'box cricket', label: 'Box Cricket' },
    { id: 'test match', label: 'Test Match' }
  ];

  return (
    <View style={styles.selectionView}>
       <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={onBack}>
             <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.selectionTitle}>Match Details</Text>
          <View style={{ width: 24 }} />
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.vsDisplay}>
              <TouchableOpacity style={styles.vsTeam} onPress={onSelectPlayersA}>
                 <Text style={styles.vsName}>{selectedTeamA?.name}</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Text style={styles.vsPlayers}>{playingXiA.length} Players</Text>
                   <ChevronRight size={14} color="#94A3B8" />
                 </View>
              </TouchableOpacity>
              <View style={styles.vsBadge}><Text style={styles.vsBadgeText}>VS</Text></View>
              <TouchableOpacity style={styles.vsTeam} onPress={onSelectPlayersB}>
                 <Text style={styles.vsName}>{selectedTeamB?.name}</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Text style={styles.vsPlayers}>{playingXiB.length} Players</Text>
                   <ChevronRight size={14} color="#94A3B8" />
                 </View>
              </TouchableOpacity>
          </View>

          <Text style={styles.configLabel}>Match Type</Text>
          <View style={styles.typeGrid}>
             {types.map(t => (
               <TouchableOpacity 
                 key={t.id} 
                 style={[styles.typePill, matchConfig.type === t.id && styles.typePillActive]}
                 onPress={() => setMatchConfig({ ...matchConfig, type: t.id })}
               >
                  <Text style={[styles.typePillText, matchConfig.type === t.id && styles.typePillTextActive]}>{t.label}</Text>
               </TouchableOpacity>
             ))}
          </View>

          <Text style={styles.configLabel}>Ball Type</Text>
          <View style={styles.typeGrid}>
             {['leather', 'tennis', 'other'].map(b => (
               <TouchableOpacity 
                 key={b} 
                 style={[styles.typePill, matchConfig.ballType === b && styles.typePillActive]}
                 onPress={() => setMatchConfig({ ...matchConfig, ballType: b })}
               >
                  <Text style={[styles.typePillText, matchConfig.ballType === b && styles.typePillTextActive]}>
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </Text>
               </TouchableOpacity>
             ))}
          </View>

          <Text style={styles.configLabel}>Pitch Type</Text>
          <View style={styles.typeGrid}>
             {['Rough', 'Matting', 'Turf', 'Other'].map(p => (
               <TouchableOpacity 
                 key={p} 
                 style={[styles.typePill, matchConfig.pitchType === p && styles.typePillActive]}
                 onPress={() => setMatchConfig({ ...matchConfig, pitchType: p })}
               >
                  <Text style={[styles.typePillText, matchConfig.pitchType === p && styles.typePillTextActive]}>{p}</Text>
               </TouchableOpacity>
             ))}
          </View>

          <View style={{ marginTop: 24, gap: 20 }}>
             <View>
                <Text style={styles.configLabel}>No. of Overs</Text>
                <TextInput 
                  style={styles.configInput} 
                  keyboardType="numeric" 
                  value={matchConfig.totalOvers}
                  placeholder="e.g. 20"
                  onChangeText={(val) => setMatchConfig({ ...matchConfig, totalOvers: val })}
                />
             </View>
             <View>
                <Text style={styles.configLabel}>Ground Name</Text>
                <TextInput 
                  style={styles.configInput} 
                  placeholder="Search or Enter Ground"
                  value={matchConfig.ground}
                  onChangeText={(txt) => searchGrounds(txt)}
                />
             </View>
             <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>State</Text>
                    <TextInput 
                      style={styles.configInput} 
                      placeholder="State"
                      value={matchConfig.state}
                      onChangeText={(txt) => setMatchConfig({ ...matchConfig, state: txt })}
                    />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>City</Text>
                   <TextInput 
                     style={styles.configInput} 
                     placeholder="City"
                     value={matchConfig.city}
                     onChangeText={(txt) => setMatchConfig({ ...matchConfig, city: txt })}
                   />
                </View>
             </View>

             <View>
                <Text style={styles.configLabel}>Date & Time</Text>
                <TextInput 
                  style={styles.configInput} 
                  placeholder="e.g. May 24, 2024 • 09:30 AM"
                  value={matchConfig.dateTime}
                  onChangeText={(txt) => setMatchConfig({ ...matchConfig, dateTime: txt })}
                />
             </View>

             <View style={{ marginVertical: 10, height: 1, backgroundColor: '#E5E7EB' }} />
             <Text style={[styles.configLabel, { fontSize: 16, marginBottom: 16, color: '#01b854' }]}>Match Officials</Text>

             <View style={{ gap: 16 }}>
                <View>
                   <Text style={styles.configLabel}>Main Umpire</Text>
                   <TextInput 
                     style={styles.configInput} 
                     placeholder="Enter Umpire Name"
                     value={matchConfig.officials?.umpires?.[0]}
                     onChangeText={(txt) => setMatchConfig({ 
                       ...matchConfig, 
                       officials: { ...matchConfig.officials, umpires: [txt, matchConfig.officials?.umpires?.[1] || ''] } 
                     })}
                   />
                </View>
                <View>
                   <Text style={styles.configLabel}>Leg Umpire</Text>
                   <TextInput 
                     style={styles.configInput} 
                     placeholder="Enter Umpire Name"
                     value={matchConfig.officials?.umpires?.[1]}
                     onChangeText={(txt) => setMatchConfig({ 
                       ...matchConfig, 
                       officials: { ...matchConfig.officials, umpires: [matchConfig.officials?.umpires?.[0] || '', txt] } 
                     })}
                   />
                </View>
                <View>
                   <Text style={styles.configLabel}>Official Scorer</Text>
                   <TextInput 
                     style={styles.configInput} 
                     placeholder="Enter Scorer Name"
                     value={matchConfig.officials?.scorer}
                     onChangeText={(txt) => setMatchConfig({ 
                       ...matchConfig, 
                       officials: { ...matchConfig.officials, scorer: txt } 
                     })}
                   />
                </View>
             </View>

             <View style={{ marginVertical: 10, height: 1, backgroundColor: '#E5E7EB' }} />
             <Text style={[styles.configLabel, { fontSize: 16, marginBottom: 16, color: '#01b854' }]}>Match Rules & Limits</Text>

             <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>Wide Run</Text>
                    <TextInput 
                      style={styles.configInput} 
                      keyboardType="numeric"
                      value={matchConfig.wideRuns}
                      onChangeText={(val) => setMatchConfig({ ...matchConfig, wideRuns: val })}
                    />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>No Ball Run</Text>
                   <TextInput 
                     style={styles.configInput} 
                     keyboardType="numeric"
                     value={matchConfig.noBallRuns}
                     onChangeText={(val) => setMatchConfig({ ...matchConfig, noBallRuns: val })}
                   />
                </View>
             </View>

             <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>Players/Team</Text>
                    <TextInput 
                      style={styles.configInput} 
                      keyboardType="numeric"
                      value={matchConfig.playersPerTeam}
                      onChangeText={(val) => setMatchConfig({ ...matchConfig, playersPerTeam: val })}
                    />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.configLabel}>Powerplay (Overs)</Text>
                   <TextInput 
                     style={styles.configInput} 
                     keyboardType="numeric"
                     value={matchConfig.powerplayOvers}
                     onChangeText={(val) => setMatchConfig({ ...matchConfig, powerplayOvers: val })}
                   />
                </View>
             </View>
          </View>
       </ScrollView>

       <View style={styles.configFooter}>
          <TouchableOpacity style={styles.startMatchMainBtn} onPress={onNext}>
             <Text style={styles.startMatchMainBtnText}>Next: Configure Toss</Text>
          </TouchableOpacity>
       </View>
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
        <Text style={styles.selectionTitle}>Toss Details</Text>
        <View style={{ width: 24 }} />
     </View>

     <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <TouchableOpacity 
          style={[styles.coin, isFlipping && styles.coinFlipping]} 
          onPress={handleFlip}
          disabled={isFlipping}
        >
           <View style={styles.coinInner}>
              <Text style={styles.coinText}>{isFlipping ? '?' : '₹'}</Text>
           </View>
        </TouchableOpacity>
        <Text style={styles.tapToFlipText}>{isFlipping ? 'Flipping...' : 'Tap for randomized result'}</Text>

        <View style={{ width: '100%', marginTop: 40 }}>
           <Text style={styles.configLabel}>Who won the toss?</Text>
           <View style={styles.tossWinnerSelection}>
              {[selectedTeamA, selectedTeamB].map(team => (
                <TouchableOpacity 
                  key={team?.id} 
                  style={[styles.tossTeamBtn, tossResult.winner?.id === team?.id && styles.tossTeamBtnActive]}
                  onPress={() => setTossResult({ ...tossResult, winner: team })}
                >
                   <Text style={[styles.tossTeamName, tossResult.winner?.id === team?.id && styles.tossTeamNameActive]}>{team?.name}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>

        {tossResult.winner && (
          <View style={{ width: '100%', marginTop: 32 }}>
             <Text style={styles.configLabel}>{tossResult.winner.name} elected to:</Text>
             <View style={styles.decisionRow}>
                {['Bat', 'Bowl'].map(d => (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.decisionBtn, tossResult.decision === d.toLowerCase() && styles.decisionBtnActive]}
                    onPress={() => setTossResult({ ...tossResult, decision: d.toLowerCase() as any })}
                  >
                     <Text style={[styles.decisionText, tossResult.decision === d.toLowerCase() && styles.decisionTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>
        )}
     </ScrollView>

     <View style={styles.configFooter}>
        <TouchableOpacity 
          style={[styles.startMatchMainBtn, (!tossResult.winner || !tossResult.decision) && { opacity: 0.5 }]}
          disabled={!tossResult.winner || !tossResult.decision}
          onPress={onNext}
        >
           <Text style={styles.startMatchMainBtnText}>Ready to Play</Text>
        </TouchableOpacity>
     </View>
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

  return (
    <View style={styles.selectionView}>
       <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={onBack}>
             <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.selectionTitle}>Select Openers</Text>
          <View style={{ width: 24 }} />
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.configLabel}>Striker ({battingTeamObj?.name})</Text>
          <View style={styles.playerGrid}>
             {battingPlayers.map((p: any) => (
               <TouchableOpacity 
                 key={p.id} 
                 style={[styles.playerGridTile, matchState.striker?.id === p.id && styles.playerGridTileActive]}
                 onPress={() => setMatchState({ ...matchState, striker: p })}
               >
                  <Text style={[styles.playerGridName, matchState.striker?.id === p.id && styles.playerGridNameActive]}>{p.player_name}</Text>
               </TouchableOpacity>
             ))}
          </View>

          <Text style={[styles.configLabel, { marginTop: 20 }]}>Non-Striker</Text>
          <View style={styles.playerGrid}>
             {battingPlayers.map((p: any) => (
               <TouchableOpacity 
                 key={p.id} 
                 style={[styles.playerGridTile, matchState.nonStriker?.id === p.id && styles.playerGridTileActive]}
                 onPress={() => setMatchState({ ...matchState, nonStriker: p })}
               >
                  <Text style={[styles.playerGridName, matchState.nonStriker?.id === p.id && styles.playerGridNameActive]}>{p.player_name}</Text>
               </TouchableOpacity>
             ))}
          </View>

          <Text style={[styles.configLabel, { marginTop: 20 }]}>Opening Bowler ({bowlingTeamObj?.name})</Text>
          <View style={styles.playerGrid}>
            {bowlingPlayers.map((p: any) => (
               <TouchableOpacity 
                 key={p.id} 
                 style={[styles.playerGridTile, matchState.bowler?.id === p.id && styles.playerGridTileActive]}
                 onPress={() => setMatchState({ ...matchState, bowler: p })}
               >
                  <Text style={[styles.playerGridName, matchState.bowler?.id === p.id && styles.playerGridNameActive]}>{p.player_name}</Text>
               </TouchableOpacity>
             ))}
          </View>
       </ScrollView>

       <View style={styles.configFooter}>
          <TouchableOpacity 
            style={[styles.startMatchMainBtn, (!matchState.striker || !matchState.nonStriker || !matchState.bowler) && { opacity: 0.5 }]}
            disabled={!matchState.striker || !matchState.nonStriker || !matchState.bowler}
            onPress={onStart}
          >
             <Text style={styles.startMatchMainBtnText}>Start Match</Text>
          </TouchableOpacity>
       </View>
    </View>
  );
};
