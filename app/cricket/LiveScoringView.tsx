import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Platform,
  Modal
} from 'react-native';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  MoreHorizontal, 
  Settings,
  Plus,
  Search,
  User,
  AlertCircle,
  RotateCw,
  RefreshCw,
  UserMinus,
  Flag,
  PenSquare,
  Users2
} from 'lucide-react-native';
import { styles } from './scoring-styles';

// --- LIVE SCORING MAIN VIEW ---
export const LiveScoringView = ({ 
  inn, matchConfig, tossResult, matchPhase, 
  striker, nonStriker, bowler, crr,
  onAddBall, onUndo, onOpenMore, onOpenSettings, onStartSecondInnings,
  onOpenBowlerSelection, onOpenWicketConfig, onOpenExtraSelector
}: any) => {
  if (!inn) return null;
  
  const formatOvers = (legalBalls: number) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const oversStr = formatOvers(inn.legalBalls);
  
  const calcSR = (r: number, b: number) => b === 0 ? '0.0' : ((r / b) * 100).toFixed(1);
  const calcEco = (r: number, b: number, o: number) => {
     const totalBalls = (o * 6) + b;
     return totalBalls === 0 ? '0.0' : (r / (totalBalls / 6)).toFixed(1);
  };

  return (
    <View style={styles.scoringContainer}>
       {/* Top Scoreboard */}
       <View style={styles.mainScoreboard}>
          <View style={styles.scoreRow}>
             <View>
                <Text style={styles.scoringTeamName}>{inn.battingTeam}</Text>
                <View style={styles.scoreNumberRow}>
                   <Text style={styles.bigRuns}>{inn.runs}-{inn.wickets}</Text>
                   <Text style={styles.overText}>({oversStr})</Text>
                </View>
             </View>
             <View style={styles.crrBadge}>
                <Text style={styles.crrLabel}>CRR</Text>
                <Text style={styles.crrValue}>{crr}</Text>
             </View>
          </View>
          
          <View style={styles.targetRow}>
             <Text style={styles.targetText}>
               {inn.target 
                 ? `Target: ${inn.target} | Need ${inn.target - inn.runs} from ${parseInt(matchConfig.totalOvers || '20') * 6 - inn.legalBalls} balls` 
                 : `${tossResult.winner?.name} won the toss and opted to ${tossResult.decision === 'bowl' ? 'bowl' : 'bat'}`}
             </Text>
          </View>

          {/* In-Play Tables */}
          <View style={[styles.playerStatsRow, { gap: 24 }]}>
             <View style={[styles.batsmanCol, { flex: 3 }]}>
                <View style={styles.statsHeader}>
                   <Text style={[styles.statsHeaderText, { flex: 2 }]}>Batsman</Text>
                   <View style={[styles.statsHeadValues, { gap: 10 }]}>
                      <Text style={styles.statsHeaderTextFixed}>R</Text>
                      <Text style={styles.statsHeaderTextFixed}>B</Text>
                      <Text style={styles.statsHeaderTextFixed}>4s</Text>
                      <Text style={styles.statsHeaderTextFixed}>6s</Text>
                      <Text style={[styles.statsHeaderTextFixed, { width: 38 }]}>SR</Text>
                   </View>
                </View>
                {[striker, nonStriker].map((b, idx) => (
                  <View key={idx} style={styles.statsRow}>
                     <Text style={[styles.playerName, b?.onStrike && { color: '#01b854' }, { flex: 2 }]} numberOfLines={1}>
                        {b?.name || '---'}{b?.onStrike ? '*' : ''}
                     </Text>
                     <View style={[styles.statsValues, { gap: 10 }]}>
                        <Text style={styles.statsValueTextFixed}>{b?.runs || 0}</Text>
                        <Text style={styles.statsValueTextFixed}>{b?.balls || 0}</Text>
                        <Text style={styles.statsValueTextFixed}>{b?.fours || 0}</Text>
                        <Text style={styles.statsValueTextFixed}>{b?.sixes || 0}</Text>
                        <Text style={[styles.statsValueTextFixed, { width: 38 }]}>{calcSR(b?.runs || 0, b?.balls || 0)}</Text>
                     </View>
                  </View>
                ))}
             </View>
             <View style={[styles.bowlerCol, { flex: 3 }]}>
                <View style={styles.statsHeader}>
                   <Text style={[styles.statsHeaderText, { flex: 2 }]}>Bowler</Text>
                   <View style={[styles.statsHeadValues, { gap: 10 }]}>
                      <Text style={styles.statsHeaderTextFixed}>O</Text>
                      <Text style={styles.statsHeaderTextFixed}>M</Text>
                      <Text style={styles.statsHeaderTextFixed}>R</Text>
                      <Text style={styles.statsHeaderTextFixed}>W</Text>
                      <Text style={[styles.statsHeaderTextFixed, { width: 32 }]}>Eco</Text>
                   </View>
                </View>
                <TouchableOpacity style={styles.statsRow} onPress={onOpenBowlerSelection}>
                   <Text style={[styles.playerName, { flex: 2 }]} numberOfLines={1}>
                      {bowler?.name || 'Select Bowler...'}
                   </Text>
                   <View style={[styles.statsValues, { gap: 10 }]}>
                      <Text style={styles.statsValueTextFixed}>{bowler?.overs ?? 0}.{bowler?.balls ?? 0}</Text>
                      <Text style={styles.statsValueTextFixed}>{bowler?.maidens || 0}</Text>
                      <Text style={styles.statsValueTextFixed}>{bowler?.runs || 0}</Text>
                      <Text style={styles.statsValueTextFixed}>{bowler?.wickets || 0}</Text>
                      <Text style={[styles.statsValueTextFixed, { width: 32 }]}>{calcEco(bowler?.runs || 0, bowler?.balls || 0, bowler?.overs || 0)}</Text>
                   </View>
                </TouchableOpacity>
             </View>
          </View>

          {/* Ball Timeline */}
          <View style={styles.timelineContainer}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {inn.overBalls?.slice(-12).map((b: any, i: number) => (
                  <View key={i} style={[styles.ballCircle, b.label === 'W' && styles.ballWicket, (b.label === '4' || b.label === '6') && styles.ballBoundary]}>
                     <Text style={[styles.ballLabel, (b.label === 'W' || b.label === '4' || b.label === '6') && { color: '#FFFFFF' }]}>{b.label}</Text>
                  </View>
                ))}
                {inn.overBalls?.length === 0 && <Text style={styles.statsHeaderText}>Start the over...</Text>}
             </ScrollView>
          </View>
       </View>

       {/* Scoring Wheel */}
       <View style={styles.scoringWheel}>
          <View style={styles.wheelRow}>
             {[0, 1, 2, 3].map(n => (
               <TouchableOpacity key={n} style={styles.runBtn} onPress={() => onAddBall(n)}>
                  <Text style={styles.runBtnText}>{n}</Text>
               </TouchableOpacity>
             ))}
          </View>
          <View style={styles.wheelRow}>
             {[4, 6].map(n => (
               <TouchableOpacity key={n} style={[styles.runBtn, styles.boundaryBtn]} onPress={() => onAddBall(n)}>
                  <Text style={styles.boundaryBtnText}>{n}</Text>
               </TouchableOpacity>
             ))}
              <TouchableOpacity style={[styles.runBtn, styles.wicketBtn]} onPress={onOpenWicketConfig}>
                 <Text style={styles.runBtnText}>W</Text>
              </TouchableOpacity>
          </View>
          <View style={styles.extraRow}>
             {['wide', 'noball', 'bye', 'legbye'].map(type => (
               <TouchableOpacity key={type} style={styles.extraBtn} onPress={() => onOpenExtraSelector(type)}>
                 <Text style={styles.extraBtnText}>{type === 'wide' ? 'WD' : type === 'noball' ? 'NB' : type === 'bye' ? 'BYE' : 'LB'}</Text>
               </TouchableOpacity>
             ))}
          </View>
       </View>

       {/* Bottom Actions */}
       <View style={styles.scoringActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={onUndo}>
            <RotateCcw size={20} color="#6B7280" />
            <Text style={styles.actionIconText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={onOpenMore}>
            <MoreHorizontal size={20} color="#6B7280" />
            <Text style={styles.actionIconText}>More</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={onOpenSettings}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.actionIconText}>Settings</Text>
          </TouchableOpacity>
          
          {matchPhase === 'innings_break' && (
            <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: '#FFF7ED', width: '30%' }]} onPress={onStartSecondInnings}>
              <ChevronRight size={20} color="#F97316" />
              <Text style={[styles.actionIconText, { color: '#F97316' }]}>2nd Inning</Text>
            </TouchableOpacity>
          )}
       </View>
    </View>
  );
};

