import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  TextInput,
  Share,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { 
  Swords, 
  Trophy, 
  Users, 
  BarChart3, 
  PlayCircle, 
  LayoutGrid,
  History,
  TrendingUp,
  Search,
  Calendar,
  AlertCircle,
  Crown,
  QrCode,
  MapPin,
  User,
  Users2,
  Plus,
  X,
  Radio,
  HelpCircle,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LogIn,
  Link,
  Share2,
  Smartphone,
  UserPlus,
  Sliders,
  Menu, 
  Mic2, 
  Video, 
  UserSquare2, 
  IdCard,
  RotateCcw,
  MoreHorizontal,
  UserMinus,
  Info,
  Clock,
  Settings,
  GripHorizontal,
  PlusCircle,
  Coffee,
  Zap,
  RefreshCw,
  Target,
  Hand
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCricketScoring } from '@/hooks/useCricketScoring';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Ladakh', 'Lakhshadweep', 'Puducherry', 'Andaman and Nicobar'
];

const TABS = [
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'highlights', label: 'Highlights', icon: PlayCircle },
];

const MATCHES_DATA = [
  {
    id: '1',
    type: 'League Matches',
    tournament: 'SL T20 Cricket Cup',
    status: 'Upcoming',
    date: '18-Apr-26',
    overs: '20 Ov.',
    location: 'Gurugram (Gurgaon), SL Cricke..',
    team1: 'Super Strikers',
    team2: 'Ggn Titans',
    message: 'Match scheduled to begin on Saturday, 18th Apr at 7:20 AM',
  },
  {
    id: '2',
    type: 'League Matches',
    tournament: '5th Vikram singh cup (mj spo..',
    status: 'Result',
    date: 'Yesterday',
    overs: '25 Ov.',
    location: 'Gurugram (Gurgaon), SKS Spor..',
    team1: 'Phoenix Risers.',
    team1Score: '274/6',
    team1Overs: '(25.0 Ov)',
    team2: 'Ggn Titans',
    team2Score: '195/10',
    team2Overs: '(21.4 Ov)',
    result: 'Phoenix Risers. won by 79 runs',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    type: 'League Matches',
    tournament: '12th Vikram Singh WrestleM..',
    status: 'Result',
    date: '08-Apr-26',
    overs: '20 Ov.',
    location: 'Gurugram (Gurgaon), BattleSta..',
    team1: 'Ggn Titans',
    team1Score: '181/6',
    team1Overs: '(20.0 Ov)',
    team2: 'Titans Of The Pitch',
    team2Score: '183/5',
    team2Overs: '(19.4 Ov)',
    result: 'Titans Of The Pitch won by 5 wickets',
  }
];

const TOURNAMENTS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47e',
    title: 'Pioneer Sports Park Practice Weekend',
    dateRange: '25 Nov, 2022 to 25 Nov, 2040',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
    hasCrown: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47f',
    title: '10th Vikram Singh Cup',
    dateRange: '31 May, 2025 to 26 Apr, 2026',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
    hasCrown: false,
  }
];

const INITIAL_TEAMS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47a',
    name: 'Ggn Titans',
    location: 'Haryana',
    captain: 'Manu Yadav',
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Tennessee_Titans_logo.svg/1200px-Tennessee_Titans_logo.svg.png',
    isUserTeam: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47b',
    name: 'The Yankees',
    location: 'Delhi',
    captain: 'Arpit Kanotra',
    initials: 'TY',
    bgColor: '#0EA5E9',
    isUserTeam: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47c',
    name: 'AHC Tigers',
    location: 'Delhi',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/47701/tiger-animal-predator-wild-47701.jpeg',
    isUserTeam: false,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47d',
    name: 'Crixcus XI',
    location: 'Delhi',
    captain: 'Ashish Sharma',
    initials: 'CX',
    bgColor: '#F87171',
    isUserTeam: false,
  },
  {
    id: '5',
    name: 'Rohtak Dhakkad XI',
    location: 'Haryana',
    captain: 'Ajay Singh Dalal',
    initials: 'RD',
    bgColor: '#EF4444',
    isUserTeam: false,
  },
  {
    id: '6',
    name: 'Dollars Club',
    location: 'Delhi',
    captain: 'Arvind Upreti',
    initials: 'DC',
    bgColor: '#713F12',
    isUserTeam: false,
  }
];

const BATTING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '206' },
  { label: 'NO', value: '28' },
  { label: 'Runs', value: '6390' },
  { label: 'HS', value: '135' },
  { label: 'Avg', value: '35.9' },
  { label: 'SR', value: '156.54' },
  { label: '30s', value: '41' },
  { label: '50s', value: '37' },
  { label: '100s', value: '11' },
  { label: '4s', value: '756' },
  { label: '6s', value: '241' },
  { label: 'Ducks', value: '14' },
  { label: 'Won', value: '115' },
  { label: 'Loss', value: '102' },
];

const BOWLING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '149' },
  { label: 'Overs', value: '416.3' },
  { label: 'Maidens', value: '4' },
  { label: 'Runs', value: '3694' },
  { label: 'Wkts', value: '150' },
  { label: 'BB', value: '6/45' },
  { label: '3 Wkts', value: '11' },
  { label: '5 Wkts', value: '3' },
  { label: 'Eco', value: '8.87' },
  { label: 'SR', value: '16.66' },
  { label: 'Avg', value: '24.63' },
  { label: 'WD', value: '133' },
  { label: 'NB', value: '10' },
  { label: 'Dots', value: '918' },
  { label: '4s', value: '331' },
  { label: '6s', value: '160' },
];

const FIELDING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Catches', value: '66' },
  { label: 'C/B', value: '3' },
  { label: 'R/O', value: '7' },
  { label: 'St', value: '1' },
  { label: 'Asst. R/O', value: '4' },
  { label: 'Byes', value: '0' },
];

const CAPTAIN_STATS = [
  { label: 'Mat', value: '49' },
  { label: 'Toss Won', value: '24' },
  { label: 'Win %', value: '32.65%' },
  { label: 'Loss %', value: '67.35%' },
];

