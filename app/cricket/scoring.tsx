import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { 
  X, 
  Search, 
  Plus, 
  User, 
  Users, 
  Crown,
  ChevronRight,
  Camera
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCricketScoring } from '@/hooks/useCricketScoring';

// Modular Imports
import { styles } from '@/components/cricket/scoring-styles';
import { INITIAL_TEAMS_DATA, INDIAN_STATES } from '@/components/cricket/scoring-constants';
import { 
  SuccessModal, 
  TeamScannerModal,
  TeamPickerModal,
  TeamPickerView,
  ManualPlayerModal
} from '@/components/cricket/ScoringComponents';
import { 
  DashboardView,
  TeamSelectionView,
  PlayerSelectionView,
  MatchConfigurationView,
  TossConfigurationView, 
  OpeningSelectionView,
  ScoringSettingsSheet
} from '@/components/cricket/ScoringViews';
import { 
  LiveScoringView, 
  BowlerSelectionView,
  DismissalConfigurationView,
  ExtraRunsSelector,
  MoreActionsModal
} from '@/components/cricket/LiveScoringView';

export default function ScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const { matchId: urlMatchId, live, startMatch: directStart, createTeam } = useLocalSearchParams();

  // --- UI Visibility States ---
  const [isSelectingTeams, setIsSelectingTeams] = useState(false);
  const [isSelectingPlayersA, setIsSelectingPlayersA] = useState(false);
  const [isSelectingPlayersB, setIsSelectingPlayersB] = useState(false);
  const [isConfiguringMatch, setIsConfiguringMatch] = useState(false);
  const [isConfiguringToss, setIsConfiguringToss] = useState(false);
  const [isSelectingOpeners, setIsSelectingOpeners] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isScanningTeam, setIsScanningTeam] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [isCreateTeamModalVisible, setIsCreateTeamModalVisible] = useState(false);
  const [pickingFor, setPickingFor] = useState<'A' | 'B' | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSelectingNextBowler, setIsSelectingNextBowler] = useState(false);
  const [isConfiguringDismissal, setIsConfiguringDismissal] = useState(false);
  const [isExtraRunsSelectorVisible, setIsExtraRunsSelectorVisible] = useState(false);
  const [activeExtraType, setActiveExtraType] = useState<'wide' | 'noball' | 'bye' | 'legbye' | null>(null);
  const [isMoreSheetVisible, setIsMoreSheetVisible] = useState(false);
  const [isSelectingNewBatter, setIsSelectingNewBatter] = useState(false);
  const [isRetiringHurt, setIsRetiringHurt] = useState(false);
  const [isRevisingTarget, setIsRevisingTarget] = useState(false);
  const [tempInputValue, setTempInputValue] = useState('');
  const [isManualAddPlayerVisible, setIsManualAddPlayerVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // --- Match Data States ---
  const [teams, setTeams] = useState(INITIAL_TEAMS_DATA);
  const [selectedTeamA, setSelectedTeamA] = useState<any>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<any>(null);
  const [playingXiA, setPlayingXiA] = useState<any[]>([]);
  const [playingXiB, setPlayingXiB] = useState<any[]>([]);
  const [teamACaptain, setTeamACaptain] = useState<any>(null);
  const [teamBCaptain, setTeamBCaptain] = useState<any>(null);
  const [currentPickingSide, setCurrentPickingSide] = useState<'A' | 'B'>('A');
  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', location: '', captain: '', image: '' });

  const [tossResult, setTossResult] = useState<{ winner: any, decision: 'bat' | 'bowl' | null }>({ winner: null, decision: null });
  const [matchState, setMatchState] = useState<{ striker: any, nonStriker: any, bowler: any, keeper: any }>({ striker: null, nonStriker: null, bowler: null, keeper: null });
  const [dismissalState, setDismissalState] = useState({ type: '', fielder: null as any });
  const [pendingWicketData, setPendingWicketData] = useState<any>(null);

  const [matchConfig, setMatchConfig] = useState({
    type: 'limited overs',
    totalOvers: '20',
    oversPerBowler: '4',
    ballType: 'leather',
    ground: '',
    state: 'Delhi',
    city: '',
    pitchType: 'Rough',
    dateTime: new Date().toLocaleString(),
    officials: {
      umpires: ['', ''],
      scorer: '',
    },
    playersPerTeam: '11',
    wideRuns: '1',
    noBallRuns: '1',
    powerplayOvers: '6',
    wagonWheel: true,
  });

  useEffect(() => {
    console.log('[ScoringScreen] isSettingsVisible changed:', isSettingsVisible);
  }, [isSettingsVisible]);

  const {
    startMatch,
    resumeMatch,
    savePlayingXi, 
    addBall,
    addExtra,
    addWicket,
    undoLastBall,
    declareInnings,
    inn,
    matchId,
    inningsList = [null, null],
    currentIdx,
    phase: matchPhase,
    result: matchResult,
    swapBatters,
    markRetiredHurt,
    reviseTarget,
    changeSquad,
    striker,
    nonStriker,
    bowler,
    crr,
    balls,
    changeBowler,
    addNewBowler,
    setOpeners,
    startSecondInnings,
    endMatch,
    isUnderReview,
    isScoring: hookIsScoring
  } = useCricketScoring(urlMatchId as string);

  // --- Effects ---
  useEffect(() => {
    fetchTeams();

    if (urlMatchId) {
      handleResume(urlMatchId as string);
    } else if (directStart === 'true' || live === 'true') {
      setIsScoring(false); 
      if (live === 'true') setIsLiveSession(true);
      setIsSelectingTeams(true);
    }

    if (createTeam === 'true') {
      setIsCreateTeamModalVisible(true);
    }
  }, [urlMatchId, directStart, live, createTeam, session]);

  useEffect(() => {
    if (isSelectingPlayersA || isSelectingPlayersB) {
      const teamId = isSelectingPlayersA ? selectedTeamA?.id : selectedTeamB?.id;
      if (teamId) fetchTeamMembers(teamId);
    }
  }, [isSelectingPlayersA, isSelectingPlayersB, selectedTeamA, selectedTeamB]);

  // --- Logic Handlers ---
  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (data) setTeams(data);
  };

  const fetchTeamMembers = async (teamId: string) => {
    setIsLoadingMembers(true);
    const { data } = await supabase.from('team_members').select('*, profiles(avatar_url)').eq('team_id', teamId);
    if (data) setTeamMembers(data);
    setIsLoadingMembers(false);
  };

  const handleResume = async (id: string) => {
    const res = await resumeMatch(id);
    if (res.status === 'success' || res.status === 'needs_setup') {
      const config = res.config;
      const xiData = (res as any).xiData || [];
      
      if (config) {
        const [{ data: tA }, { data: tB }] = await Promise.all([
          supabase.from('teams').select('*').eq('id', config.teamAId).maybeSingle(),
          supabase.from('teams').select('*').eq('id', config.teamBId).maybeSingle()
        ]);

        if (tA) setSelectedTeamA(tA);
        if (tB) setSelectedTeamB(tB);
        
        if (tA && tB) {
          if (xiData.length > 0) {
            const xiA = xiData.filter((r: any) => r.team_id === tA.id).map((r: any) => ({
              ...r.team_members,
              id: r.player_id
            }));
            const xiB = xiData.filter((r: any) => r.team_id === tB.id).map((r: any) => ({
              ...r.team_members,
              id: r.player_id
            }));
            setPlayingXiA(xiA.filter(p => !!p.id));
            setPlayingXiB(xiB.filter(p => !!p.id));
          } else if (config.teamAPlayers || config.teamBPlayers) {
            // Fallback: Reconstruct objects from string names in config
            const xiA = (config.teamAPlayers || []).map((name: string) => ({ player_name: name, id: name }));
            const xiB = (config.teamBPlayers || []).map((name: string) => ({ player_name: name, id: name }));
            setPlayingXiA(xiA);
            setPlayingXiB(xiB);
          }

          if (res.tossWinnerId) {
            const winner = res.tossWinnerId === tA.id ? tA : tB;
            setTossResult({ winner, decision: res.tossDecision as 'bat' | 'bowl' });
          }
        }

        if (res.status === 'success') {
          setIsScoring(true);
        } else {
          setIsConfiguringMatch(true); 
        }
      }
    }
  };

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setIsFlipping(false);
      const randomWinner = Math.random() > 0.5 ? selectedTeamA : selectedTeamB;
      setTossResult(prev => ({ ...prev, winner: randomWinner }));
    }, 1500);
  };

  const handleTeamScan = async (teamId: string) => {
    setIsScanningTeam(false);
    const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (data) {
      setTeams(prev => {
        const exists = prev.find(t => t.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
      if (!selectedTeamA) setSelectedTeamA(data);
      else if (!selectedTeamB && selectedTeamA.id !== data.id) setSelectedTeamB(data);
    }
  };

  const togglePlayer = (player: any, side: 'A' | 'B') => {
    const currentXi = side === 'A' ? playingXiA : playingXiB;
    const otherXi = side === 'A' ? playingXiB : playingXiA;
    const setXi = side === 'A' ? setPlayingXiA : setPlayingXiB;
    
    const isSelected = currentXi.find(p => p.id === player.id);
    if (isSelected) {
      setXi(prev => prev.filter(p => p.id !== player.id));
      // Reset captain if removed from XI
      if (side === 'A' && teamACaptain?.id === player.id) setTeamACaptain(null);
      if (side === 'B' && teamBCaptain?.id === player.id) setTeamBCaptain(null);
    } else {
      // Check if player is already in the other team
      if (otherXi.find(p => p.id === player.id)) {
        if (Platform.OS === 'web') alert('Selection Error: This player is already selected for the other team.');
        else Alert.alert('Selection Error', 'This player is already selected for the other team.');
        return;
      }
      setXi(prev => [...prev, player]);
    }
  };

  const toggleCaptain = (player: any, side: 'A' | 'B') => {
    const currentXi = side === 'A' ? playingXiA : playingXiB;
    const otherXi = side === 'A' ? playingXiB : playingXiA;
    const setCaptain = side === 'A' ? setTeamACaptain : setTeamBCaptain;
    const setXi = side === 'A' ? setPlayingXiA : setPlayingXiB;
    
    // Check if player is already in the other team
    if (otherXi.find(p => p.id === player.id)) {
      if (Platform.OS === 'web') alert('Selection Error: This player is already selected for the other team.');
      else Alert.alert('Selection Error', 'This player is already selected for the other team.');
      return;
    }

    setCaptain(player);
    
    const isSelected = currentXi.find(p => p.id === player.id);
    if (!isSelected) {
      setXi(prev => [...prev, player]);
    }
  };

  const handleManualAddPlayer = async (player: any) => {
    let targetTeam = isSelectingPlayersA ? selectedTeamA : (isSelectingPlayersB ? selectedTeamB : null);
    
    // If selecting new batter mid-match, identify team from inning state
    if (!targetTeam && isSelectingNewBatter && inn) {
      targetTeam = inn.battingTeam === selectedTeamA?.name ? selectedTeamA : selectedTeamB;
    }
    
    if (!targetTeam) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: targetTeam.id,
        player_name: player.player_name,
        player_phone: player.player_phone,
        role: 'player',
        status: 'accepted'
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      console.error('Error adding player to DB:', error);
      if (Platform.OS === 'web') alert('Error: Failed to save player to database.');
      else Alert.alert('Error', 'Failed to save player to database.');
      return;
    }

    const newPlayer = {
      ...data,
      id: data.id,
      role: 'Player',
      status: 'accepted'
    };
    
    setTeamMembers(prev => [newPlayer, ...prev]);
    
    const side = isSelectingPlayersA ? 'A' : 'B';
    if (side === 'A') {
       setPlayingXiA(prev => [...prev, newPlayer]);
    } else {
       setPlayingXiB(prev => [...prev, newPlayer]);
    }

    if (isScoring && inn) {
      const teamId = side === 'A' ? selectedTeamA?.id : selectedTeamB?.id;
      if (teamId) {
        await changeSquad(teamId, [newPlayer]);
      }
    }
    setIsManualAddPlayerVisible(false);
  };
  const onFinalStart = async () => {
    try {
      const sName = matchState.striker?.player_name || '';
      const nsName = matchState.nonStriker?.player_name || '';
      const bwrName = matchState.bowler?.player_name || '';
      const kprName = matchState.keeper?.player_name || '';

      if (inn && (inn.target !== undefined && inn.target !== null)) {
        await setOpeners(sName, nsName, bwrName, kprName);
      } else {
        const battingFirstTeam = tossResult.decision === 'bat' 
          ? tossResult.winner 
          : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
        
        const isTeamAFirst = battingFirstTeam?.id === selectedTeamA?.id;
        let bPlayers = (isTeamAFirst ? playingXiA : playingXiB).map(p => p.player_name);
        let blPlayers = (isTeamAFirst ? playingXiB : playingXiA).map(p => p.player_name);

        bPlayers = [sName, nsName, ...bPlayers.filter(p => p !== sName && p !== nsName)];
        blPlayers = [bwrName, ...blPlayers.filter(p => p !== bwrName)];

        const config = {
          teamA: selectedTeamA?.name,
          teamB: selectedTeamB?.name,
          teamAId: selectedTeamA?.id,
          teamBId: selectedTeamB?.id,
          teamAPlayers: isTeamAFirst ? bPlayers : blPlayers,
          teamBPlayers: isTeamAFirst ? blPlayers : bPlayers,
          totalOvers: matchConfig.totalOvers,
          oversPerBowler: matchConfig.oversPerBowler,
          ballType: matchConfig.ballType,
          pitchType: matchConfig.pitchType,
          wagonWheel: matchConfig.wagonWheel,
          state: matchConfig.state,
          city: matchConfig.city,
          ground: matchConfig.ground,
          powerplayOvers: matchConfig.powerplayOvers,
          type: matchConfig.type
        };

        const result = await startMatch(config, tossResult.winner?.name, tossResult.decision as 'bat' | 'bowl', { striker: sName, nonStriker: nsName, bowler: bwrName, keeper: kprName });
        
        if (result?.matchId) {
          await savePlayingXi(result.matchId, selectedTeamA.id, playingXiA, teamACaptain?.id);
          await savePlayingXi(result.matchId, selectedTeamB.id, playingXiB, teamBCaptain?.id);
        }
      }

      setIsSelectingOpeners(false);
      setIsScoring(true);
    } catch (error) {
      console.error('[Scoring] Error starting match:', error);
      alert('Failed to start match. Please check your internet and try again.');
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      if (!session?.user?.id) throw new Error('User not logged in');
      const fileName = `${Date.now()}.png`;
      const filePath = `${session.user.id}/${fileName}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from('team-logos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(filePath);
      return publicUrl;
    } catch (err) {
      console.error('Logo upload failed:', err);
      return null;
    }
  };

  const handleCreateTeam = async () => {
    if (!session?.user?.id) {
      alert('You must be logged in to create a team');
      return;
    }
    if (!teamForm.name || !teamForm.location || !teamForm.captain) {
      alert('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    let publicImageUrl = null;

    try {
      if (teamForm.image) {
        publicImageUrl = await uploadLogo(teamForm.image);
      }

      const { error } = await supabase
        .from('teams')
        .insert([{
          name: teamForm.name,
          location: teamForm.location,
          captain: teamForm.captain,
          image_url: publicImageUrl,
          owner_id: session.user.id
        }]);

      if (error) {
        alert('Error creating team: ' + error.message);
      } else {
        setIsCreateTeamModalVisible(false);
        setTeamForm({ name: '', location: '', captain: '', image: '' });
        fetchTeams();
        setIsSuccessModalVisible(true);
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
    });

    if (!result.canceled) {
      setTeamForm({ ...teamForm, image: result.assets[0].uri });
    }
  };

  const handleSelectBowler = (p: any) => {
    addNewBowler(p.player_name);
    setIsSelectingNextBowler(false);
  };

  const handleSelectNewBatter = async (p: any) => {
    if (pendingWicketData) {
       await addWicket({
         ...pendingWicketData,
         newBatterName: p.player_name
       });
       setPendingWicketData(null);
    }
    setIsSelectingNewBatter(false);
  };

  const handleAddBall = async (runs: number) => {
    await addBall(runs);
    if (inn && (inn.legalBalls + 1) % 6 === 0) {
      setIsSelectingNextBowler(true);
    }
  };

  const handleExtra = async (extraRuns: number) => {
    if (activeExtraType) {
      await addExtra(activeExtraType, extraRuns);
      setIsExtraRunsSelectorVisible(false);
      setActiveExtraType(null);
    }
  };

  const handleWicketConfirm = async () => {
    const dismissed = striker;
    if (dismissed) {
      setPendingWicketData({ 
        dismissedName: dismissed.name, 
        dismissalType: dismissalState.type, 
        fielder: dismissalState.fielder?.player_name 
      });
      setIsConfiguringDismissal(false);
      setDismissalState({ type: '', fielder: null });
      
      setIsSelectingNewBatter(true);
    }
  };

  const handleSettingsAction = (id: string) => {
    switch (id) {
      case 'end_innings':
        declareInnings();
        break;
      case 'change_bowler':
        setIsSelectingNextBowler(true);
        break;
      case 'replace_batters':
        setIsSelectingNewBatter(true);
        break;
      case 'retired_hurt':
        setIsSelectingNewBatter(true);
        break;
      case 'revise_target':
        setTempInputValue(inn?.target?.toString() || '');
        setIsRevisingTarget(true);
        break;
      case 'change_squad':
        setPickingFor(inn?.battingTeam === selectedTeamA?.name ? 'A' : 'B');
        if (inn?.battingTeam === selectedTeamA?.name) {
          setIsSelectingPlayersA(true);
        } else {
          setIsSelectingPlayersB(true);
        }
        break;
      case 'end_match':
        if (Platform.OS === 'web') {
          if (confirm('Are you sure you want to end this match?')) {
            endMatch('Match ended by scorer');
          }
        } else {
          Alert.alert(
            'End Match',
            'Are you sure you want to end this match?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'End Match', style: 'destructive', onPress: () => endMatch('Match ended by scorer') }
            ]
          );
        }
        break;
      default:
        console.log('Action not implemented:', id);
    }
  };
  return (
    <View style={[styles.container, { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: '#FFFFFF' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isUnderReview && (
        <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderBottomWidth: 1, borderBottomColor: '#FEE2E2', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Crown size={18} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C' }}>MATCH UNDER REVIEW</Text>
            <Text style={{ fontSize: 11, color: '#EF4444' }}>Admin is reviewing this match. Continue scoring with care.</Text>
          </View>
        </View>
      )}
      
      {(isScoring || hookIsScoring) ? (
        isSelectingNewBatter ? (
          <PlayerSelectionView
            team={inn?.battingTeam === selectedTeamA?.name ? selectedTeamA : selectedTeamB}
            teamMembers={teamMembers}
            playingXi={inn?.battingTeam === selectedTeamA?.name ? playingXiA : playingXiB}
            currentCaptain={null}
            isLoading={isLoadingMembers}
            onTogglePlayer={handleSelectNewBatter}
            onToggleCaptain={() => {}}
            onBack={() => setIsSelectingNewBatter(false)}
            onContinue={() => {}}
            onAddPlayer={() => setIsManualAddPlayerVisible(true)}
            title="Select New Batter"
          />
        ) : (
          <LiveScoringView 
            inn={inn} matchConfig={matchConfig} tossResult={tossResult} matchPhase={matchPhase}
            striker={striker} nonStriker={nonStriker} bowler={bowler} crr={crr}
            balls={balls}
            onAddBall={handleAddBall}
            onUndo={undoLastBall}
            onOpenMore={() => setIsMoreSheetVisible(true)}
            onOpenSettings={() => setIsSettingsVisible(true)}
            onStartSecondInnings={async () => {
              await startSecondInnings();
              setIsScoring(false);
              setIsSelectingOpeners(true);
            }}
            onOpenBowlerSelection={() => setIsSelectingNextBowler(true)}
            onOpenWicketConfig={() => setIsConfiguringDismissal(true)}
            onOpenExtraSelector={(type: any) => {
              setActiveExtraType(type);
              setIsExtraRunsSelectorVisible(true);
            }}
          />
        )
      ) : isSelectingOpeners ? (
        <OpeningSelectionView 
          selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB} 
          playingXiA={playingXiA} playingXiB={playingXiB} 
          tossResult={tossResult} matchState={matchState} setMatchState={setMatchState}
          onBack={() => setIsSelectingOpeners(false)} onStart={onFinalStart}
        />
      ) : isConfiguringToss ? (
        <TossConfigurationView 
          selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB}
          tossResult={tossResult} setTossResult={setTossResult}
          isFlipping={isFlipping} handleFlip={handleFlip}
          onBack={() => setIsConfiguringToss(false)} onNext={() => setIsSelectingOpeners(true)}
        />
      ) : isConfiguringMatch ? (
        <MatchConfigurationView 
          selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB}
          playingXiA={playingXiA} playingXiB={playingXiB}
          matchConfig={matchConfig} setMatchConfig={setMatchConfig}
          onBack={() => setIsConfiguringMatch(false)}
          onNext={() => setIsConfiguringToss(true)}
          onSelectPlayersA={() => setIsSelectingPlayersA(true)}
          onSelectPlayersB={() => setIsSelectingPlayersB(true)}
          searchGrounds={(txt: string) => setMatchConfig({ ...matchConfig, ground: txt })}
        />
      ) : isSelectingPlayersA ? (
        <PlayerSelectionView 
          team={selectedTeamA} teamMembers={teamMembers} playingXi={playingXiA} currentCaptain={teamACaptain}
          isLoading={isLoadingMembers}
          onTogglePlayer={(p: any) => togglePlayer(p, 'A')} onToggleCaptain={(p: any) => toggleCaptain(p, 'A')}
          onBack={() => setIsSelectingPlayersA(false)}
          onContinue={() => { setIsSelectingPlayersA(false); setIsSelectingPlayersB(true); }}
          onAddPlayer={() => setIsManualAddPlayerVisible(true)}
        />
      ) : isSelectingPlayersB ? (
        <PlayerSelectionView 
          team={selectedTeamB} teamMembers={teamMembers} playingXi={playingXiB} currentCaptain={teamBCaptain}
          isLoading={isLoadingMembers}
          onTogglePlayer={(p: any) => togglePlayer(p, 'B')} onToggleCaptain={(p: any) => toggleCaptain(p, 'B')}
          onBack={() => { setIsSelectingPlayersB(false); setIsSelectingPlayersA(true); }}
          onContinue={() => { setIsSelectingPlayersB(false); setIsConfiguringMatch(true); }}
          onAddPlayer={() => setIsManualAddPlayerVisible(true)}
        />
      ) : isPickerOpen ? (
        <TeamPickerView 
          teams={teams}
          onSelect={(team) => {
            if (pickingFor === 'A') setSelectedTeamA(team);
            else setSelectedTeamB(team);
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
          onScanQr={() => {
            setIsPickerOpen(false);
            setIsScanningTeam(true);
          }}
          onCreateTeam={() => {
            setIsPickerOpen(false);
            setIsCreateTeamModalVisible(true);
          }}
          styles={styles}
          title={pickingFor === 'A' ? "Select Home Team" : "Select Away Team"}
        />
      ) : (
        <TeamSelectionView 
          teams={teams} selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB}
          onOpenPickerA={() => { setPickingFor('A'); setIsPickerOpen(true); }}
          onOpenPickerB={() => { setPickingFor('B'); setIsPickerOpen(true); }}
          onScanQr={() => setIsScanningTeam(true)}
          onBack={() => router.back()}
          onContinue={() => setIsSelectingPlayersA(true)}
        />
      )}

      <SuccessModal isVisible={isSuccessModalVisible} onClose={() => setIsSuccessModalVisible(false)} styles={styles} />
      <TeamScannerModal 
        isVisible={isScanningTeam} 
        onClose={() => setIsScanningTeam(false)} 
        onScan={handleTeamScan} 
        styles={styles} 
      />
      <ManualPlayerModal 
        isVisible={isManualAddPlayerVisible}
        onClose={() => setIsManualAddPlayerVisible(false)}
        onAdd={handleManualAddPlayer}
        styles={styles}
      />
      <ExtraRunsSelector 
        isVisible={isExtraRunsSelectorVisible}
        onClose={() => setIsExtraRunsSelectorVisible(false)}
        type={activeExtraType}
        onSelect={handleExtra}
      />
      <DismissalConfigurationView 
        isVisible={isConfiguringDismissal}
        onClose={() => setIsConfiguringDismissal(false)}
        dismissalState={dismissalState}
        setDismissalState={setDismissalState}
        bowlingPlayers={inn?.bowlingTeam === selectedTeamA?.name ? playingXiA : playingXiB}
        onConfirm={handleWicketConfirm}
      />
      <BowlerSelectionView 
        isVisible={isSelectingNextBowler}
        inn={inn}
        selectedTeamA={selectedTeamA}
        selectedTeamB={selectedTeamB}
        playingXiA={playingXiA}
        playingXiB={playingXiB}
        tossResult={tossResult}
        currentBowler={bowler}
        onSelectBowler={handleSelectBowler}
      />
      <MoreActionsModal 
        isVisible={isMoreSheetVisible}
        onClose={() => setIsMoreSheetVisible(false)}
        onSwapBatters={swapBatters}
        onRetireHurt={() => setIsRetiringHurt(true)}
        onReviseTarget={() => setIsRevisingTarget(true)}
        onChangeSquad={() => {}}
        onDeclareInnings={declareInnings}
        onUndo={undoLastBall}
      />

      <Modal visible={isRetiringHurt} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { padding: 24 }]}>
            <Text style={styles.selectionTitle}>Retire Player</Text>
            <Text style={styles.selectionSubTitleSmall}>Enter player name to mark as retired hurt</Text>
            <TextInput 
              style={styles.modalInput}
              value={tempInputValue}
              onChangeText={setTempInputValue}
              placeholder="Player name"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={[styles.cancelExtraBtn, { flex: 1 }]} onPress={() => setIsRetiringHurt(false)}>
                <Text style={styles.cancelExtraText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.startMatchMainBtn, { flex: 1, height: 48, marginTop: 0 }]} onPress={() => {
                markRetiredHurt(tempInputValue);
                setIsRetiringHurt(false);
                setTempInputValue('');
              }}>
                <Text style={styles.startMatchMainBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isRevisingTarget} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { padding: 24 }]}>
            <Text style={styles.selectionTitle}>Revise Target</Text>
            <Text style={styles.selectionSubTitleSmall}>Set a new target for the chasing team</Text>
            <TextInput 
              style={styles.modalInput}
              value={tempInputValue}
              onChangeText={setTempInputValue}
              placeholder="e.g. 150"
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={[styles.cancelExtraBtn, { flex: 1 }]} onPress={() => setIsRevisingTarget(false)}>
                <Text style={styles.cancelExtraText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.startMatchMainBtn, { flex: 1, height: 48, marginTop: 0 }]} onPress={() => {
                reviseTarget(parseInt(tempInputValue));
                setIsRevisingTarget(false);
                setTempInputValue('');
              }}>
                <Text style={styles.startMatchMainBtnText}>Set Target</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isCreateTeamModalVisible}
        onRequestClose={() => setIsCreateTeamModalVisible(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setIsCreateTeamModalVisible(false)}>
          <Pressable style={[styles.sheetContent, { height: 'auto', maxHeight: '90%', width: '100%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeaderRow, { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, justifyContent: 'center' }]}>
              <Text style={[styles.sheetTitle, { fontSize: 22, fontWeight: '600' }]}>Create Team</Text>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.configLabel}>Team Name</Text>
                  <TextInput 
                    style={styles.configInput} 
                    placeholder="e.g. Royal Challengers" 
                    value={teamForm.name}
                    onChangeText={(t) => setTeamForm({...teamForm, name: t})}
                  />
                </View>

                <View>
                  <Text style={styles.configLabel}>Location (State)</Text>
                  <TouchableOpacity 
                    style={[styles.configInput, { height: 38, justifyContent: 'center' }]}
                    onPress={() => setShowStateDropdown(!showStateDropdown)}
                  >
                    <View style={styles.selectionHeader}>
                      <Text style={[teamForm.location ? { color: '#1E293B', fontSize: 13 } : { color: '#9CA3AF', fontSize: 13 }]}>
                        {teamForm.location || 'Select State'}
                      </Text>
                      <ChevronRight 
                        size={16} 
                        color="#9CA3AF" 
                        style={{ transform: [{ rotate: showStateDropdown ? '90deg' : '0deg' }] }} 
                      />
                    </View>
                  </TouchableOpacity>

                  {showStateDropdown && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                        {INDIAN_STATES.map((state) => (
                          <TouchableOpacity 
                            key={state}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setTeamForm({ ...teamForm, location: state });
                              setShowStateDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownOptionText}>{state}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.configLabel}>Captain Name</Text>
                  <TextInput 
                    style={styles.configInput} 
                    placeholder="e.g. Virat Kohli" 
                    value={teamForm.captain}
                    onChangeText={(t) => setTeamForm({...teamForm, captain: t})}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity 
                    style={{ 
                      width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9',
                      justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
                    }} 
                    onPress={pickImage}
                  >
                    {teamForm.image ? (
                      <Image source={{ uri: teamForm.image }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Camera size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                  <View>
                    <Text style={[styles.configLabel, { marginBottom: 2 }]}>Team Logo</Text>
                    <TouchableOpacity onPress={pickImage}>
                      <Text style={{ color: '#01b854', fontSize: 12, fontWeight: '700' }}>
                        {teamForm.image ? 'Change Logo' : 'Upload Logo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }, { marginTop: 12, height: 48 }]} 
                  onPress={handleCreateTeam}
                  disabled={isSubmitting}
                >
                  <Text style={styles.confirmBtnText}>{isSubmitting ? 'Creating...' : 'Create Team'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <ScoringSettingsSheet 
        isVisible={isSettingsVisible} 
        onClose={() => setIsSettingsVisible(false)}
        onAction={handleSettingsAction}
      />
    </View>
  );
}
