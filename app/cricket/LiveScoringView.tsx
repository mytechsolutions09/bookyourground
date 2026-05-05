import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  Pressable
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
  Users2,
  Edit3,
  Activity,
  CircleCheck,
  HelpCircle,
  UserPlus,
  ClipboardList,
  Timer,
  PlusCircle,
  Ban,
  MinusCircle,
  Hand,
  Coffee,
  Zap,
  Target,
} from 'lucide-react-native';
import { styles } from './scoring-styles';

// --- LIVE SCORING MAIN VIEW ---
export const LiveScoringView = ({ 
  inn, matchConfig, tossResult, matchPhase, 
  striker, nonStriker, bowler, crr, balls,
  onAddBall, onUndo, onOpenMore, onOpenSettings, onStartSecondInnings,
  onOpenBowlerSelection, onOpenWicketConfig, onOpenExtraSelector, onSwapBatters
}: any) => {
  if (!inn) return null;
  
  const formatOvers = (legalBalls: number) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const oversStr = formatOvers(inn.legalBalls);
  
  return (
    <View style={styles.scoringMainPremium}>
       <ScrollView 
         style={{ flex: 1 }} 
         contentContainerStyle={{ padding: 16 }}
         showsVerticalScrollIndicator={false}
       >
          {/* Header Score Section */}
          <View style={styles.premiumScoreHeader}>
             <View>
                <Text style={styles.scoringTeamLabel}>{inn.battingTeam.toUpperCase()}</Text>
                <View style={styles.scoreRowLarge}>
                   <Text style={styles.runsTextLarge}>{inn.runs}-{inn.wickets}</Text>
                   <Text style={styles.oversTextLarge}>({oversStr})</Text>
                </View>
             </View>
             <View style={styles.crrBoxPremium}>
                <Text style={styles.crrLabelPremium}>CRR</Text>
                <Text style={styles.crrValuePremium}>{crr || '0.00'}</Text>
             </View>
          </View>

          {/* Toss Info Banner */}
          <View style={styles.tossBannerPremium}>
             <CircleCheck size={18} color="#01b854" fill="#E8F5E9" />
             <Text style={styles.tossBannerText}>
                {tossResult.winner?.name} won the toss and opted to {tossResult.decision === 'bowl' ? 'bowl' : 'bat'}
             </Text>
          </View>

          {/* Batter Section */}
          <View style={styles.batterSectionPremium}>
             <View style={styles.batterRowPremium}>
                {[
                  { label: 'BATTER 1', data: striker },
                  { label: 'BATTER 2', data: nonStriker }
                ].map((item, idx) => (
                  <View key={idx} style={styles.batterCardPremium}>
                     <View style={styles.cardHeaderSmall}>
                        <Text style={styles.cardLabelSmall}>{item.label}</Text>
                        <TouchableOpacity style={styles.playerEditBtnSmall} onPress={onSwapBatters}>
                           <Edit3 size={14} color="#01b854" />
                        </TouchableOpacity>
                     </View>
                     <Text style={styles.playerNameCard} numberOfLines={1}>
                        {item.data?.name || '---'}
                     </Text>
                     <Text style={styles.playerScoreCard}>
                        {item.data?.runs || 0} <Text style={styles.playerBallsCard}>({item.data?.balls || 0})</Text>
                     </Text>
                  </View>
                ))}
             </View>
          </View>

          {/* Bowler Section */}
          <View style={styles.bowlerCardPremium}>
             <View style={styles.cardHeaderSmall}>
                <Text style={styles.cardLabelSmall}>BOWLER</Text>
                <TouchableOpacity style={styles.playerEditBtnSmall} onPress={onOpenBowlerSelection}>
                   <Activity size={14} color="#01b854" />
                </TouchableOpacity>
             </View>
             <Text style={styles.playerNameCard}>
                {bowler?.name || 'Select Bowler...'}
             </Text>
             <Text style={styles.bowlerStatsCard}>
                {bowler?.overs ?? 0}.{bowler?.balls ?? 0} - {bowler?.maidens || 0} - {bowler?.runs || 0} - {bowler?.wickets || 0}
             </Text>
          </View>

          {/* Control Section */}
          <View style={styles.controlsSectionPremium}>
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.controlHeaderLabel}>THIS OVER</Text>
                 <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {(balls || []).map((ball: any, i: number) => {
                       const runsVal = Number(ball.runs || 0);
                       const isLowRuns = !ball.is_wicket && !ball.extra_type && runsVal <= 3;
                       return (
                         <View key={i} style={[
                           styles.ballDotMini,
                           { width: 32, height: 32, borderRadius: 16 },
                           ball.is_wicket && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                           runsVal === 4 && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                           runsVal === 6 && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                           (ball.extra_type === 'wide' || ball.extra_type === 'noball') && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                           isLowRuns && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }
                         ]}>
                           <Text style={[
                             styles.ballDotTextMini,
                             { fontSize: 12, fontWeight: '800' },
                             isLowRuns ? { color: '#475569' } : { color: '#FFFFFF' }
                           ]}>
                               {ball.label || (ball.is_wicket ? 'W' : (ball.extra_type === 'wide' ? 'Wd' : (ball.extra_type === 'noball' ? 'Nb' : (ball.runs ?? '0'))))}
                           </Text>
                         </View>
                       );
                    })}
                 </View>
             </View>
             
             <View style={styles.controlGridRow}>
                {[0, 1, 2, 3].map(n => (
                  <TouchableOpacity key={n} style={styles.runBtnPremium} onPress={() => onAddBall(n)}>
                     <Text style={styles.runBtnTextPremium}>{n}</Text>
                  </TouchableOpacity>
                ))}
             </View>

             <View style={styles.controlGridRow}>
                <TouchableOpacity style={[styles.runBtnPremium, styles.boundary4Btn]} onPress={() => onAddBall(4)}>
                   <Text style={styles.runBtnTextPremium}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.runBtnPremium, styles.boundary6Btn]} onPress={() => onAddBall(6)}>
                   <Text style={styles.runBtnTextPremium}>6</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.runBtnPremium, styles.wicketBtnPremium]} onPress={onOpenWicketConfig}>
                   <Text style={styles.runBtnTextPremium}>W</Text>
                </TouchableOpacity>
             </View>

             <View style={styles.controlGridRow}>
                {[
                  { id: 'wide', label: 'WD' },
                  { id: 'noball', label: 'NB' },
                  { id: 'bye', label: 'BYE' },
                  { id: 'legbye', label: 'LB' }
                ].map(opt => (
                  <TouchableOpacity key={opt.id} style={styles.extraBtnPremium} onPress={() => onOpenExtraSelector(opt.id)}>
                     <Text style={styles.extraBtnTextPremium}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>
       </ScrollView>

       {/* Footer Navigation */}
       <View style={styles.scoringFooterPremium}>
          <TouchableOpacity style={styles.footerActionBtn} onPress={onUndo}>
             <RotateCcw size={22} color="#64748B" />
             <Text style={styles.footerActionText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerActionBtn} onPress={onOpenMore}>
             <MoreHorizontal size={22} color="#64748B" />
             <Text style={styles.footerActionText}>More</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerActionBtn} onPress={() => {
            console.log('[LiveScoringView] Settings tapped');
            onOpenSettings();
          }}>
             <Settings size={22} color="#64748B" />
             <Text style={styles.footerActionText}>Settings</Text>
          </TouchableOpacity>
       </View>
    </View>
  );
};

