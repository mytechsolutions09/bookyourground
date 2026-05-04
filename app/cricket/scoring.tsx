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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { 
  X, 
  Search, 
  Plus, 
  User, 
  Users, 
  PlusCircle, 
  Crown
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCricketScoring } from '@/hooks/useCricketScoring';

// Modular Imports
import { styles } from './scoring-styles';
import { INITIAL_TEAMS_DATA } from './scoring-constants';
import { 
  SuccessModal, 
  TeamScannerModal,
  TeamPickerModal,
} from './ScoringComponents';
import { 
  DashboardView, 
  TeamSelectionView, 
  PlayerSelectionView,
  MatchConfigurationView, 
  TossConfigurationView, 
  OpeningSelectionView 
} from './ScoringViews';
import { 
  LiveScoringView, 
  BowlerSelectionView,
  DismissalConfigurationView,
  ExtraRunsSelector,
  MoreActionsModal
} from './LiveScoringView';

export default function ScoringScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const { matchId: urlMatchId, live, startMatch: directStart } = useLocalSearchParams();

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
  const [pickingFor, setPickingFor] = useState<'A' | 'B' | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSelectingNextBowler, setIsSelectingNextBowler] = useState(false);
  const [isConfiguringDismissal, setIsConfiguringDismissal] = useState(false);
  const [isExtraRunsSelectorVisible, setIsExtraRunsSelectorVisible] = useState(false);
  const [activeExtraType, setActiveExtraType] = useState<'wide' | 'noball' | 'bye' | 'legbye' | null>(null);
  const [isMoreSheetVisible, setIsMoreSheetVisible] = useState(false);

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

  const [tossResult, setTossResult] = useState<{ winner: any, decision: 'bat' | 'bowl' | null }>({ winner: null, decision: null });
  const [matchState, setMatchState] = useState<{ striker: any, nonStriker: any, bowler: any, keeper: any }>({ striker: null, nonStriker: null, bowler: null, keeper: null });
  const [dismissalState, setDismissalState] = useState({ type: '', fielder: null as any });
  const [pendingWicketData, setPendingWicketData] = useState<any>(null);

  const [matchConfig, setMatchConfig] = useState({
    type: 'limited overs',
    totalOvers: '20',
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
  });

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
    crr
  } = useCricketScoring();

  // Remove redundant calculations since they come from the hook

  // --- Effects ---
  useEffect(() => {
    fetchTeams();
    fetchMatches();

    if (urlMatchId) {
      handleResume(urlMatchId as string);
    } else if (directStart === 'true') {
      setIsSelectingTeams(true);
    }
  }, [urlMatchId, directStart]);

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

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*, match_live_state(*)').order('created_at', { ascending: false });
    if (data) setFetchedMatches(data);
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
      setIsScoring(res.status === 'success');
      setIsConfiguringMatch(res.status === 'needs_setup');
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
    const setXi = side === 'A' ? setPlayingXiA : setPlayingXiB;
    
    const isSelected = currentXi.find(p => p.id === player.id);
    if (isSelected) {
      setXi(prev => prev.filter(p => p.id !== player.id));
    } else {
      setXi(prev => [...prev, player]);
    }
  };

  const toggleCaptain = (player: any, side: 'A' | 'B') => {
    const currentXi = side === 'A' ? playingXiA : playingXiB;
    const setCaptain = side === 'A' ? setTeamACaptain : setTeamBCaptain;
    const setXi = side === 'A' ? setPlayingXiA : setPlayingXiB;
    
    setCaptain(player);
    
    // Ensure captain is in the XI without toggling them out
    const isSelected = currentXi.find(p => p.id === player.id);
    if (!isSelected) {
      setXi(prev => [...prev, player]);
    }
  };
  const onFinalStart = async () => {
    const config = {
      teamA: selectedTeamA?.name,
      teamB: selectedTeamB?.name,
      teamAId: selectedTeamA?.id,
      teamBId: selectedTeamB?.id,
      teamAPlayers: playingXiA.map(p => p.player_name),
      teamBPlayers: playingXiB.map(p => p.player_name),
      overs: parseInt(matchConfig.totalOvers),
      players: playingXiA.length,
      venue: matchConfig.ground || 'Standard Ground',
      matchType: matchConfig.type
    };

    const sName = matchState.striker?.player_name || '';
    const nsName = matchState.nonStriker?.player_name || '';
    const bwrName = matchState.bowler?.player_name || '';
    const kprName = matchState.keeper?.player_name || '';

    await startMatch(config, tossResult.winner?.name, tossResult.decision as 'bat' | 'bowl', { striker: sName, nonStriker: nsName, bowler: bwrName, keeper: kprName });
    setIsSelectingOpeners(false);
    setIsScoring(true);
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
    // Basic implementation for now, using the striker as the one out
    const dismissed = striker;
    if (dismissed) {
      await addWicket({ 
        dismissedName: dismissed.name, 
        dismissalType: dismissalState.type, 
        fielder: dismissalState.fielder?.player_name 
      });
      setIsConfiguringDismissal(false);
      setDismissalState({ type: '', fielder: null });
      // If not all out, we'll need a new batter, but for now just continue
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isScoring ? (
        isSelectingNextBowler ? (
          <BowlerSelectionView 
            inn={inn} 
            selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB}
            playingXiA={playingXiA} playingXiB={playingXiB}
            tossResult={tossResult}
            onSelectBowler={() => setIsSelectingNextBowler(false)}
          />
        ) : isConfiguringDismissal ? (
          <DismissalConfigurationView 
            dismissalState={dismissalState}
            setDismissalState={setDismissalState}
            bowlingPlayers={inn?.bowlingTeam === selectedTeamA?.name ? playingXiA : playingXiB}
            onBack={() => setIsConfiguringDismissal(false)}
            onConfirm={handleWicketConfirm}
          />
        ) : (
          <LiveScoringView 
            inn={inn} matchConfig={matchConfig} tossResult={tossResult} matchPhase={matchPhase}
            striker={striker} nonStriker={nonStriker} bowler={bowler} crr={crr}
            onAddBall={handleAddBall}
            onUndo={undoLastBall}
            onOpenMore={() => setIsMoreSheetVisible(true)}
            onOpenSettings={() => {}}
            onStartSecondInnings={async () => {
              await declareInnings();
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
        />
      ) : isSelectingPlayersB ? (
        <PlayerSelectionView 
          team={selectedTeamB} teamMembers={teamMembers} playingXi={playingXiB} currentCaptain={teamBCaptain}
          isLoading={isLoadingMembers}
          onTogglePlayer={(p: any) => togglePlayer(p, 'B')} onToggleCaptain={(p: any) => toggleCaptain(p, 'B')}
          onBack={() => { setIsSelectingPlayersB(false); setIsSelectingPlayersA(true); }}
          onContinue={() => { setIsSelectingPlayersB(false); setIsConfiguringMatch(true); }}
        />
      ) : isSelectingTeams ? (
        <TeamSelectionView 
          teams={teams} selectedTeamA={selectedTeamA} selectedTeamB={selectedTeamB}
          onOpenPickerA={() => { setPickingFor('A'); setIsPickerOpen(true); }}
          onOpenPickerB={() => { setPickingFor('B'); setIsPickerOpen(true); }}
          onBack={() => setIsSelectingTeams(false)}
          onContinue={() => { setIsSelectingTeams(false); setIsSelectingPlayersA(true); }}
        />
      ) : (
        <DashboardView 
          fetchedMatches={fetchedMatches}
          onStartNewMatch={() => setIsSelectingTeams(true)}
          onMatchPress={(id: string) => handleResume(id)}
        />
      )}

      <SuccessModal isVisible={isSuccessModalVisible} onClose={() => setIsSuccessModalVisible(false)} styles={styles} />
      <TeamScannerModal 
        isVisible={isScanningTeam} 
        onClose={() => setIsScanningTeam(false)} 
        onScan={handleTeamScan} 
        styles={styles} 
      />
      <TeamPickerModal 
        isVisible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        teams={teams}
        onSelect={(team) => {
          if (pickingFor === 'A') setSelectedTeamA(team);
          else setSelectedTeamB(team);
          setIsPickerOpen(false);
        }}
        onScanQr={() => {
          setIsPickerOpen(false);
          setIsScanningTeam(true);
        }}
        styles={styles}
        title={pickingFor === 'A' ? "Select Home Team" : "Select Away Team"}
      />
      <ExtraRunsSelector 
        isVisible={isExtraRunsSelectorVisible}
        onClose={() => setIsExtraRunsSelectorVisible(false)}
        type={activeExtraType}
        onSelect={handleExtra}
      />
      <MoreActionsModal 
        isVisible={isMoreSheetVisible}
        onClose={() => setIsMoreSheetVisible(false)}
        onSwapBatters={swapBatters}
        onRetireHurt={() => {
           const name = prompt("Enter player name to retire:");
           if (name) markRetiredHurt(name);
        }}
        onReviseTarget={() => {
           const target = prompt("Enter new target:");
           if (target) reviseTarget(parseInt(target));
        }}
        onChangeSquad={() => {}}
        onDeclareInnings={declareInnings}
        onUndo={undoLastBall}
      />
    </SafeAreaView>
  );
}