// --- BOWLER SELECTION VIEW ---
export const BowlerSelectionView = ({ 
  inn, selectedTeamA, selectedTeamB, playingXiA, playingXiB, tossResult, onSelectBowler 
}: any) => {
  const battingTeam = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
  const bowlingTeam = battingTeam?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
  const bowlingPlayers = bowlingTeam?.id === selectedTeamA?.id ? playingXiA : playingXiB;

  return (
    <View style={styles.selectionView}>
       <View style={styles.selectionHeader}>
          <View style={{ width: 40 }} />
          <Text style={styles.selectionTitle}>Select Next Bowler</Text>
          <View style={{ width: 40 }} />
       </View>

       <View style={styles.overSummaryBanner}>
          <Text style={styles.overSummaryText}>Over {Math.floor(inn.balls / 6)} Completed</Text>
          <Text style={styles.scoreSummaryText}>{inn.runs}/{inn.wickets}</Text>
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.configLabel}>Choose Bowler for Over {Math.floor(inn.balls / 6) + 1}</Text>
          <View style={styles.playerGrid}>
             {bowlingPlayers.map((p: any) => (
               <TouchableOpacity 
                 key={p.id} 
                 style={styles.playerGridTile}
                 onPress={() => onSelectBowler(p)}
               >
                  <View style={[styles.miniAvatar, { width: 40, height: 40, backgroundColor: '#01b854' }]}>
                     <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                  </View>
                  <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
               </TouchableOpacity>
             ))}
          </View>
       </ScrollView>
    </View>
  );
};