export default function CricketScreen() {
  const [activeTab, setActiveTab] = useState('matches');
  const [subTab, setSubTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [isCreateTeamModalVisible, setIsCreateTeamModalVisible] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [isSelectingTeams, setIsSelectingTeams] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isAddPlayerViewVisible, setIsAddPlayerViewVisible] = useState(false);
  const [activeTeamForPlayers, setActiveTeamForPlayers] = useState<any>(null);
  const [activeTeamForQr, setActiveTeamForQr] = useState<any>(null);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [isContactPickerVisible, setIsContactPickerVisible] = useState(false);
  const [realContacts, setRealContacts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '' });
  const [managementTab, setManagementTab] = useState<'squad' | 'profile'>('squad');
  const [profileSubTab, setProfileSubTab] = useState('matches');
  const [leaderboardSubTab, setLeaderboardSubTab] = useState('bat');
  const [teamForm, setTeamForm] = useState({ name: '', location: '', captain: '', image: '' });
  const [isSelectingPlayers, setIsSelectingPlayers] = useState(false);
  const [currentPickingSide, setCurrentPickingSide] = useState<'A' | 'B'>('A');
  const [playingXiA, setPlayingXiA] = useState<any[]>([]);
  const [playingXiB, setPlayingXiB] = useState<any[]>([]);
  const [isConfiguringMatch, setIsConfiguringMatch] = useState(false);
  const [isConfiguringToss, setIsConfiguringToss] = useState(false);
  const [isSelectingOpeners, setIsSelectingOpeners] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isSearchingOfficial, setIsSearchingOfficial] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAddOfficialModalVisible, setIsAddOfficialModalVisible] = useState(false);
  const [newOfficialForm, setNewOfficialForm] = useState({ name: '', phone: '' });
  const [activeOfficialSlot, setActiveOfficialSlot] = useState<{ category: string, index?: number } | null>(null);
  const [tossResult, setTossResult] = useState<{ winner: any, decision: 'bat' | 'bowl' | null }>({ winner: null, decision: null });
  const [matchState, setMatchState] = useState<{ striker: any, nonStriker: any, bowler: any }>({ striker: null, nonStriker: null, bowler: null });
  const [matchConfig, setMatchConfig] = useState({
    type: 'limited overs',
    totalOvers: '20',
    oversPerBowler: '4',
    ballType: 'leather',
    wagonWheel: true,
    pitchType: 'matting',
    state: 'Delhi',
    city: '',
    ground: '',
    dateTime: new Date().toLocaleString(),
    officials: {
      umpires: ['', '', '', ''],
      scorers: ['', ''],
      streamer: '',
      referee: '',
      commentators: ['', '']
    }
  });

  const {
    matchId: liveMatchId, phase: matchPhase, inn, striker, nonStriker, bowler, crr, rrr, yetToBat, formatOvers,
    battingPlayers: squadBatting, bowlingPlayers: squadBowling,
    startMatch, resumeMatch, addBall, addExtra, addWicket, changeBowler, addNewBowler, undoLastBall, startSecondInnings, setOpeners
  } = useCricketScoring();
  
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [isScoringSettingsVisible, setIsScoringSettingsVisible] = useState(false);
  const [isMoreSheetVisible, setIsMoreSheetVisible] = useState(false);
  const [isExtraRunsSelectorVisible, setIsExtraRunsSelectorVisible] = useState(false);
  const [activeExtraType, setActiveExtraType] = useState<'wide' | 'noball' | 'bye' | 'legbye' | null>(null);
  const [expandedSettingSection, setExpandedSettingSection] = useState<string | null>('Match Settings');
  const drawerAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (isScoringSettingsVisible) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isScoringSettingsVisible]);
  const [isSelectingNextBowler, setIsSelectingNextBowler] = useState(false);
  const [isSelectingNewBatter, setIsSelectingNewBatter] = useState(false);
  const [pendingWicketData, setPendingWicketData] = useState<{ dismissedName: string } | null>(null);
  const [lastBowlerId, setLastBowlerId] = useState<string | null>(null);

  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [isAddingNewPlayerManually, setIsAddingNewPlayerManually] = useState(false);
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [manualPlayerPhone, setManualPlayerPhone] = useState('');

  useEffect(() => {
    if (matchPhase === 'innings_break') {
      // Auto-start second innings
      const timer = setTimeout(async () => {
        await startSecondInnings();
        setMatchState({ striker: null, nonStriker: null, bowler: null });
        setIsSelectingOpeners(true);
        setIsScoring(false); // Move out of live scoring to selection view
      }, 500); // Small delay for user to see the all-out/innings-end state
      return () => clearTimeout(timer);
    }
  }, [matchPhase]);

  const handleAddBall = async (runs: number) => {
    const next = await addBall(runs);
    if (next && next.legalBalls > 0 && next.legalBalls % 6 === 0) {
      setLastBowlerId(bowler?.name);
      setIsSelectingNextBowler(true);
    }
  };

  const handleAddExtra = async (type: string, additionalRuns: number = 0) => {
    await addExtra(type, additionalRuns);
    // Extras might complete an over if it's not a Wide/No-ball
    if (inn && (inn.legalBalls + 1) % 6 === 0 && type !== 'wide' && type !== 'noball') {
       setLastBowlerId(bowler?.name);
       setIsSelectingNextBowler(true);
    }
  };

  const handleAddWicket = async (data: any) => {
    await addWicket(data);
    // Only prompt for next bowler if it was an over-ending wicket AND match is still live
    if (matchPhase === 'live' && inn && (inn.legalBalls + 1) % 6 === 0) {
       setLastBowlerId(bowler?.name);
       setIsSelectingNextBowler(true);
    }
  };
  const [teams, setTeams] = useState(INITIAL_TEAMS_DATA);
  const [selectedTeamA, setSelectedTeamA] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchTeams();
    fetchMatches();

    const channel = supabase
      .channel(`live-hub-scores-${Math.random()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_live_state' 
      }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*, match_live_state(*), innings(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Map DB matches to UI format
      const dbMatches = data.map(m => {
        const live = m.match_live_state;
        // Robust check: if match is tagged 'live' OR has any live score state, it's 'Live'
        const status = (m.status === 'live' || !!live) ? 'Live' : (m.status === 'completed' ? 'Result' : 'Upcoming');
        
        let team1Score = undefined;
        let team1Overs = undefined;
        let team2Score = undefined;
        let team2Overs = undefined;

        if (live) {
          // Determine which team is batting based on the live state
          const isTeamABatting = live.batting_team === m.team_a;
          const currentScore = `${live.runs}/${live.wickets}`;
          const currentOvers = `(${Math.floor(live.legal_balls / 6)}.${live.legal_balls % 6} Ov)`;

          if (isTeamABatting) {
            team1Score = currentScore;
            team1Overs = currentOvers;
          } else {
            team2Score = currentScore;
            team2Overs = currentOvers;
          }

          // If it's 2nd innings, try to find 1st innings score for the other team
          if (m.innings && m.innings.length > 0) {
            const firstInn = m.innings.find((i: any) => i.innings_number === 1);
            if (firstInn) {
              const inn1Score = `${firstInn.runs}/${firstInn.wickets}`;
              const inn1Overs = `(${Math.floor(firstInn.legal_balls / 6)}.${firstInn.legal_balls % 6} Ov)`;
              
              if (firstInn.batting_team === m.team_a) {
                team1Score = inn1Score;
                team1Overs = inn1Overs;
              } else {
                team2Score = inn1Score;
                team2Overs = inn1Overs;
              }
            }
          }
        } else if (m.innings && m.innings.length > 0) {
          // If not live but has innings (completed match)
          const inn1 = m.innings.find((i: any) => i.innings_number === 1);
          const inn2 = m.innings.find((i: any) => i.innings_number === 2);
          
          if (inn1) {
            if (inn1.batting_team === m.team_a) {
              team1Score = `${inn1.runs}/${inn1.wickets}`;
              team1Overs = `(${Math.floor(inn1.legal_balls / 6)}.${inn1.legal_balls % 6} Ov)`;
            } else {
              team2Score = `${inn1.runs}/${inn1.wickets}`;
              team2Overs = `(${Math.floor(inn1.legal_balls / 6)}.${inn1.legal_balls % 6} Ov)`;
            }
          }
          if (inn2) {
            if (inn2.batting_team === m.team_a) {
              team1Score = `${inn2.runs}/${inn2.wickets}`;
              team1Overs = `(${Math.floor(inn2.legal_balls / 6)}.${inn2.legal_balls % 6} Ov)`;
            } else {
              team2Score = `${inn2.runs}/${inn2.wickets}`;
              team2Overs = `(${Math.floor(inn2.legal_balls / 6)}.${inn2.legal_balls % 6} Ov)`;
            }
          }
        }

        return {
          id: m.id,
          type: m.match_type || 'Match',
          tournament: 'Live Match',
          status,
          date: new Date(m.created_at).toLocaleDateString(),
          overs: `${m.overs} Ov.`,
          location: m.venue || 'Various Locations',
          team1: m.team_a,
          team2: m.team_b,
          team1Score,
          team1Overs,
          team2Score,
          team2Overs,
          result: live?.result_text,
          isLive: m.status === 'live',
          match_id: m.id,
          batting_team: live?.batting_team
        };
      });
      setFetchedMatches(dbMatches);
    }
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Map DB teams to UI format
      const dbTeams = data.map(t => ({
        ...t,
        isUserTeam: t.owner_id === session?.user?.id,
        initials: t.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
        bgColor: '#0D9488',
        image: t.image_url 
      }));
      setTeams([...dbTeams, ...INITIAL_TEAMS_DATA.filter(it => !dbTeams.some(dt => dt.id === it.id))]);
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      if (!session?.user?.id) throw new Error('User not logged in');
      
      const fileName = `${Date.now()}.png`;
      const filePath = `${session.user.id}/${fileName}`;
      
      // On web, uri is often a blob or blob URL
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('team-logos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/png',
          upsert: true
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
       alert('Please login to create a team');
       return;
    }

    if (!teamForm.name || !teamForm.location || !teamForm.captain) {
      alert('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    let publicImageUrl = null;

    try {
      if (teamForm.image) {
      publicImageUrl = await uploadLogo(teamForm.image);
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([{
        name: teamForm.name,
        location: teamForm.location,
        captain: teamForm.captain,
        image_url: publicImageUrl,
        owner_id: session.user.id
      }])
      .select();

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

  const handleShareTeam = async (team: any) => {
    try {
      const result = await Share.share({
        message: `Join our team "${team.name}" on Book My Ground! Click the link to join: https://bookyourground.com/invite-team/${team.id}`,
        url: `https://bookyourground.com/invite-team/${team.id}`,
        title: `Join ${team.name}`,
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.name || !memberForm.phone) {
      alert('Please fill name and phone');
      return;
    }

    setIsSubmitting(true);
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: activeTeamForPlayers.id,
          player_name: memberForm.name,
          player_phone: memberForm.phone,
          status: 'accepted'
        }])
        .select();

    setIsSubmitting(false);

    if (error) {
      alert('Error adding member: ' + error.message);
    } else {
      setIsAddMemberModalVisible(false);
      setMemberForm({ name: '', phone: '' });
      fetchTeamMembers(activeTeamForPlayers.id);
      
      // Auto-add to Playing XI if in match setup
      if (isSelectingOpeners || isSelectingPlayers) {
        if (activeTeamForPlayers.id === selectedTeamA?.id) {
          setPlayingXiA(prev => [...prev, data[0]]);
        } else if (activeTeamForPlayers.id === selectedTeamB?.id) {
          setPlayingXiB(prev => [...prev, data[0]]);
        }
      }
      
      alert('Player added to your squad!');
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    setTeamMembers([]); // Clear previous team data
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    
    if (data) setTeamMembers(data);
  };

  const handleCreateOfficial = async () => {
    if (!newOfficialForm.name || !newOfficialForm.phone) {
      alert('Please enter name and phone number');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('match_officials')
      .insert([
        { 
          name: newOfficialForm.name, 
          phone: newOfficialForm.phone,
          role: activeOfficialSlot?.category === 'umpires' ? 'Umpire' : 
                activeOfficialSlot?.category === 'scorers' ? 'Scorer' : 'Official'
        }
      ])
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        alert('This mobile number is already registered.');
      } else {
        alert('Error saving official: ' + error.message);
      }
    } else if (data) {
      // Direct select the newly created official
      const { category, index } = activeOfficialSlot!;
      const newOfficials = { ...matchConfig.officials };
      
      if (typeof index === 'number') {
        const arr = [...(newOfficials as any)[category]];
        arr[index] = data.name;
        (newOfficials as any)[category] = arr;
      } else {
        (newOfficials as any)[category] = data.name;
      }

      setMatchConfig({ ...matchConfig, officials: newOfficials });
      setIsAddOfficialModalVisible(false);
      setIsSearchingOfficial(false);
      setNewOfficialForm({ name: '', phone: '' });
      setSearchQuery('');
      alert('New official registered and assigned!');
    }
  };

  useEffect(() => {
    if (isAddPlayerViewVisible && activeTeamForPlayers) {
      fetchTeamMembers(activeTeamForPlayers.id);
    }
  }, [isAddPlayerViewVisible, activeTeamForPlayers]);

  const [selectedTeamB, setSelectedTeamB] = useState<any>(null);
  const [pickingFor, setPickingFor] = useState<'A' | 'B' | null>(null);
  const isCompact = width < 900;

  const MatchCard = ({ match }: { match: any }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.matchType}>
            {match.type}, <Text style={styles.matchTournament}>{match.tournament}</Text>
          </Text>
          <Text style={styles.matchMeta}>{match.date} | {match.overs} | {match.location}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          match.status === 'Result' ? styles.statusBadgeResult : 
          (match.status === 'Live' ? styles.statusBadgeLive : styles.statusBadgeUpcoming)
        ]}>
          {match.status === 'Live' && <View style={styles.pulseDot} />}
          <Text style={[
            styles.statusBadgeText,
            match.status === 'Result' ? styles.statusBadgeTextResult : 
            (match.status === 'Live' ? styles.statusBadgeTextLive : styles.statusBadgeTextUpcoming)
          ]}>{match.status === 'Live' ? 'LIVE' : match.status}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team1[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team1}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team1 && <View style={styles.liveIndicatorDot} />}
            {match.team1Score && <Text style={styles.teamScoreText}>{match.team1Score} <Text style={styles.teamOversText}>{match.team1Overs}</Text></Text>}
          </View>
        </View>

        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team2[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team2}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team2 && <View style={styles.liveIndicatorDot} />}
            {match.team2Score && <Text style={styles.teamScoreText}>{match.team2Score} <Text style={styles.teamOversText}>{match.team2Overs}</Text></Text>}
          </View>
        </View>
      </View>

      {match.status === 'Live' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <TouchableOpacity 
            style={[styles.liveActionBtn, { borderTopWidth: 0, marginTop: 0, flex: 1, backgroundColor: '#F0FDF4', borderRadius: 8 }]}
            onPress={() => router.push(`/live/${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>View</Text>
            <ChevronRight size={14} color="#0D9488" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.liveActionBtn, { borderTopWidth: 0, marginTop: 0, flex: 1.5, backgroundColor: '#0D9488', borderRadius: 8 }]}
            onPress={async () => {
              const success = await resumeMatch(match.match_id);
              if (success) {
                setIsScoring(true);
              } else {
                alert('Could not resume match scoring.');
              }
            }}
          >
            <Text style={[styles.liveActionBtnText, { color: '#FFFFFF' }]}>Resume Scoring</Text>
            <History size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        match.result ? (
          <View style={styles.matchFooter}>
            <Text style={styles.resultText}>{match.result}</Text>
          </View>
        ) : (
          <View style={styles.matchFooter}>
            <Text style={styles.messageText}>{match.message}</Text>
          </View>
        )
      )}
    </View>
  );

  const TournamentCard = ({ tournament }: { tournament: any }) => (
    <View style={styles.tournamentCard}>
       <View style={styles.imageContainer}>
          <Image source={{ uri: tournament.image }} style={styles.tournamentImage} />
          <View style={styles.imageOverlay} />
          {tournament.hasCrown && (
            <View style={styles.crownBadge}>
               <Crown size={12} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
          <View style={styles.ongoingBadge}>
             <Text style={styles.ongoingBadgeText}>{tournament.status}</Text>
          </View>
          <Text style={styles.tournamentTitleOverlay}>{tournament.title}</Text>
       </View>
       <View style={styles.tournamentInfo}>
          <View style={{ flex: 1 }}>
             <Text style={styles.tournamentMeta}>Date: {tournament.dateRange}</Text>
             <Text style={styles.tournamentMeta}>{tournament.location}</Text>
          </View>
          <TouchableOpacity>
             <Text style={styles.followLink}>Follow</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  const TeamCard = ({ team, onSelect }: { team: any; onSelect?: (team: any) => void }) => (
    <TouchableOpacity 
      style={styles.teamCard}
      onPress={() => {
        if (onSelect) onSelect(team);
        else if (team.isUserTeam) {
          setActiveTeamForPlayers(team);
          setIsAddPlayerViewVisible(true);
        }
      }}
    >
       <View style={[styles.teamAvatar, team.bgColor && { backgroundColor: team.bgColor }]}>
          {team.image ? (
            <Image source={{ uri: team.image }} style={styles.teamImage} />
          ) : (
            <Text style={styles.teamInitials}>{team.initials}</Text>
          )}
       </View>
       <View style={styles.teamContent}>
          <View style={{ flex: 1 }}>
             <Text style={styles.teamTitle}>{team.name}</Text>
             <View style={styles.teamMetaRow}>
                <View style={[styles.metaItem, { marginRight: 16 }]}>
                   <MapPin size={12} color="#9CA3AF" />
                   <Text style={styles.metaLabel}>{team.location}</Text>
                </View>
                <View style={styles.metaItem}>
                   <View style={styles.captainIcon}><Text style={styles.captainIconText}>C</Text></View>
                   <Text style={styles.metaLabel}>{team.captain}</Text>
                </View>
             </View>
          </View>
          {onSelect ? (
            <TouchableOpacity style={styles.selectBtn} onPress={() => onSelect(team)}>
               <Text style={styles.selectBtnText}>Select</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setActiveTeamForQr(team); setIsQrModalVisible(true); }}>
              <QrCode size={20} color="#0D9488" strokeWidth={1.5} />
            </TouchableOpacity>
          )}
       </View>
    </TouchableOpacity>
  );

  const CreateTeamCard = () => (
    <TouchableOpacity 
      style={[styles.teamCard, styles.createTeamCard]}
      onPress={() => setIsCreateTeamModalVisible(true)}
    >
       <View style={styles.createTeamIcon}>
          <Plus size={24} color="#0D9488" />
       </View>
       <View style={styles.teamContent}>
          <Text style={styles.createTeamText}>Create New Team</Text>
          <Text style={styles.createTeamSubtext}>Build your squad from scratch</Text>
       </View>
    </TouchableOpacity>
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setTeamForm({ ...teamForm, image: result.assets[0].uri });
    }
  };

  const renderCreateTeamModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isCreateTeamModalVisible}
      onRequestClose={() => setIsCreateTeamModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createTeamModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Team</Text>
            <TouchableOpacity onPress={() => setIsCreateTeamModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Team Name</Text>
            <TextInput 
              style={styles.formInput} 
              placeholder="e.g. Royal Challengers" 
              value={teamForm.name}
              onChangeText={(t) => setTeamForm({...teamForm, name: t})}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Location (State)</Text>
            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setShowStateDropdown(!showStateDropdown)}
            >
              <Text style={[styles.dropdownValue, !teamForm.location && styles.dropdownPlaceholder]}>
                {teamForm.location || 'Select State'}
              </Text>
              <ChevronRight 
                size={20} 
                color="#9CA3AF" 
                style={{ transform: [{ rotate: showStateDropdown ? '90deg' : '0deg' }] }} 
              />
            </TouchableOpacity>

            {showStateDropdown && (
              <View style={styles.statesDropdown}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {INDIAN_STATES.map((state) => (
                    <TouchableOpacity 
                      key={state}
                      style={styles.stateItem}
                      onPress={() => {
                        setTeamForm({ ...teamForm, location: state });
                        setShowStateDropdown(false);
                      }}
                    >
                      <Text style={styles.stateItemText}>{state}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Captain Name</Text>
            <TextInput 
              style={styles.formInput} 
              placeholder="e.g. Virat Kohli" 
              value={teamForm.captain}
              onChangeText={(t) => setTeamForm({...teamForm, captain: t})}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Team Logo</Text>
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {teamForm.image ? (
                  <Image source={{ uri: teamForm.image }} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Camera size={24} color="#9CA3AF" />
                    <Text style={styles.imagePickerText}>Choose Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {teamForm.image && (
                <TouchableOpacity 
                   style={styles.removeImageBtn}
                   onPress={() => setTeamForm({...teamForm, image: ''})}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleCreateTeam}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Team'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleTeamSelect = (team: any) => {
    if (pickingFor === 'A') {
      setSelectedTeamA(team);
      setCurrentPickingSide('A');
      fetchTeamMembers(team.id);
      setIsSelectingPlayers(true);
    } else if (pickingFor === 'B') {
      setSelectedTeamB(team);
      setCurrentPickingSide('B');
      fetchTeamMembers(team.id);
      setIsSelectingPlayers(true);
    }
    setPickingFor(null);
    setIsSelectingTeams(true);
  };

  const renderTeamSelection = () => (
    <View style={styles.selectionView}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={() => { setIsSelectingTeams(false); setSelectedTeamA(null); setSelectedTeamB(null); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.selectionTitle}>Match Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.teamSelectionRow}>
        <TouchableOpacity 
          style={[styles.teamSlot, selectedTeamA && styles.teamSlotFilled]}
          onPress={() => { setPickingFor('A'); setActiveTab('teams'); setIsSelectingTeams(false); }}
        >
          {selectedTeamA ? (
            <>
               <View style={styles.slotAvatar}>
                  {selectedTeamA.image ? <Image source={{ uri: selectedTeamA.image }} style={styles.slotImage} /> : <Text style={styles.slotInitials}>{selectedTeamA.initials}</Text>}
               </View>
               <Text style={styles.slotName}>{selectedTeamA.name}</Text>
            </>
          ) : (
            <View style={styles.emptySlot}>
               <Users2 size={32} color="#9CA3AF" />
               <Text style={styles.slotAction}>Select Team A</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <TouchableOpacity 
          style={[styles.teamSlot, selectedTeamB && styles.teamSlotFilled]}
          onPress={() => { setPickingFor('B'); setActiveTab('teams'); setIsSelectingTeams(false); }}
        >
          {selectedTeamB ? (
            <>
               <View style={styles.slotAvatar}>
                  {selectedTeamB.image ? <Image source={{ uri: selectedTeamB.image }} style={styles.slotImage} /> : <Text style={styles.slotInitials}>{selectedTeamB.initials}</Text>}
               </View>
               <Text style={styles.slotName}>{selectedTeamB.name}</Text>
            </>
          ) : (
            <View style={styles.emptySlot}>
               <Users2 size={32} color="#9CA3AF" />
               <Text style={styles.slotAction}>Select Team B</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {selectedTeamA && selectedTeamB && (
        <TouchableOpacity 
          style={styles.startMatchBtn}
          onPress={() => setIsSelectingPlayers(true)}
        >
           <Text style={styles.startMatchBtnText}>Select Playing XI</Text>
        </TouchableOpacity>
      )}

      {pickingFor && (
        <View style={styles.pickingBanner}>
          <Text style={styles.pickingText}>Choose a team from the list below</Text>
        </View>
      )}
    </View>
  );

  const renderQrModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isQrModalVisible}
      onRequestClose={() => setIsQrModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsQrModalVisible(false)}
      >
        <View style={styles.qrModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Team QR Code</Text>
            <TouchableOpacity onPress={() => setIsQrModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {activeTeamForQr && (
            <View style={styles.qrBody}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                   <View style={[styles.teamAvatarQr, activeTeamForQr.bgColor && { backgroundColor: activeTeamForQr.bgColor }]}>
                      {activeTeamForQr.image ? <Image source={{ uri: activeTeamForQr.image }} style={styles.teamImage} /> : <Text style={styles.teamInitialsQr}>{activeTeamForQr.initials}</Text>}
                   </View>
                   <View>
                      <Text style={styles.qrTeamName}>{activeTeamForQr.name}</Text>
                      <Text style={styles.qrTeamMeta}>{activeTeamForQr.location} • Captain: {activeTeamForQr.captain}</Text>
                   </View>
                </View>

                <View style={styles.qrContainer}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=team_${activeTeamForQr.id}` }} 
                    style={styles.qrImage} 
                  />
                </View>
                
                <Text style={styles.qrFooterText}>Scan to follow this team or invite to match</Text>
              </View>

              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>Download QR Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isSuccessModalVisible}
      onRequestClose={() => setIsSuccessModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsSuccessModalVisible(false)}
      >
        <View style={styles.successModalContent}>
          <View style={styles.successIconWrapper}>
             <Plus size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Hooray!</Text>
          <Text style={styles.successMessage}>Your team has been created and saved successfully.</Text>
          
          <TouchableOpacity 
            style={styles.successCloseBtn}
            onPress={() => setIsSuccessModalVisible(false)}
          >
            <Text style={styles.successCloseBtnText}>Great, thanks!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
    );
  
  const renderPlayerSelection = () => {
    const currentTeam = currentPickingSide === 'A' ? selectedTeamA : selectedTeamB;
    const currentXi = currentPickingSide === 'A' ? playingXiA : playingXiB;
    const setXi = currentPickingSide === 'A' ? setPlayingXiA : setPlayingXiB;

    const togglePlayer = (player: any) => {
      const exists = currentXi.find(p => p.id === player.id);
      if (exists) {
        setXi(currentXi.filter(p => p.id !== player.id));
      } else {
        setXi([...currentXi, player]);
      }
    };

    return (
      <View style={styles.selectionView}>
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => setIsSelectingPlayers(false)}>
            <ChevronRight size={28} color="#0D9488" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.selectionTitle}>Select Playing XI</Text>
            <Text style={styles.selectionSubTitle}>{currentTeam?.name} ({currentXi.length} selected)</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
           {teamMembers.length === 0 ? (
             <View style={styles.noResultArea}>
                <Users size={48} color="#E5E7EB" />
                <Text style={styles.noResultTitle}>No Players Found</Text>
                <Text style={styles.noResultSub}>Add players to your team squad first</Text>
                <TouchableOpacity 
                  style={styles.addNewOfficialBtn}
                  onPress={() => {
                    setActiveTeamForPlayers(currentTeam);
                    setIsAddMemberModalVisible(true);
                  }}
                >
                   <Plus size={20} color="#0D9488" />
                   <Text style={styles.addNewOfficialText}>Add Player to Squad</Text>
                </TouchableOpacity>
             </View>
           ) : (
             teamMembers.map((member, idx) => (
               <TouchableOpacity 
                 key={idx} 
                 style={[styles.playerSelectRow, currentXi.find(p => p.id === member.id) && styles.playerSelectRowActive]}
                 onPress={() => togglePlayer(member)}
               >
                  <View style={styles.avatarCircle}>
                     <User size={24} color="#6B7280" />
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={[styles.playerNameText, currentXi.find(p => p.id === member.id) && { color: '#0D9488' }]}>{member.player_name}</Text>
                     <Text style={{ fontSize: 12, color: '#6B7280' }}>All-rounder</Text>
                  </View>
                  <View style={[styles.checkBox, currentXi.find(p => p.id === member.id) && styles.checkBoxActive]}>
                     {currentXi.find(p => p.id === member.id) && <Plus size={14} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />}
                  </View>
               </TouchableOpacity>
             ))
           )}
        </ScrollView>

        <View style={styles.selectionFooter}>
           {currentPickingSide === 'A' ? (
             <TouchableOpacity 
               style={[styles.startMatchBtn, { marginTop: 0 }, currentXi.length === 0 && { opacity: 0.5 }]}
               onPress={() => {
                 if (currentXi.length === 0) {
                   alert('Please select at least 1 player for Team A');
                   return;
                 }
                 setIsSelectingPlayers(false);
                 // We don't change currentPickingSide here because they need to click Team B slot next
               }}
             >
                <Text style={styles.startMatchBtnText}>Confirm Team A Playing XI ({currentXi.length})</Text>
             </TouchableOpacity>
           ) : (
             <TouchableOpacity 
               style={[styles.startMatchBtn, { marginTop: 0 }, currentXi.length === 0 && { opacity: 0.5 }]}
               onPress={() => {
                 if (currentXi.length === 0) {
                   alert('Please select at least 1 player for Team B');
                   return;
                 }
                 setIsSelectingPlayers(false);
                 setIsConfiguringMatch(true);
               }}
             >
                <Text style={styles.startMatchBtnText}>Confirm Team B Playing XI ({currentXi.length})</Text>
             </TouchableOpacity>
           )}
        </View>
      </View>
    );
  };

  const renderMatchConfiguration = () => {
    const types = [
      { id: 'limited overs', label: 'Limited Overs' },
      { id: 'box cricket', label: 'Box Cricket' },
      { id: 'pair cricket', label: 'Pair Cricket' },
      { id: 'test match', label: 'Test Match' },
      { id: 'the hundred', label: 'The Hundred' }
    ];

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsConfiguringMatch(false)}>
               <ChevronRight size={28} color="#0D9488" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Match Details</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.vsDisplay}>
               <View style={styles.vsTeam}>
                  <Text style={styles.vsName}>{selectedTeamA?.name}</Text>
                  <Text style={styles.vsPlayers}>{playingXiA.length} Players</Text>
               </View>
               <View style={styles.vsBadge}><Text style={styles.vsBadgeText}>VS</Text></View>
               <View style={styles.vsTeam}>
                  <Text style={styles.vsName}>{selectedTeamB?.name}</Text>
                  <Text style={styles.vsPlayers}>{playingXiB.length} Players</Text>
               </View>
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

            {matchConfig.type !== 'test match' && (
              <View style={{ marginTop: 24 }}>
                 {matchConfig.type === 'the hundred' ? (
                   <View style={styles.hundredInfo}>
                      <Text style={styles.hundredText}>Fixed Format: 100 Balls Match</Text>
                   </View>
                 ) : (
                   <View style={{ gap: 20 }}>
                      <View>
                         <Text style={styles.configLabel}>No. of Overs</Text>
                         <TextInput 
                           style={styles.configInput} 
                           keyboardType="numeric" 
                           value={matchConfig.totalOvers}
                           onChangeText={(val) => setMatchConfig({ ...matchConfig, totalOvers: val })}
                         />
                      </View>
                      <View>
                         <Text style={styles.configLabel}>Overs per Bowler</Text>
                         <TextInput 
                           style={styles.configInput} 
                           keyboardType="numeric" 
                           value={matchConfig.oversPerBowler}
                           onChangeText={(val) => setMatchConfig({ ...matchConfig, oversPerBowler: val })}
                         />
                      </View>
                   </View>
                 )}
              </View>
            )}

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Ball Type</Text>
               <View style={styles.ballTypes}>
                  {['Leather', 'Tennis', 'Other'].map(b => (
                    <TouchableOpacity 
                      key={b} 
                      style={[styles.ballTypeBtn, matchConfig.ballType === b.toLowerCase() && styles.ballTypeBtnActive]}
                      onPress={() => setMatchConfig({ ...matchConfig, ballType: b.toLowerCase() })}
                    >
                       <Text style={[styles.ballText, matchConfig.ballType === b.toLowerCase() && styles.ballTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Wagon Wheel</Text>
               <View style={styles.wagonWheelRow}>
                  <Text style={styles.wagonWheelDesc}>Track scoring areas for each ball</Text>
                  <TouchableOpacity 
                    style={[styles.toggleBg, matchConfig.wagonWheel && styles.toggleBgActive]}
                    onPress={() => setMatchConfig({ ...matchConfig, wagonWheel: !matchConfig.wagonWheel })}
                  >
                     <View style={[styles.toggleCircle, matchConfig.wagonWheel && styles.toggleCircleActive]} />
                  </TouchableOpacity>
               </View>
            </View>

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Pitch Type</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {['Rough', 'Cement Turf', 'Astroturf', 'Matting'].map(p => (
                    <TouchableOpacity 
                      key={p} 
                      style={[styles.pitchBtn, matchConfig.pitchType === p.toLowerCase() && styles.pitchBtnActive]}
                      onPress={() => setMatchConfig({ ...matchConfig, pitchType: p.toLowerCase() })}
                    >
                       <Text style={[styles.pitchText, matchConfig.pitchType === p.toLowerCase() && styles.pitchTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>

            <View style={{ marginTop: 32, gap: 20 }}>
               <View>
                  <Text style={styles.configLabel}>State</Text>
                  <View style={styles.pickerWrapper}>
                     <TextInput 
                       style={styles.configInput} 
                       placeholder="Select State"
                       value={matchConfig.state}
                       editable={false} // Would normally be a picker
                     />
                     <ChevronDown size={20} color="#6B7280" style={styles.pickerIcon} />
                  </View>
               </View>

               <View>
                  <Text style={styles.configLabel}>City</Text>
                  <TextInput 
                    style={styles.configInput} 
                    placeholder="Enter City"
                    placeholderTextColor="#9CA3AF"
                    value={matchConfig.city}
                    onChangeText={(val) => setMatchConfig({ ...matchConfig, city: val })}
                  />
               </View>

               <View>
                  <Text style={styles.configLabel}>Ground</Text>
                  <TextInput 
                    style={styles.configInput} 
                    placeholder="Search or Enter Ground"
                    placeholderTextColor="#9CA3AF"
                    value={matchConfig.ground}
                    onChangeText={(val) => setMatchConfig({ ...matchConfig, ground: val })}
                  />
               </View>

               <View>
                  <Text style={styles.configLabel}>Date & Time</Text>
                  <View style={styles.pickerWrapper}>
                     <TextInput 
                       style={styles.configInput} 
                       value={matchConfig.dateTime}
                       onChangeText={(val) => setMatchConfig({ ...matchConfig, dateTime: val })}
                     />
                     <Calendar size={20} color="#6B7280" style={styles.pickerIcon} />
                  </View>
               </View>
            </View>

            <TouchableOpacity 
              style={styles.officialsTrigger}
              onPress={() => setIsConfiguringOfficials(true)}
            >
               <View style={styles.officialsTriggerLeft}>
                  <View style={styles.officialIconBox}>
                     <IdCard size={20} color="#0D9488" />
                  </View>
                  <View>
                     <Text style={styles.officialsTitle}>Match Officials</Text>
                     <Text style={styles.officialsSub}>Umpires, Scorers, Commentators...</Text>
                  </View>
               </View>
               <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
         </ScrollView>

         <View style={styles.configFooter}>
            <TouchableOpacity 
              style={styles.startMatchMainBtn}
              onPress={() => {
                setIsConfiguringMatch(false);
                setIsConfiguringToss(true);
              }}
            >
               <Text style={styles.startMatchMainBtnText}>Next: Configure Toss</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderBowlerSelectionModal = () => {
    if (!isSelectingNextBowler || !inn) return null;

    const filteredSquad = squadBowling.filter(name => 
      name.toLowerCase().includes(playerSearchQuery.toLowerCase())
    ).map(name => ({ id: name, player_name: name }));

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectingNextBowler}
        onRequestClose={() => {
          setIsSelectingNextBowler(false);
          setPlayerSearchQuery('');
          setIsAddingNewPlayerManually(false);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { height: '80%' }]}>
             <View style={styles.sheetHandle} />
             <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={styles.modalHeaderRow}>
                   <View>
                      <Text style={styles.sheetTitle}>Next Over: Choose Bowler</Text>
                      <Text style={styles.sheetSubtitle}>Pick a bowler from {inn.bowlingTeam}</Text>
                   </View>
                   <TouchableOpacity onPress={() => { setIsSelectingNextBowler(false); setPlayerSearchQuery(''); setIsAddingNewPlayerManually(false); }}>
                      <X size={24} color="#6B7280" />
                   </TouchableOpacity>
                </View>

                {!isAddingNewPlayerManually && (
                  <View style={styles.modalSearchContainer}>
                     <Search size={18} color="#9CA3AF" />
                     <TextInput 
                        style={styles.modalSearchInput}
                        placeholder="Search by name or number..."
                        value={playerSearchQuery}
                        onChangeText={setPlayerSearchQuery}
                     />
                  </View>
                )}
             </View>

             <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <View style={styles.playerGrid}>
                    {filteredSquad.map(p => (
                     <TouchableOpacity 
                       key={p.id} 
                       style={[
                         styles.playerGridTile, 
                         lastBowlerId === p.player_name && { opacity: 0.5, backgroundColor: '#F3F4F6' }
                       ]}
                       disabled={lastBowlerId === p.player_name}
                       onPress={() => {
                          addNewBowler(p.player_name);
                          setIsSelectingNextBowler(false);
                       }}
                     >
                        <View style={[styles.miniAvatar, { width: 44, height: 44 }]}>
                           <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{p.player_name[0]}</Text>
                        </View>
                        <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                        {lastBowlerId === p.player_name && (
                           <Text style={{ fontSize: 9, color: '#9CA3AF' }}>Just Bowled</Text>
                        )}
                     </TouchableOpacity>
                   ))}
                </View>

                <TouchableOpacity 
                  style={styles.addPlayerMiniBtn}
                  onPress={() => {
                     const name = prompt('New Bowler Name:');
                     if (name) {
                        addNewBowler(name);
                        setIsSelectingNextBowler(false);
                     }
                  }}
                >
                   <Plus size={18} color="#0D9488" />
                   <Text style={styles.addPlayerMiniText}>Add New Bowler</Text>
                </TouchableOpacity>
             </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderNewBatterSelectionModal = () => {
    if (!isSelectingNewBatter || !inn) return null;

    // Use current 'yet to bat' list from hook
    // Fallback to the full battingPlayers list (also from hook) if needed
    const alreadyOnFieldOrOut = new Set(inn.batters.map(b => b.name.toLowerCase()));
    
    const filteredSquad = squadBatting
      .filter(name => !alreadyOnFieldOrOut.has(name.toLowerCase()))
      .filter(name => name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
      .map(name => ({ id: name, player_name: name }));

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectingNewBatter}
        onRequestClose={() => {
          setIsSelectingNewBatter(false);
          setPlayerSearchQuery('');
          setIsAddingNewPlayerManually(false);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { height: '80%' }]}>
             <View style={styles.sheetHandle} />
             <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={styles.modalHeaderRow}>
                   <View>
                      <Text style={styles.sheetTitle}>New Batter</Text>
                      <Text style={styles.sheetSubtitle}>Pick the next batter for {inn.battingTeam}</Text>
                   </View>
                   <TouchableOpacity onPress={() => { setIsSelectingNewBatter(false); setPlayerSearchQuery(''); setIsAddingNewPlayerManually(false); }}>
                      <X size={24} color="#6B7280" />
                   </TouchableOpacity>
                </View>

                {!isAddingNewPlayerManually && (
                  <View style={styles.modalSearchContainer}>
                     <Search size={18} color="#9CA3AF" />
                     <TextInput 
                        style={styles.modalSearchInput}
                        placeholder="Search by name or number..."
                        value={playerSearchQuery}
                        onChangeText={setPlayerSearchQuery}
                     />
                  </View>
                )}
             </View>

             <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                {filteredSquad.length > 0 ? (
                  <View style={styles.playerGrid}>
                    {filteredSquad.map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={styles.playerGridTile}
                        onPress={() => {
                           handleAddWicket({ 
                             dismissedName: pendingWicketData?.dismissedName, 
                             dismissalType: 'Out', 
                             newBatterName: p.player_name 
                           });
                           setIsSelectingNewBatter(false);
                           setPendingWicketData(null);
                        }}
                      >
                         <View style={[styles.miniAvatar, { width: 44, height: 44, backgroundColor: '#FEF3C7' }]}>
                            <Text style={{ color: '#D97706', fontWeight: 'bold', fontSize: 16 }}>{p.player_name[0]}</Text>
                         </View>
                         <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                     <Text style={styles.sheetSubtitle}>No more players available in squad.</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.addPlayerMiniBtn}
                  onPress={() => {
                     const name = prompt('New Batter Name:');
                     if (name) {
                        handleAddWicket({ 
                          dismissedName: pendingWicketData?.dismissedName, 
                          dismissalType: 'Out', 
                          newBatterName: name 
                        });
                        setIsSelectingNewBatter(false);
                        setPendingWicketData(null);
                     }
                  }}
                >
                   <Plus size={18} color="#0D9488" />
                   <Text style={styles.addPlayerMiniText}>Add New Batter</Text>
                </TouchableOpacity>
             </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderLiveScoring = () => {
    if (!inn) return null;
    
    const oversStr = formatOvers(inn.legalBalls);
    
    // Helper to calculate Strike Rate and Minutes in real-time
    const calcSR = (r: number, b: number) => b === 0 ? '0.0' : ((r / b) * 100).toFixed(1);
    const calcMins = (start?: number) => start ? Math.floor((Date.now() - start) / 60000) : 0;
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
            
            {renderScoringSettingsSidebar()}
            {renderMoreActionsSheet()}
            {renderExtraRunsSelector()}
            {renderBowlerSelectionModal()}
            {renderNewBatterSelectionModal()}

            <View style={styles.targetRow}>
               <Text style={styles.targetText}>
                 {inn.target ? `Target: ${inn.target} | Need ${inn.target - inn.runs} from ${parseInt(matchConfig.totalOvers) * 6 - inn.legalBalls} balls` : `${inn.bowlingTeam} opted to ${tossResult.decision === 'bowl' ? 'bowl' : 'bat'}`}
               </Text>
            </View>

            {/* In-Play Tables */}            <View style={[styles.playerStatsRow, { gap: 24 }]}>
               <View style={[styles.batsmanCol, { flex: 3 }]}>
                  <View style={styles.statsHeader}>
                     <Text style={[styles.statsHeaderText, { flex: 2 }]}>Batsman</Text>
                     <View style={[styles.statsHeadValues, { gap: 10 }]}>
                        <Text style={styles.statsHeaderTextFixed}>R</Text>
                        <Text style={styles.statsHeaderTextFixed}>B</Text>
                        <Text style={styles.statsHeaderTextFixed}>0s</Text>
                        <Text style={styles.statsHeaderTextFixed}>4s</Text>
                        <Text style={styles.statsHeaderTextFixed}>6s</Text>
                        <Text style={[styles.statsHeaderTextFixed, { width: 38 }]}>SR</Text>
                        <Text style={styles.statsHeaderTextFixed}>M</Text>
                     </View>
                  </View>
                  {[striker, nonStriker].map((b, idx) => (
                    <TouchableOpacity 
                       key={idx} 
                       style={styles.statsRow}
                       onPress={() => {
                          if (!b?.name || b.name === '--') {
                             setIsSelectingNewBatter(true);
                          }
                       }}
                    >
                       <Text style={[styles.playerName, b?.onStrike && { color: '#0D9488' }, { flex: 2 }]} numberOfLines={1}>
                          {b?.name || 'Select Batter...'}{b?.onStrike ? '*' : ''}
                       </Text>
                       <View style={[styles.statsValues, { gap: 10 }]}>
                          <Text style={styles.statsValueTextFixed}>{b?.runs || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.balls || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.dots || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.fours || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.sixes || 0}</Text>
                          <Text style={[styles.statsValueTextFixed, { width: 38 }]}>{calcSR(b?.runs || 0, b?.balls || 0)}</Text>
                          <Text style={styles.statsValueTextFixed}>{calcMins(b?.startTime)}</Text>
                       </View>
                    </TouchableOpacity>
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
                        <Text style={styles.statsHeaderTextFixed}>0s</Text>
                        <Text style={styles.statsHeaderTextFixed}>4s</Text>
                        <Text style={styles.statsHeaderTextFixed}>6s</Text>
                     </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.statsRow}
                    onPress={() => setIsSelectingNextBowler(true)}
                  >
                       <Text style={[styles.playerName, { flex: 2 }]} numberOfLines={1}>
                          {bowler?.name || 'Tap to select Bowler...'}
                       </Text>
                       <View style={[styles.statsValues, { gap: 10 }]}>
                          <Text style={styles.statsValueTextFixed}>{bowler?.overs ?? 0}.{bowler?.balls ?? 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.maidens || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.runs || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.wickets || 0}</Text>
                          <Text style={[styles.statsValueTextFixed, { width: 32 }]}>{calcEco(bowler?.runs || 0, bowler?.balls || 0, bowler?.overs || 0)}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.dots || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.fours || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.sixes || 0}</Text>
                       </View>
                    </TouchableOpacity>
               </View>
            </View>


            {/* Ball Timeline */}
            <View style={styles.timelineContainer}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {inn.overBalls.slice(-12).map((b, i) => (
                    <View key={i} style={[styles.ballCircle, b.label === 'W' && styles.ballWicket, (b.label === '4' || b.label === '6') && styles.ballBoundary]}>
                       <Text style={[styles.ballLabel, (b.label === 'W' || b.label === '4' || b.label === '6') && { color: '#FFFFFF' }]}>{b.label}</Text>
                    </View>
                  ))}
                  {inn.overBalls.length === 0 && <Text style={styles.statsHeaderText}>Start the over...</Text>}
               </ScrollView>
            </View>
         </View>

         {/* Scoring Wheel */}
         <View style={styles.scoringWheel}>
            <View style={styles.wheelRow}>
               {[0, 1, 2, 3].map(n => (
                 <TouchableOpacity key={n} style={styles.runBtn} onPress={() => handleAddBall(n)}>
                    <Text style={styles.runBtnText}>{n}</Text>
                 </TouchableOpacity>
               ))}
            </View>
            <View style={styles.wheelRow}>
               {[4, 6].map(n => (
                 <TouchableOpacity key={n} style={[styles.runBtn, styles.boundaryBtn]} onPress={() => handleAddBall(n)}>
                    <Text style={styles.boundaryBtnText}>{n}</Text>
                 </TouchableOpacity>
               ))}
               <TouchableOpacity 
                 style={[styles.runBtn, styles.wicketBtn]} 
                 onPress={() => {
                   if (striker) {
                     setPendingWicketData({ dismissedName: striker.name });
                     setIsSelectingNewBatter(true);
                   } else {
                     const anyActive = inn.batters.filter(b => b.status === 'batting' && !b.out);
                     if (anyActive.length > 0) {
                        setPendingWicketData({ dismissedName: anyActive[0].name });
                        setIsSelectingNewBatter(true);
                     } else {
                        alert('No active batter found to dismiss.');
                     }
                   }
                 }}
                >
                  <Text style={styles.runBtnText}>W</Text>
               </TouchableOpacity>
            </View>
             <View style={styles.extraRow}>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('wide'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>WD</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('noball'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>NB</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('bye'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>BYE</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('legbye'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>LB</Text></TouchableOpacity>
             </View>
         </View>

         {/* Bottom Actions */}
         <View style={styles.scoringActions}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => undoLastBall()}>
              <RotateCcw size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={() => setIsMoreSheetVisible(true)}
            >
              <MoreHorizontal size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>More</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn} 
              onPress={() => setIsScoringSettingsVisible(true)}
            >
              <Settings size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>Settings</Text>
            </TouchableOpacity>
            
            {matchPhase === 'innings_break' && (
              <TouchableOpacity 
                style={[styles.actionIconBtn, { backgroundColor: '#FFF7ED', width: '30%' }]}
                onPress={async () => {
                  await startSecondInnings();
                  setMatchState({ striker: null, nonStriker: null, bowler: null });
                  setIsSelectingOpeners(true);
                }}
              >
                <ChevronRight size={20} color="#F97316" />
                <Text style={[styles.actionIconText, { color: '#F97316' }]}>2nd Inning</Text>
              </TouchableOpacity>
            )}
         </View>
      </View>
    );
  };

  const renderBowlerSelection = () => {
    if (!inn) return null;
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
               {bowlingPlayers.map(p => (
                 <TouchableOpacity 
                   key={p.id} 
                   style={[
                     styles.playerGridTile, 
                     lastBowlerId === p.player_name && { opacity: 0.4, backgroundColor: '#F3F4F6' }
                   ]}
                   onPress={() => {
                     if (lastBowlerId === p.player_name) {
                       alert('A bowler cannot bowl two consecutive overs.');
                       return;
                     }
                     const idx = bowlingPlayers.findIndex(bp => bp.id === p.id);
                     changeBowler(idx);
                     setIsSelectingNextBowler(false);
                   }}
                 >
                    <View style={[styles.miniAvatar, { width: 40, height: 40, backgroundColor: lastBowlerId === p.player_name ? '#9CA3AF' : '#0D9488' }]}>
                       <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                    </View>
                    <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                    {lastBowlerId === p.id && <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: 'bold' }}>PREV BOWLER</Text>}
                 </TouchableOpacity>
               ))}
               <TouchableOpacity 
                 style={[styles.playerGridTile, { borderStyle: 'dashed', borderColor: '#0D9488' }]}
                 onPress={() => {
                   const name = prompt('Enter New Bowler Name:');
                   if (name) {
                     addNewBowler(name);
                     setIsSelectingNextBowler(false);
                   }
                 }}
               >
                  <Plus size={24} color="#0D9488" />
                  <Text style={[styles.playerGridName, { color: '#0D9488' }]}>Add New</Text>
               </TouchableOpacity>
            </View>
         </ScrollView>
      </View>
    );
  };

  const renderOpeningSelection = () => {
    const battingTeam = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
    const bowlingTeam = battingTeam?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
    const battingPlayers = battingTeam?.id === selectedTeamA?.id ? playingXiA : playingXiB;
    const bowlingPlayers = bowlingTeam?.id === selectedTeamA?.id ? playingXiA : playingXiB;

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsSelectingOpeners(false)}>
               <ChevronLeft size={28} color="#0D9488" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Select Openers</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {battingPlayers.length === 0 || bowlingPlayers.length === 0 ? (
               <View style={styles.noResultArea}>
                  <AlertCircle size={48} color="#EF4444" />
                  <Text style={styles.noResultTitle}>Preparation Incomplete</Text>
                  <Text style={styles.noResultSub}>You must select a Playing XI for both teams before picking openers.</Text>
                  <TouchableOpacity 
                    style={[styles.addNewOfficialBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                    onPress={() => {
                      setIsSelectingOpeners(false);
                      setIsConfiguringMatch(false);
                      setIsSelectingPlayers(true);
                      setCurrentPickingSide('A');
                    }}
                  >
                     <ChevronLeft size={20} color="#B91C1C" />
                     <Text style={[styles.addNewOfficialText, { color: '#B91C1C' }]}>Go Back to Player Selection</Text>
                  </TouchableOpacity>
               </View>
            ) : (
              <>
                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Striker</Text>
                      <Text style={styles.playingXiLabel}>{battingTeam?.name} Squad</Text>
                   </View>
                   {battingPlayers.length < 2 && (
                     <Text style={styles.warningText}>⚠️ Add at least 2 players to {battingTeam?.name} to select both openers.</Text>
                   )}
                   <View style={styles.playerGrid}>
                      {battingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.playerGridTile, matchState.striker?.id === p.id && styles.playerGridTileActive, matchState.nonStriker?.id === p.id && { opacity: 0.5 }]}
                          onPress={() => setMatchState({ ...matchState, striker: p })}
                          disabled={matchState.nonStriker?.id === p.id}
                        >
                           <View style={[styles.miniAvatar, { width: 36, height: 36 }]}>
                              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                           </View>
                           <Text style={[styles.playerGridName, matchState.striker?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity 
                        style={[styles.playerGridTile, { borderStyle: 'dashed', borderColor: '#0D9488' }]}
                        onPress={() => {
                          setActiveTeamForPlayers(battingTeam);
                          setIsAddMemberModalVisible(true);
                        }}
                      >
                         <Plus size={20} color="#0D9488" />
                         <Text style={[styles.playerGridName, { color: '#0D9488' }]}>Add</Text>
                      </TouchableOpacity>
                   </View>
                </View>

                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Non-Striker</Text>
                      <Text style={styles.playingXiLabel}>{battingTeam?.name} Squad</Text>
                   </View>
                   <View style={styles.playerGrid}>
                      {battingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.playerGridTile, matchState.nonStriker?.id === p.id && styles.playerGridTileActive, matchState.striker?.id === p.id && { opacity: 0.5 }]}
                          onPress={() => setMatchState({ ...matchState, nonStriker: p })}
                          disabled={matchState.striker?.id === p.id}
                        >
                           <View style={[styles.miniAvatar, { width: 36, height: 36 }]}>
                              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                           </View>
                           <Text style={[styles.playerGridName, matchState.nonStriker?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Opening Bowler</Text>
                      <Text style={styles.playingXiLabel}>{bowlingTeam?.name} Squad</Text>
                   </View>
                   <View style={styles.playerGrid}>
                      {bowlingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.playerGridTile, matchState.bowler?.id === p.id && styles.playerGridTileActive]}
                          onPress={() => setMatchState({ ...matchState, bowler: p })}
                        >
                           <View style={[styles.miniAvatar, { width: 36, height: 36 }]}>
                              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                           </View>
                           <Text style={[styles.playerGridName, matchState.bowler?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>
              </>
            )}
         </ScrollView>

         <View style={styles.configFooter}>
            <TouchableOpacity 
               style={[styles.startMatchMainBtn, (!matchState.striker || !matchState.nonStriker || !matchState.bowler) && { opacity: 0.5 }]}
               disabled={!matchState.striker || !matchState.nonStriker || !matchState.bowler}
               onPress={async () => {
                  const sName = matchState.striker.player_name;
                  const nsName = matchState.nonStriker.player_name;
                  const bwrName = matchState.bowler.player_name;

                  if (inn && (inn.target !== undefined && inn.target !== null)) {
                     // Second Innings: Just set openers for the already created inning
                     await setOpeners(sName, nsName, bwrName);
                  } else {
                     // First Innings
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
                       overs: parseInt(matchConfig.totalOvers),
                       players: playingXiA.length,
                       venue: matchConfig.ground || 'Standard Ground',
                       matchType: matchConfig.type
                     };

                     await startMatch(config, tossResult.winner?.name, tossResult.decision as 'bat' | 'bowl');
                  }
                  
                  setIsSelectingOpeners(false);
                  setIsScoring(true);
               }}
             >
                <Text style={styles.startMatchMainBtnText}>Start Inning</Text>
             </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderTossConfiguration = () => {
    const handleFlip = () => {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipping(false);
        const randomWinner = Math.random() > 0.5 ? selectedTeamA : selectedTeamB;
        setTossResult({ ...tossResult, winner: randomWinner });
      }, 1500);
    };

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsConfiguringToss(false)}>
               <ChevronLeft size={28} color="#0D9488" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Toss Details</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <Text style={styles.configLabel}>Flip the Coin</Text>
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
                       <View style={[styles.miniAvatar, { backgroundColor: team?.bgColor || '#3B82F6', marginBottom: 8 }]}>
                          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{team?.initials}</Text>
                       </View>
                       <Text style={[styles.tossTeamName, tossResult.winner?.id === team?.id && styles.tossTeamNameActive]}>{team?.name}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            {tossResult.winner && (
              <View style={{ width: '100%', marginTop: 32 }}>
                 <Text style={styles.configLabel}>{tossResult.winner.name} won and elected to:</Text>
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
              onPress={() => {
                setIsConfiguringToss(false);
                setIsSelectingOpeners(true);
              }}
            >
               <Text style={styles.startMatchMainBtnText}>Ready to Play</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderMatchOfficials = () => (
    <View style={styles.selectionView}>
       <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => setIsConfiguringOfficials(false)}>
             <ChevronRight size={28} color="#0D9488" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.selectionTitle}>Match Officials</Text>
          <View style={{ width: 40 }} />
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ gap: 24 }}>
             <View>
                <Text style={styles.officialGroupTitle}>Umpires</Text>
                {[0, 1, 2, 3].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'umpires', index: i });
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <User size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.umpires[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.umpires[i] || `Select Umpire ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Scorers</Text>
                {[0, 1].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'scorers', index: i });
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <Menu size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.scorers[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.scorers[i] || `Select Scorer ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Match Referee</Text>
                <TouchableOpacity 
                  style={styles.officialInputRow}
                  onPress={() => {
                    setActiveOfficialSlot({ category: 'referee' });
                    setIsSearchingOfficial(true);
                  }}
                >
                   <UserSquare2 size={18} color="#9CA3AF" />
                   <Text style={[styles.officialValueText, !matchConfig.officials.referee && styles.officialPlaceholderText]}>
                      {matchConfig.officials.referee || "Select Match Referee"}
                   </Text>
                </TouchableOpacity>
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Live Streamer</Text>
                <TouchableOpacity 
                  style={styles.officialInputRow}
                  onPress={() => {
                    setActiveOfficialSlot({ category: 'streamer' });
                    setIsSearchingOfficial(true);
                  }}
                >
                   <Video size={18} color="#9CA3AF" />
                   <Text style={[styles.officialValueText, !matchConfig.officials.streamer && styles.officialPlaceholderText]}>
                      {matchConfig.officials.streamer || "Select Live Streamer"}
                   </Text>
                </TouchableOpacity>
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Commentators</Text>
                {[0, 1].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'commentators', index: i });
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <Mic2 size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.commentators[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.commentators[i] || `Select Commentator ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>
       </ScrollView>

       <View style={styles.configFooter}>
          <TouchableOpacity 
            style={styles.startMatchMainBtn}
            onPress={() => setIsConfiguringOfficials(false)}
          >
             <Text style={styles.startMatchMainBtnText}>Save Officials</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  const renderOfficialSearch = () => {
    const mockOfficials = [
      { name: 'Nitin Menon', phone: '9876543210', role: 'Umpire' },
      { name: 'Richard Kettleborough', phone: '8765432109', role: 'Umpire' },
      { name: 'Harsha Bhogle', phone: '7654321098', role: 'Commentator' }
    ];

    const filtered = mockOfficials.filter(o => o.phone.includes(searchQuery) || o.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSelect = (official: any) => {
      if (!activeOfficialSlot) return;
      const { category, index } = activeOfficialSlot;
      const newOfficials = { ...matchConfig.officials };
      
      if (typeof index === 'number') {
        const arr = [...(newOfficials as any)[category]];
        arr[index] = official.name;
        (newOfficials as any)[category] = arr;
      } else {
        (newOfficials as any)[category] = official.name;
      }

      setMatchConfig({ ...matchConfig, officials: newOfficials });
      setIsSearchingOfficial(false);
      setSearchQuery('');
    };

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsSearchingOfficial(false)}>
               <ChevronRight size={28} color="#0D9488" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Search Official</Text>
            <View style={{ width: 40 }} />
         </View>

         <View style={[styles.searchBarContainer, { marginHorizontal: 20 }]}>
            <Search size={18} color="#9CA3AF" />
            <TextInput 
              placeholder="Search by name or priority phone..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="number-pad"
            />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {filtered.length > 0 ? (
              filtered.map((o, idx) => (
                <TouchableOpacity key={idx} style={styles.officialResultCard} onPress={() => handleSelect(o)}>
                   <View style={styles.miniAvatar}><Text style={{ color: '#FFFFFF' }}>{o.name[0]}</Text></View>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{o.name}</Text>
                      <Text style={styles.resultPhone}>{o.phone}</Text>
                   </View>
                   <Text style={styles.resultRole}>{o.role}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultArea}>
                 <Search size={48} color="#E5E7EB" />
                 <Text style={styles.noResultTitle}>No official found</Text>
                 <Text style={styles.noResultSub}>Try searching with a full mobile number</Text>
                 
                 <TouchableOpacity 
                   style={styles.addNewOfficialBtn}
                   onPress={() => {
                     setNewOfficialForm({ name: '', phone: searchQuery });
                     setIsAddOfficialModalVisible(true);
                   }}
                 >
                    <Plus size={20} color="#0D9488" />
                    <Text style={styles.addNewOfficialText}>Add & Register "{searchQuery || 'New Official'}"</Text>
                 </TouchableOpacity>
              </View>
            )}
         </ScrollView>

         {/* Add Official Modal */}
         <Modal
           animationType="slide"
           transparent={true}
           visible={isAddOfficialModalVisible}
           onRequestClose={() => setIsAddOfficialModalVisible(false)}
         >
           <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsAddOfficialModalVisible(false)}
           >
              <Pressable 
                style={styles.modalContent} 
                onPress={e => Platform.OS === 'web' && (e as any).stopPropagation()}
              >
                 <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Register New Official</Text>
                    <TouchableOpacity onPress={() => setIsAddOfficialModalVisible(false)}>
                       <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.label}>Official Name</Text>
                    <TextInput 
                      style={styles.formInput}
                      placeholder="e.g. Richard Illingworth"
                      value={newOfficialForm.name}
                      onChangeText={val => setNewOfficialForm({ ...newOfficialForm, name: val })}
                    />
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput 
                      style={styles.formInput}
                      placeholder="+91 00000 00000"
                      keyboardType="number-pad"
                      value={newOfficialForm.phone}
                      onChangeText={val => setNewOfficialForm({ ...newOfficialForm, phone: val })}
                    />
                 </View>

                 <TouchableOpacity 
                   style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                   onPress={handleCreateOfficial}
                   disabled={isSubmitting}
                 >
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Registering...' : 'Register & Select Official'}</Text>
                 </TouchableOpacity>
              </Pressable>
           </TouchableOpacity>
         </Modal>
      </View>
    );
  };

  const [isConfiguringOfficials, setIsConfiguringOfficials] = useState(false);

  const renderMoreActionsSheet = () => {
    const gridItems = [
      { id: 'help', label: 'Need Help', icon: HelpCircle },
      { id: 'rules', label: 'Match Rules', icon: Settings },
      { id: 'scorer', label: 'Change Scorer', icon: UserSquare2 },
      { id: 'squad', label: 'Change Squad', icon: Users },
      { id: 'scorecard', label: 'Full Scorecard', icon: LayoutGrid },
      { id: 'overs', label: 'Match Overs', icon: Clock },
      { id: 'replace', label: 'Replace Batters', icon: RotateCcw },
      { id: 'bonus', label: 'Bonus Runs', icon: PlusCircle },
      { id: 'dropped', label: 'Dropped Catch', icon: Hand },
      { id: 'saved', label: 'Runs Saved/Missed', icon: TrendingUp },
      { id: 'keeper', label: 'Change Keeper', icon: UserSquare2 },
      { id: 'breaks', label: 'Match Breaks', icon: Coffee },
      { id: 'powerplay', label: 'Power Play', icon: Zap },
      { id: 'target', label: 'Revise Target', icon: Target },
      { id: 'bowler', label: 'Change Bowler', icon: RefreshCw },
      { id: 'hurt', label: 'Retired Hurt (Batter)', icon: UserMinus },
    ];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMoreSheetVisible}
        onRequestClose={() => setIsMoreSheetVisible(false)}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMoreSheetVisible(false)}
        >
          <View style={styles.sheetContent}>
             <View style={styles.sheetHandle} />
             <ScrollView contentContainerStyle={styles.sheetGrid}>
                {gridItems.map(item => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.sheetGridItem}
                    onPress={() => {
                       alert(`Action: ${item.label}`);
                       setIsMoreSheetVisible(false);
                    }}
                  >
                     <View style={styles.sheetIconBox}>
                        <item.icon size={26} color="#111827" strokeWidth={1.5} />
                     </View>
                     <Text style={styles.sheetItemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>
             <TouchableOpacity 
               style={styles.showLessBtn}
               onPress={() => setIsMoreSheetVisible(false)}
             >
                <Text style={styles.showLessText}>Show less</Text>
             </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  const renderExtraRunsSelector = () => {
    if (!isExtraRunsSelectorVisible || !activeExtraType) return null;

    const runOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const typeLabel = activeExtraType === 'wide' ? 'WIDE' : activeExtraType === 'noball' ? 'NO BALL' : activeExtraType === 'bye' ? 'BYE' : 'LEG BYE';

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isExtraRunsSelectorVisible}
        onRequestClose={() => setIsExtraRunsSelectorVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsExtraRunsSelectorVisible(false)}
        >
          <View style={styles.extraSelectorContent}>
             <Text style={styles.extraSelectorTitle}>Extras: {typeLabel}</Text>
             <Text style={styles.extraSelectorDesc}>Select additional runs (if any)</Text>
             <View style={styles.extraRunsGrid}>
                {runOptions.map(runs => (
                  <TouchableOpacity 
                    key={runs} 
                    style={styles.extraRunTile}
                    onPress={() => {
                       handleAddExtra(activeExtraType, runs);
                       setIsExtraRunsSelectorVisible(false);
                       setActiveExtraType(null);
                    }}
                  >
                     <Text style={styles.extraRunTileText}>+{runs}</Text>
                  </TouchableOpacity>
                ))}
             </View>
             <TouchableOpacity 
               style={styles.cancelExtraBtn}
               onPress={() => setIsExtraRunsSelectorVisible(false)}
             >
                <Text style={styles.cancelExtraText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderScoringSettingsSidebar = () => {
    const sections = [
      {
        title: 'Match Settings',
        options: [
          'Change Match Overs', 
          'Match Rules (WD, NB, WW)', 
          'Revise Target (DLS/VJD)',
          'Add Bonus Runs',
          'Give Penalty Runs',
          'End / Declare Innings',
          'End Match'
        ]
      },
      {
        title: 'Players Settings',
        options: [
          'Change Playing Squad',
          'Change Bowler',
          'Replace Batters',
          'Retired Hurt (Batter)'
        ]
      },
      {
        title: 'Scorer Settings',
        options: [
          'Change Scorer',
          'Add Match Officials/Streamer',
          'Select Power Play Overs',
          'Set Match Breaks (Lunch, Drinks, etc.)',
          'Add Scorer Notes'
        ]
      },
      {
        title: 'Other Options',
        options: ['Scoring Help']
      }
    ];

    const closeDrawer = () => {
      Animated.timing(drawerAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsScoringSettingsVisible(false);
      });
    };

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isScoringSettingsVisible}
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity 
          style={styles.drawerOverlay} 
          activeOpacity={1} 
          onPress={closeDrawer}
        >
          <Animated.View 
            style={[
              styles.drawerContent,
              { transform: [{ translateX: drawerAnim }] }
            ]}
          >
             <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Settings</Text>
                <TouchableOpacity onPress={closeDrawer}>
                   <X size={24} color="#111827" />
                </TouchableOpacity>
             </View>

             <ScrollView style={{ flex: 1 }}>
                {sections.map(section => (
                  <View key={section.title} style={styles.settingSection}>
                     <TouchableOpacity 
                       style={styles.sectionHeaderRow}
                       onPress={() => setExpandedSettingSection(expandedSettingSection === section.title ? null : section.title)}
                     >
                        <Text style={styles.sectionHeaderTextMenu}>{section.title}</Text>
                        {expandedSettingSection === section.title ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                     </TouchableOpacity>

                     {expandedSettingSection === section.title && (
                       <View style={styles.sectionOptionsList}>
                          {section.options.map(opt => (
                            <TouchableOpacity 
                              key={opt} 
                              style={styles.settingOptionRow}
                              onPress={() => {
                                // Implement handlers here
                                alert(`Opening: ${opt}`);
                              }}
                            >
                               <Text style={styles.settingOptionText}>{opt}</Text>
                            </TouchableOpacity>
                          ))}
                       </View>
                     )}
                  </View>
                ))}
             </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderTeamProfileView = () => (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderTop}>
          <TouchableOpacity onPress={() => setIsAddPlayerViewVisible(false)}>
            <ChevronRight size={28} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => {
              setActiveTeamForQr(activeTeamForPlayers);
              setIsQrModalVisible(true);
            }}>
              <QrCode size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProfileSubTab('stats')}>
              <Sliders size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShareTeam(activeTeamForPlayers)}>
              <Share2 size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileInfoRow}>
          <View style={[styles.profileAvatar, { backgroundColor: activeTeamForPlayers?.bgColor || '#3B82F6' }]}>
            <Text style={styles.profileAvatarText}>{activeTeamForPlayers?.initials || 'T'}</Text>
          </View>
          <View>
            <Text style={styles.profileNameText}>{activeTeamForPlayers?.name}</Text>
            <Text style={styles.profileMetaText}>Since 2026 • {activeTeamForPlayers?.location}</Text>
          </View>
        </View>

        <View style={styles.profileActionsRow}>
          <TouchableOpacity style={styles.rankBtn}>
             <Trophy size={18} color="#FFFFFF" />
             <Text style={styles.rankBtnText}>Team Rank</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.insightsBtn}>
             <BarChart3 size={18} color="#FFFFFF" />
             <Text style={styles.insightsBtnText}>Insights</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileTabsFixed}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}>
          {['Matches', 'Leaderboard', 'Stats', 'Members', 'Trophies', 'Photos', 'Profile'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setProfileSubTab(tab.toLowerCase())}
              style={[styles.profileSubTab, profileSubTab === tab.toLowerCase() && styles.profileSubTabActive]}
            >
               <Text style={[styles.profileSubTabText, profileSubTab === tab.toLowerCase() && styles.profileSubTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
         {renderProfileSubContent()}
      </ScrollView>
    </View>
  );

  const renderProfileSubContent = () => {
    switch (profileSubTab) {
      case 'matches':
        return (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Upcoming Matches</Text>
            {MATCHES_DATA.slice(0, 1).map(match => <MatchCard key={match.id} match={match} />)}
            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Past Matches</Text>
            <View style={styles.profilePlaceholder}>
               <History size={48} color="#E5E7EB" />
               <Text style={styles.placeholderTitle}>No past matches</Text>
            </View>
          </View>
        );
      case 'members':
        return (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <Text style={styles.sectionHeading}>{teamMembers.length} Members</Text>
               <TouchableOpacity style={styles.addMemberSmallBtn} onPress={() => setManagementTab('squad')}>
                  <Plus size={16} color="#0D9488" />
                  <Text style={styles.addMemberSmallText}>Add New</Text>
               </TouchableOpacity>
            </View>
            {teamMembers.map((member, idx) => (
              <View key={idx} style={[styles.playerCardRow, { borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                 <View style={styles.avatarCircle}>
                    <User size={24} color="#6B7280" />
                 </View>
                 <View>
                    <Text style={styles.playerNameText}>{member.player_name}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>All-rounder</Text>
                 </View>
              </View>
            ))}
          </View>
        );
      case 'stats':
        return (
          <View style={{ gap: 16 }}>
             <View style={styles.statsSummaryGrid}>
                {[
                  { label: 'Matches', value: '12', color: '#3B82F6' },
                  { label: 'Won', value: '8', color: '#10B981' },
                  { label: 'Lost', value: '4', color: '#EF4444' },
                  { label: 'Win %', value: '66%', color: '#F59E0B' }
                ].map((stat, i) => (
                  <View key={i} style={styles.statBox}>
                     <Text style={[styles.statBoxValue, { color: stat.color }]}>{stat.value}</Text>
                     <Text style={styles.statBoxLabel}>{stat.label}</Text>
                  </View>
                ))}
             </View>
             <View style={styles.performanceChart}>
                <Text style={styles.sectionHeading}>Team Form</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                   {['W', 'W', 'L', 'W', 'W'].map((r, i) => (
                     <View key={i} style={[styles.formCircle, { backgroundColor: r === 'W' ? '#10B981' : '#EF4444' }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{r}</Text>
                     </View>
                   ))}
                </View>
             </View>
          </View>
        );
      case 'trophies':
        return (
          <View style={styles.trophyGrid}>
             <View style={styles.trophyBox}>
                <Trophy size={40} color="#F59E0B" />
                <Text style={styles.trophyYear}>2025</Text>
                <Text style={styles.trophyEvent}>City Premier League</Text>
             </View>
             <View style={[styles.trophyBox, { opacity: 0.3, borderStyle: 'dashed' }]}>
                <Trophy size={40} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>Next Trophy?</Text>
             </View>
          </View>
        );
      case 'leaderboard':
        return (
          <View style={{ gap: 12 }}>
             <View style={styles.leaderboardSubTabs}>
                {['Bat', 'Bowl', 'Field', 'Partnership'].map(st => (
                  <TouchableOpacity 
                    key={st} 
                    style={[styles.lbSubTab, leaderboardSubTab === st.toLowerCase() && styles.lbSubTabActive]}
                    onPress={() => setLeaderboardSubTab(st.toLowerCase())}
                  >
                     <Text style={[styles.lbSubTabText, leaderboardSubTab === st.toLowerCase() && styles.lbSubTabTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
             </View>
             
             <Text style={styles.sectionHeading}>Top {leaderboardSubTab} ranking</Text>
             {teamMembers.length > 0 ? teamMembers.slice(0, 3).map((m, i) => (
               <View key={i} style={styles.leaderboardRow}>
                  <Text style={styles.rankNum}>{i+1}</Text>
                  <View style={[styles.miniAvatar, { backgroundColor: i === 0 ? '#F59E0B' : '#3B82F6' }]}><Text style={{ color: '#FFFFFF', fontSize: 10 }}>{m.player_name[0]}</Text></View>
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontWeight: '700' }}>{m.player_name}</Text>
                     <Text style={{ fontSize: 11, color: '#6B7280' }}>8 matches played</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                     <Text style={{ color: '#0D9488', fontWeight: '800' }}>{400 + (100 - i * 20)} pts</Text>
                     <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Avg: {45 - i*5}.2</Text>
                  </View>
               </View>
             )) : (
                <View style={[styles.profilePlaceholder, { paddingTop: 20 }]}>
                   <BarChart3 size={40} color="#E5E7EB" />
                   <Text style={styles.placeholderTitle}>No stats yet</Text>
                </View>
             )}
          </View>
        );
      default:
        return (
          <View style={styles.profilePlaceholder}>
            <Image source={{ uri: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} style={styles.placeholderImg} />
            <Text style={styles.placeholderTitle}>No {profileSubTab} yet</Text>
            <Text style={styles.placeholderDesc}>Start playing matches to see your {profileSubTab} here.</Text>
          </View>
        );
    }
  };

  const renderAddPlayerView = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAddPlayerViewVisible}
      onRequestClose={() => setIsAddPlayerViewVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsAddPlayerViewVisible(false)}
      >
        <Pressable 
          style={[styles.addPlayerModalContent, managementTab === 'profile' && { height: '95%', padding: 0 }]} 
          onPress={(e) => {
            if (Platform.OS === 'web') {
              (e as any).stopPropagation();
            }
          }}
        >
          {managementTab === 'profile' ? renderTeamProfileView() : (
          <View style={{ flex: 1 }}>
          <View style={styles.addPlayerHeader}>
            <TouchableOpacity onPress={() => setIsAddPlayerViewVisible(false)}>
               <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.addPlayerTitle}>Add Player</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.addPlayerScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.activeTeamInfo}>
               <View style={[styles.teamAvatarLarge, activeTeamForPlayers?.bgColor && { backgroundColor: activeTeamForPlayers.bgColor }]}>
                  {activeTeamForPlayers?.image ? <Image source={{ uri: activeTeamForPlayers.image }} style={styles.teamImage} /> : <Text style={styles.teamInitialsLarge}>{activeTeamForPlayers?.initials}</Text>}
               </View>
               <Text style={styles.activeTeamName}>{activeTeamForPlayers?.name}</Text>
               <Text style={styles.activeTeamMeta}>{activeTeamForPlayers?.location}</Text>
            </View>

            <View style={styles.assignAdminBanner}>
               <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>A</Text>
               </View>
               <Text style={styles.adminBannerText}>Assign Admin of the Team</Text>
            </View>

            <TouchableOpacity style={styles.promoBanner}>
               <View style={styles.promoContent}>
                  <View style={styles.promoIconPlaceholder} />
                  <Text style={styles.promoText}>Get Squad Banners</Text>
               </View>
               <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.squadSection}>
               {teamMembers.length > 0 ? (
                 teamMembers.map((member, idx) => (
                   <View key={idx} style={styles.playerCardRow}>
                      <View style={styles.playerAvatar}>
                         {/* Placeholder image or initial */}
                         <View style={styles.avatarCircle}>
                            <Users size={24} color="#6B7280" />
                         </View>
                         <View style={styles.onlineDot} />
                      </View>
                      <Text style={styles.playerNameText}>{member.player_name}</Text>
                   </View>
                 ))
               ) : (
                 <View style={{ paddingTop: 20 }}>
                    <Text style={styles.sectionHeading}>Invite players via</Text>
                    
                    <View style={styles.inviteContainer}>
                       <View style={styles.inviteLabelRow}>
                          <Text style={styles.inviteLabel}>Team Link</Text>
                          <Share2 size={20} color="#0D9488" />
                       </View>
                       
                       <View style={styles.linkBox}>
                          <View style={styles.linkIconWrapper}>
                             <Link size={20} color="#0D9488" />
                          </View>
                          <Text style={styles.linkText} numberOfLines={2}>
                            https://bookyourground.com/invite-team/{activeTeamForPlayers?.id}
                          </Text>
                       </View>

                       <TouchableOpacity 
                         style={styles.shareBtn}
                         onPress={() => handleShareTeam(activeTeamForPlayers)}
                       >
                          <Text style={styles.shareBtnText}>Share With Captain/players</Text>
                       </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 32 }]}>Manually add players via</Text>
                    
                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => setIsAddMemberModalVisible(true)}
                    >
                       <View style={styles.optionCircle}>
                          <Smartphone size={24} color="#0D9488" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Add via Phone Number</Text>
                          <Text style={styles.optionSubtext}>Best for adding multiple players quickly.</Text>
                       </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => setIsContactPickerVisible(true)}
                    >
                       <View style={styles.optionCircle}>
                          <UserPlus size={24} color="#0D9488" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Add from Contacts</Text>
                          <Text style={styles.optionSubtext}>Best if players are already in your contacts.</Text>
                       </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => {
                        setActiveTeamForQr(activeTeamForPlayers);
                        setIsQrModalVisible(true);
                      }}
                    >
                       <View style={styles.optionCircle}>
                          <QrCode size={24} color="#0D9488" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Team QR code</Text>
                          <Text style={styles.optionSubtext}>Scan and add players directly in team via QR code.</Text>
                       </View>
                    </TouchableOpacity>
                 </View>
               )}
            </View>
          </ScrollView>
          </View>
          )}

          <View style={styles.squadFooter}>
             <TouchableOpacity 
               style={[styles.footerTab, managementTab === 'profile' && styles.footerTabActive]}
               onPress={() => setManagementTab('profile')}
             >
                <Text style={[styles.footerTabText, managementTab === 'profile' && styles.footerTabTextActive]}>Team Profile</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.footerTab, managementTab === 'squad' && styles.footerTabActive]}
               onPress={() => setManagementTab('squad')}
             >
                <Text style={[styles.footerTabText, managementTab === 'squad' && styles.footerTabTextActive]}>Add Player</Text>
             </TouchableOpacity>
          </View>
        </Pressable>
    </TouchableOpacity>
  </Modal>
  );

  const renderAddMemberModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAddMemberModalVisible}
      onRequestClose={() => setIsAddMemberModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsAddMemberModalVisible(false)}
      >
        <Pressable 
          style={styles.modalContent} 
          onPress={(e) => {
            if (Platform.OS === 'web') {
              (e as any).stopPropagation();
            }
          }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Player Manually</Text>
            <TouchableOpacity onPress={() => setIsAddMemberModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Player Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. MS Dhoni"
              placeholderTextColor="#9CA3AF"
              value={memberForm.name}
              onChangeText={(text) => setMemberForm({ ...memberForm, name: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.formInput}
              placeholder="+91 99999 00000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={memberForm.phone}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '');
                setMemberForm({ ...memberForm, phone: digits });
              }}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleAddMember}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Adding...' : 'Add Player to Squad'}</Text>
          </TouchableOpacity>
        </Pressable>
      </TouchableOpacity>
    </Modal>
  );

  const renderContactPicker = () => {
    const mockContacts = [
      { name: 'Arjun Sharma', phone: '+91 98765 43210', initials: 'AS' },
      { name: 'Rohit Verma', phone: '+91 87654 32109', initials: 'RV' },
      { name: 'Rahul Singh', phone: '+91 76543 21098', initials: 'RS' },
      { name: 'Sandeep Mani', phone: '+91 65432 10987', initials: 'SM' },
      { name: 'Vikram Batra', phone: '+91 54321 09876', initials: 'VB' },
    ];

    const filteredContacts = mockContacts.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isContactPickerVisible}
        onRequestClose={() => setIsContactPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsContactPickerVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { height: '80%', paddingBottom: 0 }]} 
            onPress={(e) => {
              if (Platform.OS === 'web') {
                (e as any).stopPropagation();
              }
            }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setIsContactPickerVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 16 }]}>
              <Search size={16} color="#9CA3AF" />
              <TextInput 
                 placeholder="Search recent contacts..." 
                 style={styles.searchInput}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 placeholderTextColor="#9CA3AF"
              />
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { marginBottom: 12 }]}>Recent Selections</Text>
              {filteredContacts.length > 0 ? filteredContacts.map((contact, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.contactItem}
                  onPress={() => {
                    setMemberForm({ name: contact.name, phone: contact.phone });
                    setIsContactPickerVisible(false);
                    setIsAddMemberModalVisible(true);
                  }}
                >
                  <View style={styles.contactAvatar}>
                     <Text style={styles.contactInitial}>{contact.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.contactName}>{contact.name}</Text>
                     <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Users size={48} color="#E5E7EB" />
                  <Text style={{ marginTop: 12, color: '#9CA3AF' }}>No contacts found</Text>
                </View>
              )}
            </ScrollView>
            
            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
               <TouchableOpacity 
                 style={[styles.submitBtn, { backgroundColor: '#F3F4F6', marginTop: 0 }]}
                 onPress={() => {
                   setIsContactPickerVisible(false);
                   setIsAddMemberModalVisible(true);
                 }}
               >
                  <Text style={[styles.submitBtnText, { color: '#374151' }]}>Don't see them? Add manually</Text>
               </TouchableOpacity>
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'matches':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['All', 'Ongoing', 'Upcoming', 'Result'].map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]}
                  onPress={() => setSubTab(label.toLowerCase())}
                >
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.matchesList}>
              {[...fetchedMatches, ...MATCHES_DATA]
                .filter(m => {
                  if (subTab === 'all') return true;
                  if (subTab === 'ongoing') return m.status === 'Live';
                  return m.status.toLowerCase() === subTab.toLowerCase();
                })
                .map(match => (
                  <MatchCard key={match.id} match={match} />
                ))
              }
            </View>
          </View>
        );
      case 'tournaments':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['All', 'Participate', 'Network', 'Nearby'].map((label) => (
                <TouchableOpacity key={label} style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} onPress={() => setSubTab(label.toLowerCase())}>
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.matchesList}>
               {TOURNAMENTS_DATA.map(tournament => (
                 <TournamentCard key={tournament.id} tournament={tournament} />
               ))}
               <View style={styles.adBanner}>
                  <Image source={{ uri: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg' }} style={styles.adImage} />
                  <View style={styles.adOverlay}>
                     <Text style={styles.adTitle}>Don't let good{'\n'}<Text style={styles.adTitleBold}>cricket go unseen</Text></Text>
                     <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Stream now</Text></TouchableOpacity>
                  </View>
               </View>
            </View>
          </View>
        );
      case 'teams':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['Your', 'Opponents', 'Following'].map((label) => (
                <TouchableOpacity key={label} style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} onPress={() => setSubTab(label.toLowerCase())}>
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.searchBarContainer}>
               <Search size={16} color="#9CA3AF" />
               <TextInput placeholder="Quick search" placeholderTextColor="#9CA3AF" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <View style={styles.matchesList}>
               <CreateTeamCard />
               {teams
                 .filter(team => {
                   const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
                   if (subTab === 'your') return team.isUserTeam && matchesSearch;
                   return matchesSearch;
                 })
                 .map(team => (
                 <TeamCard 
                   key={team.id} 
                   team={team} 
                   onSelect={pickingFor ? handleTeamSelect : undefined}
                 />
               ))}
               <View style={styles.adBanner}>
                  <Image source={{ uri: 'https://images.pexels.com/photos/3771811/pexels-photo-3771811.jpeg' }} style={styles.adImage} />
                  <View style={styles.adOverlay}>
                     <Text style={styles.adTitle}>Find a more fulfilling job.{'\n'}<Text style={styles.adTitleBold}>LinkedIn</Text></Text>
                     <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Get the app</Text></TouchableOpacity>
                  </View>
               </View>
            </View>
          </View>
        );
      case 'stats':
        let currentStats = BATTING_STATS;
        if (subTab === 'bowling') currentStats = BOWLING_STATS;
        if (subTab === 'fielding') currentStats = FIELDING_STATS;
        if (subTab === 'captain') currentStats = CAPTAIN_STATS;

        return (
          <View style={{ flex: 1 }}>
            <View style={styles.statsPromoHeader}>
               <Text style={styles.statsPromoText}>Want to improve your stats?</Text>
               <TouchableOpacity style={styles.analyzeBtn}><Text style={styles.analyzeBtnText}>Analyze</Text></TouchableOpacity>
            </View>

            <View style={styles.statsFilterBar}>
              {['Batting', 'Bowling', 'Fielding', 'Captain'].map((label) => (
                <TouchableOpacity 
                  key={label}
                  style={[styles.statPill, subTab === label.toLowerCase() && styles.statPillActive]} 
                  onPress={() => setSubTab(label.toLowerCase())}
                >
                  <Text style={[styles.statPillText, subTab === label.toLowerCase() && styles.statPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsContent}>
               <View style={styles.statsSectionHeader}>
                  <Text style={styles.statsSectionTitle}>Overall</Text>
                  <TouchableOpacity style={styles.compareBtn}>
                     <Users2 size={14} color="#FFFFFF" strokeWidth={2.5} />
                     <Text style={styles.compareBtnText}>Compare</Text>
                  </TouchableOpacity>
               </View>

               <View style={styles.statsGrid}>
                  {currentStats.map((stat, idx) => (
                    <View key={idx} style={[styles.statTile, subTab === 'captain' && { width: '23.5%' }]}>
                       <Text style={styles.statValue}>{stat.value}</Text>
                       <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  ))}
               </View>

               {/* Add dedicated Banner for Fielding/Captain selection */}
               {(subTab === 'fielding' || subTab === 'captain') && (
                 <View style={[styles.adBanner, { backgroundColor: '#E0F2FE' }]}>
                    <Image source={{ uri: 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg' }} style={styles.adImage} />
                    <View style={styles.adOverlay}>
                       <Text style={styles.adTitle}>Find products from the{'\n'}<Text style={styles.adTitleBold}>Best Collection</Text></Text>
                       <TouchableOpacity style={[styles.adBtn, { backgroundColor: '#2563EB' }]}><Text style={styles.adBtnText}>Shop now</Text></TouchableOpacity>
                    </View>
                 </View>
               )}

               {subTab === 'captain' && (
                 <View style={styles.captainFooter}>
                    <Text style={styles.ballTypeLabel}>Leather ball 🎾</Text>
                    
                    <View style={styles.adBanner}>
                        <Image source={{ uri: 'https://images.pexels.com/photos/159443/pexels-photo-159443.jpeg' }} style={styles.adImage} />
                        <View style={styles.adOverlay}>
                          <Text style={styles.adTitle}>Beat the summer!{'\n'}<Text style={styles.adTitleBold}>Blinkit</Text></Text>
                          <TouchableOpacity style={[styles.adBtn, { backgroundColor: '#111827' }]}><Text style={styles.adBtnText}>Order Now</Text></TouchableOpacity>
                        </View>
                    </View>
                 </View>
               )}

               {(subTab !== 'fielding' && subTab !== 'captain') && (
                 <View style={styles.adBanner}>
                    <Image source={{ uri: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg' }} style={styles.adImage} />
                    <View style={styles.adOverlay}>
                       <Text style={styles.adTitle}>Amazon Prime{'\n'}<Text style={styles.adTitleBold}>Join Prime at ₹125/month*</Text></Text>
                       <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Install now</Text></TouchableOpacity>
                    </View>
                 </View>
               )}
            </View>
          </View>
        );
      case 'highlights':
        return (
          <View style={styles.tabContent}>
             <View style={styles.placeholderIconArea}><PlayCircle size={48} color="#01b854" /></View>
            <Text style={styles.placeholderTitle}>Match Highlights</Text>
            <Text style={styles.placeholderDesc}>Relive the best moments from recent matches. Watch videos and view gallery of top plays.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderActionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isActionModalVisible}
      onRequestClose={() => setIsActionModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsActionModalVisible(false)}
      >
        <View style={styles.actionModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>What would you like to do?</Text>
            <TouchableOpacity onPress={() => setIsActionModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalOptions}>
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setIsSelectingTeams(true);
                setIsActionModalVisible(false);
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Swords size={20} color="#01b854" />
              </View>
              <Text style={styles.optionText}>Start a match</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setIsLiveSession(true);
                setIsSelectingTeams(true);
                setIsActionModalVisible(false);
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FEF2F2' }]}>
                <Radio size={20} color="#EF4444" />
              </View>
              <Text style={styles.optionText}>Go live</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => setIsActionModalVisible(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Trophy size={20} color="#F97316" />
              </View>
              <Text style={styles.optionText}>Start a tournament/Series</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setActiveTab('teams');
                setIsActionModalVisible(false);
                setTimeout(() => setIsCreateTeamModalVisible(true), 100);
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Users size={20} color="#3B82F6" />
              </View>
              <Text style={styles.optionText}>Add a team</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity style={styles.modalOption} onPress={() => setIsActionModalVisible(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#F3F4F6' }]}>
                <HelpCircle size={20} color="#6B7280" />
              </View>
              <Text style={styles.optionText}>Get help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const content = (
    <View style={styles.container}>
      {!isScoring && (
        <View style={styles.tabsStickyWrapper}>
          <View style={styles.tabsInnerRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={{ flex: 1 }}>
            {TABS.map((tab) => (
              <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => { setActiveTab(tab.id); setSubTab(tab.id === 'stats' ? 'batting' : tab.id === 'teams' ? 'your' : 'all'); }}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.plusIconWrapper}
              onPress={() => setIsActionModalVisible(true)}
            >
              <Plus size={24} color="#01b854" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {isScoring ? renderLiveScoring() : (isSearchingOfficial ? renderOfficialSearch() : (isConfiguringOfficials ? renderMatchOfficials() : (isSelectingOpeners ? renderOpeningSelection() : (isConfiguringToss ? renderTossConfiguration() : (isConfiguringMatch ? renderMatchConfiguration() : (isSelectingTeams ? (isSelectingPlayers ? renderPlayerSelection() : renderTeamSelection()) : renderContent()))))))}
        </View>
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') { return <WebLayout noCard>{content}{renderActionModal()}{renderCreateTeamModal()}{renderQrModal()}{renderSuccessModal()}{renderAddPlayerView()}{renderAddMemberModal()}{renderContactPicker()}</WebLayout>; }
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>{content}{renderActionModal()}{renderCreateTeamModal()}{renderQrModal()}{renderSuccessModal()}{renderAddPlayerView()}{renderAddMemberModal()}{renderContactPicker()}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabsStickyWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10 },
  tabsInnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrapper: { paddingHorizontal: 24, borderLeftWidth: 1, borderLeftColor: '#E5E7EB', height: '100%', justifyContent: 'center' },
  heroLabel: { fontSize: 12, fontWeight: '800', color: '#01b854', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabsScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, marginRight: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#B91C1C' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '800' },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 60 },
  contentContainer: { flex: 1 },
  subTabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', marginHorizontal: 20, marginTop: 20, borderRadius: 12, padding: 2, gap: 2 },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  subTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  subTabTextActive: { color: '#111827' },
  matchesList: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20, gap: 12 },
  matchCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  matchType: { fontSize: 14, fontWeight: '600', color: '#374151' },
  matchTournament: { color: '#9CA3AF', fontWeight: '400' },
  matchMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeUpcoming: { backgroundColor: '#F1F5F9' },
  statusBadgeLive: { backgroundColor: '#F0FDF4', flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadgeResult: { backgroundColor: '#F0F9FF' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextResult: { color: '#0369A1' },
  statusBadgeTextUpcoming: { color: '#64748B' },
  statusBadgeTextLive: { color: '#15803D' },
  matchTeams: { marginTop: 16, marginBottom: 8 },
  matchTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  teamScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  teamOversText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { fontSize: 15, color: '#111827' },
  teamNameBold: { fontWeight: '700', fontSize: 16 },
  teamScore: { fontSize: 14, color: '#4B5563' },
  teamScoreBold: { fontWeight: '700', color: '#111827', fontSize: 16 },
  matchMessage: { fontSize: 13, color: '#4B5563', fontStyle: 'italic', marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  matchResultText: { fontSize: 13, color: '#059669', fontWeight: '600', marginBottom: 12 },
  matchFooter: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  footerLink: { fontSize: 13, color: '#0D9488', fontWeight: '600' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  liveActionBtnText: {
    color: '#0D9488',
    fontSize: 14,
    fontWeight: '600',
  },
  tournamentCard: { backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  imageContainer: { height: 160, position: 'relative' },
  tournamentImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  crownBadge: { position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderRadius: 6, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
  ongoingBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#B91C1C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ongoingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  tournamentTitleOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  tournamentInfo: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  tournamentMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  followLink: { color: '#0D9488', fontWeight: '700', fontSize: 14 },
  teamCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  teamAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  teamImage: { width: '100%', height: '100%' },
  teamInitials: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  teamContent: { flex: 1, marginLeft: 16, flexDirection: 'row', alignItems: 'center' },
  teamTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  teamMetaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 12, color: '#6B7280' },
  captainIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' },
  captainIconText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginVertical: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', outlineStyle: 'none' as any },
  statsPromoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsPromoText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  analyzeBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  analyzeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsFilterBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  statPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 99, backgroundColor: '#E5E7EB' },
  statPillActive: { backgroundColor: '#F59E0B' },
  statPillText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  statPillTextActive: { color: '#FFFFFF' },
  statsContent: { paddingHorizontal: 20 },
  statsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  compareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  compareBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { width: '19%', backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  captainFooter: { marginTop: 10 },
  ballTypeLabel: { fontSize: 14, color: '#111827', fontWeight: '600', marginBottom: 10 },
  adBanner: { marginVertical: 20, borderRadius: 20, overflow: 'hidden', height: 120, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' },
  adImage: { width: '100%', height: '100%', opacity: 0.6 },
  adOverlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'center' },
  adTitle: { fontSize: 16, color: '#111827', lineHeight: 20 },
  adTitleBold: { fontWeight: '900', fontSize: 20 },
  adBtn: { backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
  adBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tabContent: { paddingVertical: 70, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  placeholderIconArea: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  placeholderTitle: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 12, textAlign: 'center' },
  placeholderDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, maxWidth: 340, marginBottom: 32 },
  placeholderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#043529', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  placeholderBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  plusIconWrapper: {
    paddingHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAF7',
    gap: 16,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  selectionView: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    flex: 1,
    minHeight: 400,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  teamSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  teamSlot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#F9FAF7',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  teamSlotFilled: {
    borderStyle: 'solid',
    borderColor: '#01b854',
    backgroundColor: '#FFFFFF',
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  slotAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    textAlign: 'center',
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxWidth: 450,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 25,
  },
  formGroup: {
    marginBottom: 20,
  },
  slotAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  slotName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  startMatchBtn: {
    backgroundColor: '#01b854',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  startMatchBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  selectBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  createTeamCard: {
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    backgroundColor: '#F0FDF4',
  },
  createTeamIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  createTeamText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 2,
  },
  createTeamSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  createTeamModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 450,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  submitBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  qrModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxWidth: 450,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  qrBody: {
    alignItems: 'center',
  },
  qrCard: {
    width: '100%',
    backgroundColor: '#F9FAF7',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  teamAvatarQr: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamInitialsQr: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  qrTeamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  qrTeamMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  downloadBtn: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '90%',
    maxWidth: 380,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 25,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successCloseBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  successCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  loginBtnTextInline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  addPlayerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '95%',
    maxWidth: 800,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 25,
  },
  addPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeTeamInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  teamAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  teamInitialsLarge: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  activeTeamName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  activeTeamMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -20,
    marginBottom: 24,
  },
  addPlayerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  addPlayerScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  inviteContainer: {
    gap: 16,
    marginBottom: 10,
  },
  inviteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  inviteLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  linkIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: '#149D8F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manualOptionsContainer: {
    marginTop: 10,
  },
  manualOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignAdminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  adminBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '700',
  },
  adminBannerText: {
    fontSize: 14,
    color: '#111827',
  },
  promoBanner: {
    backgroundColor: '#149D8F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 1,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoIconPlaceholder: {
    width: 40,
    height: 30,
    backgroundColor: '#FFFFFF33',
    borderRadius: 4,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  squadSection: {
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  playerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  playerAvatar: {
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  squadFooter: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#71717A',
  },
  footerTabActive: {
    backgroundColor: '#149D8F',
  },
  footerTabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footerTabTextActive: {
    fontWeight: '800',
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  profileNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rankBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rankBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  insightsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#149D8F',
    paddingVertical: 10,
    borderRadius: 8,
  },
  insightsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileTabsFixed: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: 12,
  },
  profileSubTab: {
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  profileSubTabActive: {
    borderBottomColor: '#B91C1C',
  },
  profileSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  profileSubTabTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  profilePlaceholder: {
    alignItems: 'center',
    paddingTop: 40,
  },
  placeholderImg: {
    width: 200,
    height: 150,
    borderRadius: 16,
    marginBottom: 24,
    opacity: 0.8,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  placeholderDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  performanceChart: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  trophyBox: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyYear: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '800',
    marginTop: 12,
  },
  trophyEvent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#9CA3AF',
    width: 20,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  addMemberSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  leaderboardSubTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  lbSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  lbSubTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lbSubTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  lbSubTabTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 16,
  },
  playerSelectRowActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDF4',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  selectionSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectionFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  vsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
  },
  vsTeam: {
    flex: 1,
    alignItems: 'center',
  },
  vsName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  vsPlayers: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  vsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vsBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#EF4444',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typePillActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0D9488',
  },
  typePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typePillTextActive: {
    color: '#0D9488',
  },
  configInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  hundredInfo: {
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hundredText: {
    color: '#EA580C',
    fontWeight: '700',
    textAlign: 'center',
  },
  ballTypes: {
    flexDirection: 'row',
    gap: 12,
  },
  ballTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  ballTypeBtnActive: {
    backgroundColor: '#111827',
  },
  ballText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
  openerSection: {
    marginBottom: 32,
  },
  openerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playingXiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerGridTile: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  playerGridTileActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0D9488',
    borderWidth: 2,
  },
  playerGridName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  playerGridNameActive: {
    color: '#0D9488',
  },
  warningText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  scoringContainer: {
    flex: 1,
    padding: 16,
  },
  mainScoreboard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  scoringTeamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bigRuns: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111827',
  },
  overText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    marginBottom: 8,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  crrBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  crrLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  crrValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  targetRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 24,
  },
  targetText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  playerStatsRow: {
    flexDirection: 'column',
    gap: 20,
    marginBottom: 24,
  },
  batsmanCol: {
    flex: 1.5,
  },
  bowlerCol: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  statsHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  statsHeadValues: {
    flexDirection: 'row',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  statsValues: {
    flexDirection: 'row',
    gap: 12,
  },
  statsValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    width: 20,
    textAlign: 'center',
  },
  statsHeaderTextFixed: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    width: 22,
    textAlign: 'center',
  },
  statsValueTextFixed: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    width: 22,
    textAlign: 'center',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  manualEntryForm: {
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addPlayerMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  addPlayerMiniText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  timelineContainer: {
    height: 48,
    justifyContent: 'center',
  },
  ballCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballWicket: {
    backgroundColor: '#EF4444',
  },
  ballBoundary: {
    backgroundColor: '#0D9488',
  },
  ballLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4B5563',
  },
  scoringWheel: {
    marginTop: 24,
    gap: 12,
  },
  wheelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  runBtn: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  runBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  boundaryBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0D9488',
  },
  boundaryBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D9488',
  },
  wicketBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  extraRow: {
    flexDirection: 'row',
    gap: 12,
  },
  extraBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  extraBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  scoringActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionIconBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: '22%',
  },
  actionIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 6,
  },
  contactItem: {
    width: 80,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playerTileActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0D9488',
    borderWidth: 2,
  },
  playerTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
  },
  playerTileNameActive: {
    color: '#0D9488',
  },
  contactItem: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  startMatchMainBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startMatchMainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  wagonWheelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
  },
  wagonWheelDesc: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  toggleBg: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 4,
  },
  toggleBgActive: {
    backgroundColor: '#0D9488',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
  pitchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pitchBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0D9488',
  },
  pitchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pitchTextActive: {
    color: '#0D9488',
  },
  pickerWrapper: {
    position: 'relative',
  },
  pickerIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  officialsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  officialsTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  officialIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  officialsSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  officialGroupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  officialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  officialInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  officialValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 16,
  },
  officialPlaceholderText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  officialResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  resultPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  resultRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  noResultArea: {
    alignItems: 'center',
    paddingTop: 40,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
    marginTop: 16,
  },
  noResultSub: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  addNewOfficialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  addNewOfficialText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitial: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 16,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  contactPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  imagePickerBtn: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  imagePickerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  imagePickerPreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  removeImageText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownTrigger: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  statesDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  stateItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stateItemText: {
    fontSize: 14,
    color: '#374151',
  },
  coin: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F59E0B',
    padding: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
  },
  coinText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FEF3C7',
  },
  tapToFlipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tossWinnerSelection: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    width: '100%',
  },
  tossTeamBtn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  tossTeamBtnActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
  },
  tossTeamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
  },
  tossTeamNameActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    width: '100%',
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  decisionBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  decisionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B7280',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
  overSummaryBanner: {
    backgroundColor: '#111827',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  overSummaryText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreSummaryText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  settingsBtnSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  settingSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderTextMenu: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  sectionOptionsList: {
    backgroundColor: '#FFFFFF',
  },
  settingOptionRow: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAF7',
  },
  settingOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  sheetGridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sheetIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sheetItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 14,
  },
  showLessBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  showLessText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  extraSelectorContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  extraSelectorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  extraSelectorDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  extraRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  extraRunTile: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraRunTileText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  cancelExtraBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelExtraText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addPlayerMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    marginTop: 16,
    justifyContent: 'center',
  },
  addPlayerMiniText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
});