// --- BOWLER SELECTION VIEW ---
export const BowlerSelectionView = ({ 
  isVisible, inn, selectedTeamA, selectedTeamB, playingXiA, playingXiB, tossResult, onSelectBowler 
}: any) => {
  const battingTeam = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
  const bowlingTeam = battingTeam?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
  const bowlingPlayers = bowlingTeam?.id === selectedTeamA?.id ? playingXiA : playingXiB;

  if (!isVisible || !inn) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => {}}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.qrModalContent, { height: '80%', padding: 0, overflow: 'hidden' }]}>
           <View style={[styles.selectionHeader, { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 0 }]}>
              <View style={{ width: 40 }} />
              <Text style={[styles.selectionTitle, { color: '#01b854' }]}>Select Next Bowler</Text>
              <View style={{ width: 40 }} />
           </View>

           <View style={[styles.overSummaryBanner, { borderRadius: 0 }]}>
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
                      <View style={[styles.miniAvatar, { width: 44, height: 44, backgroundColor: '#01b854', borderRadius: 22 }]}>
                         <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{p.player_name[0]}</Text>
                      </View>
                      <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                   </TouchableOpacity>
                 ))}
              </View>
           </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// --- DISMISSAL CONFIGURATION VIEW ---
export const DismissalConfigurationView = ({ 
  isVisible, dismissalState, setDismissalState, bowlingPlayers, onClose, onConfirm 
}: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={[styles.sheetContent, { height: '85%', padding: 0, overflow: 'hidden' }]} onPress={(e) => e.stopPropagation()}>
           <View style={[styles.selectionHeader, { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 0, marginBottom: 0 }]}>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12 }}>
                 <ChevronLeft size={24} color="#01b854" />
              </TouchableOpacity>
              <Text style={[styles.selectionTitle, { color: '#01b854' }]}>Wicket Setup</Text>
              <View style={{ width: 40 }} />
           </View>

           <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.configLabel}>Method of Dismissal</Text>
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
                           <View style={[styles.miniAvatar, dismissalState.fielder?.id === p.id && { backgroundColor: '#FFFFFF' }]}>
                              <Text style={[{ color: '#FFFFFF' }, dismissalState.fielder?.id === p.id && { color: '#01b854' }]}>{p.player_name[0]}</Text>
                           </View>
                           <Text style={[styles.playerGridName, dismissalState.fielder?.id === p.id && { color: '#FFFFFF' }]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>
              )}
           </ScrollView>

           <View style={[styles.configFooter, { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
              <TouchableOpacity 
                 style={[styles.startMatchMainBtn, !dismissalState.type && { opacity: 0.5 }]}
                 disabled={!dismissalState.type}
                 onPress={onConfirm}
              >
                 <Text style={styles.startMatchMainBtnText}>Confirm Wicket</Text>
              </TouchableOpacity>
           </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    { label: 'Need Help', icon: HelpCircle, color: '#64748B', id: 'help' },
    { label: 'Match Rules', icon: Settings, color: '#64748B', id: 'rules' },
    { label: 'Change Scorer', icon: UserPlus, color: '#64748B', id: 'scorer' },
    { label: 'Change Squad', icon: Users2, color: '#01b854', id: 'squad' },
    { label: 'Full Scorecard', icon: ClipboardList, color: '#3B82F6', id: 'scorecard' },
    { label: 'Match Overs', icon: Timer, color: '#F59E0B', id: 'overs' },
    { label: 'Replace Batters', icon: RotateCw, color: '#3B82F6', id: 'replace_batters' },
    { label: 'Bonus Runs', icon: PlusCircle, color: '#01b854', id: 'bonus' },
    { label: 'Dropped Catch', icon: Ban, color: '#EF4444', id: 'dropped' },
    { label: 'Runs Saved', icon: MinusCircle, color: '#3B82F6', id: 'runs_saved' },
    { label: 'Change Keeper', icon: Hand, color: '#64748B', id: 'keeper' },
    { label: 'Match Breaks', icon: Coffee, color: '#64748B', id: 'breaks' },
    { label: 'Power Play', icon: Zap, color: '#F59E0B', id: 'powerplay' },
    { label: 'Revise Target', icon: Target, color: '#F59E0B', id: 'revise' },
    { label: 'Change Bowler', icon: RotateCw, color: '#01b854', id: 'bowler' },
    { label: 'Retired Hurt', icon: UserMinus, color: '#EF4444', id: 'retired' },
  ];

  const handlePress = (id: string) => {
    switch(id) {
      case 'replace_batters': onSwapBatters(); break;
      case 'retired': onRetireHurt(); break;
      case 'revise': onReviseTarget(); break;
      case 'squad': onChangeSquad(); break;
      default: break;
    }
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.selectionTitle, { paddingHorizontal: 24, marginBottom: 16, textAlign: 'center' }]}>Match Actions</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.sheetGrid, { paddingBottom: 20 }]}>
              {actions.map((action, idx) => (
                <TouchableOpacity key={idx} style={styles.sheetGridItem} onPress={() => handlePress(action.id)}>
                  <View style={[styles.sheetIconBox, { backgroundColor: action.color + '10', width: 56, height: 56, borderRadius: 16 }]}>
                    <action.icon size={26} color={action.color} />
                  </View>
                  <Text style={[styles.sheetItemLabel, { fontSize: 11, marginTop: 8, textAlign: 'center' }]} numberOfLines={2}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.showLessBtn} onPress={onClose}>
            <Text style={styles.showLessText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// --- EXTRA RUNS SELECTOR ---
export const ExtraRunsSelector = ({ isVisible, onClose, type, onSelect }: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={[styles.sheetContent, { height: 'auto', paddingBottom: 40 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={{ padding: 24 }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                   <Plus size={20} color="#01b854" />
                </View>
                <View>
                   <Text style={[styles.selectionTitle, { marginBottom: 0 }]}>{type?.toUpperCase()} Runs</Text>
                   <Text style={styles.selectionSubTitleSmall}>Select additional runs scored</Text>
                </View>
             </View>

             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24, justifyContent: 'center' }}>
               {[0, 1, 2, 3, 4, 5, 6].map(n => (
                 <TouchableOpacity 
                    key={n} 
                    style={[styles.extraRunTile, { width: '30%', height: 60, borderRadius: 16 }]} 
                    onPress={() => onSelect(n)}
                 >
                   <Text style={[styles.extraRunTileText, { fontSize: 20 }]}>{n}</Text>
                   <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{n === 1 ? 'RUN' : 'RUNS'}</Text>
                 </TouchableOpacity>
               ))}
             </View>

             <TouchableOpacity 
                style={[styles.cancelExtraBtn, { marginTop: 32, backgroundColor: '#F1F5F9', borderWidth: 0 }]} 
                onPress={onClose}
             >
               <Text style={[styles.cancelExtraText, { color: '#64748B' }]}>Dismiss</Text>
             </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