// --- DISMISSAL CONFIGURATION VIEW ---
export const DismissalConfigurationView = ({ 
  dismissalState, setDismissalState, bowlingPlayers, onBack, onConfirm 
}: any) => {
  return (
    <View style={styles.selectionView}>
       <View style={[styles.selectionHeader, { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 24, marginBottom: 20 }]}>
          <TouchableOpacity onPress={onBack} style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12 }}>
             <ChevronLeft size={24} color="#01b854" />
          </TouchableOpacity>
          <Text style={[styles.selectionTitle, { color: '#01b854' }]}>Wicket Setup</Text>
          <View style={{ width: 40 }} />
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.dismissalGrid}>
             {['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired'].map(id => (
               <TouchableOpacity 
                 key={id} 
                 style={[styles.dismissalTile, dismissalState.type === id && styles.dismissalTileActive]}
                 onPress={() => setDismissalState({ ...dismissalState, type: id, fielder: null })}
               >
                 <Text style={[styles.dismissalText, dismissalState.type === id && { color: '#FFFFFF' }]}>{id.replace('_', ' ').toUpperCase()}</Text>
               </TouchableOpacity>
             ))}
          </View>

          {(dismissalState.type === 'caught' || dismissalState.type === 'run_out' || dismissalState.type === 'stumped') && (
            <View style={{ marginTop: 24 }}>
               <Text style={styles.configLabel}>Fielder / Keeper</Text>
               <View style={styles.playerGrid}>
                  {bowlingPlayers.map((p: any) => (
                    <TouchableOpacity 
                      key={p.id} 
                      style={[styles.playerGridTile, dismissalState.fielder?.id === p.id && styles.playerGridTileActive]}
                      onPress={() => setDismissalState({ ...dismissalState, fielder: p })}
                    >
                       <View style={styles.miniAvatar}>
                          <Text style={{ color: '#FFFFFF' }}>{p.player_name[0]}</Text>
                       </View>
                       <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}
       </ScrollView>

       <View style={styles.configFooter}>
          <TouchableOpacity 
             style={[styles.startMatchMainBtn, !dismissalState.type && { opacity: 0.5 }]}
             disabled={!dismissalState.type}
             onPress={onConfirm}
          >
             <Text style={styles.startMatchMainBtnText}>Confirm Wicket</Text>
          </TouchableOpacity>
       </View>
    </View>
  );
};

// --- MORE ACTIONS MODAL ---
export const MoreActionsModal = ({ 
  isVisible, onClose, 
  onSwapBatters, onRetireHurt, onReviseTarget, 
  onChangeSquad, onDeclareInnings, onUndo
}: any) => {
  if (!isVisible) return null;

  const actions = [
    { label: 'Swap Batters', icon: RefreshCw, onPress: onSwapBatters, color: '#3B82F6' },
    { label: 'Retired Hurt', icon: UserMinus, onPress: onRetireHurt, color: '#EF4444' },
    { label: 'Revise Target', icon: PenSquare, onPress: onReviseTarget, color: '#F59E0B' },
    { label: 'Change Squad', icon: Users2, onPress: onChangeSquad, color: '#01b854' },
    { label: 'Declare Innings', icon: Flag, onPress: onDeclareInnings, color: '#6B7280' },
    { label: 'Undo Last Ball', icon: RotateCcw, onPress: onUndo, color: '#1E293B' },
  ];

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.selectionTitle, { paddingHorizontal: 24, marginBottom: 16 }]}>Match Actions</Text>
          <View style={styles.sheetGrid}>
            {actions.map((action, idx) => (
              <TouchableOpacity key={idx} style={styles.sheetGridItem} onPress={() => { action.onPress(); onClose(); }}>
                <View style={[styles.sheetIconBox, { backgroundColor: action.color + '10' }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={styles.sheetItemLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.showLessBtn} onPress={onClose}>
            <Text style={styles.showLessText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// --- EXTRA RUNS SELECTOR ---
export const ExtraRunsSelector = ({ isVisible, onClose, type, onSelect }: any) => {
  if (!isVisible) return null;
  return (
    <View style={styles.sheetOverlay}>
      <View style={[styles.sheetContent, { padding: 24 }]}>
        <Text style={styles.selectionTitle}>{type?.toUpperCase()} Runs</Text>
        <Text style={styles.selectionSubTitleSmall}>Select additional runs scored</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          {[0, 1, 2, 3, 4, 6].map(n => (
            <TouchableOpacity key={n} style={styles.extraRunTile} onPress={() => onSelect(n)}>
              <Text style={styles.extraRunTileText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.cancelExtraBtn} onPress={onClose}>
          <Text style={styles.cancelExtraText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
