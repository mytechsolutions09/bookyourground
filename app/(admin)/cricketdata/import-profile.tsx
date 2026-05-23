import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  Image,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Save,
  Plus,
  X,
  FileText,
  ChevronRight,
  TrendingUp,
  User,
  ShieldCheck,
  Award,
  Zap,
  Target
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

// Fallback to Google API key from env
const GEMINI_API_KEY =
  (process.env as any).EXPO_PUBLIC_VITE_GEMINI_API ||
  (process.env as any).VITE_GEMINI_API ||
  (process.env as any).EXPO_PUBLIC_VITE_GEMINI_API_KEY ||
  (process.env as any).VITE_GEMINI_API_KEY ||
  (process.env as any).EXPO_PUBLIC_GEMINI_API_KEY ||
  "AIzaSyBvYuX2b5mYtLLEDiImkHG3aozrwu64A3A";

const TABS = [
  { id: 'profile', label: '1. Basic Profile', desc: 'Name, style & roles' },
  { id: 'batting', label: '2. Batting Stats', desc: 'Innings, runs, average & SR' },
  { id: 'bowling', label: '3. Bowling Stats', desc: 'Overs, wickets & economy' },
  { id: 'fielding', label: '4. Fielding Stats', desc: 'Catches, run-outs & stumps' },
  { id: 'captain', label: '5. Captain Stats', desc: 'Matches captained & wins' }
];

const initialBatting = {
  matches_played: 0,
  innings_batted: 0,
  total_runs: 0,
  highest_score: 0,
  average: 0.0,
  strike_rate: 0.0,
  fifties: 0,
  hundreds: 0,
  fours_hit: 0,
  sixes_hit: 0,
  not_outs: 0,
  balls_faced: 0,
  thirties: 0,
  ducks: 0,
  matches_won: 0,
  matches_lost: 0
};

const initialBowling = {
  innings_bowled: 0,
  total_wickets: 0,
  overs_bowled: 0.0,
  runs_conceded: 0,
  economy_rate: 0.0,
  best_bowling: '0/0',
  best_bowling_wickets: 0,
  best_bowling_runs: 0,
  maidens: 0,
  five_wicket_hauls: 0,
  three_wicket_hauls: 0,
  wides_conceded: 0,
  no_balls_conceded: 0,
  dot_balls_bowled: 0,
  fours_conceded: 0,
  sixes_conceded: 0
};

const initialFielding = {
  total_catches: 0,
  stumpings: 0,
  run_outs: 0,
  caught_and_bowled: 0,
  assisted_run_outs: 0,
  byes_conceded: 0
};

const initialCaptain = {
  matches_captained: 0,
  matches_won_as_captain: 0,
  matches_lost_as_captain: 0,
  matches_tied_as_captain: 0,
  matches_abandoned_as_captain: 0
};

export default function AdminImportProfile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Loading states
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [parsingTab, setParsingTab] = useState<string | null>(null);
  const [uploadingTab, setUploadingTab] = useState<string | null>(null);
  const [isAiUsed, setIsAiUsed] = useState(false);
  const [saving, setSaving] = useState(false);

  // DB Options
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Image assets
  const [images, setImages] = useState<Record<string, string>>({});
  const [base64Images, setBase64Images] = useState<Record<string, { base64Data: string; mimeType: string }>>({});
  const [successTabs, setSuccessTabs] = useState<Record<string, boolean>>({});

  const [activeBallType, setActiveBallType] = useState<'overall' | 'leather' | 'tennis' | 'other'>('overall');

  // Dynamic player profile states
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    player_type: 'All-rounder', // 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicketkeeper'
    batting_style: 'Right-hand bat', // 'Right-hand bat' | 'Left-hand bat'
    bowling_style: 'Right-arm medium',
    team_name: '',
    tags: [] as string[]
  });

  // Dynamic stats states by ball type
  const [battingData, setBattingData] = useState<Record<string, typeof initialBatting>>({
    overall: { ...initialBatting },
    leather: { ...initialBatting },
    tennis: { ...initialBatting },
    other: { ...initialBatting }
  });

  const [bowlingData, setBowlingData] = useState<Record<string, typeof initialBowling>>({
    overall: { ...initialBowling },
    leather: { ...initialBowling },
    tennis: { ...initialBowling },
    other: { ...initialBowling }
  });

  const [fieldingData, setFieldingData] = useState<Record<string, typeof initialFielding>>({
    overall: { ...initialFielding },
    leather: { ...initialFielding },
    tennis: { ...initialFielding },
    other: { ...initialFielding }
  });

  const [captainData, setCaptainData] = useState<Record<string, typeof initialCaptain>>({
    overall: { ...initialCaptain },
    leather: { ...initialCaptain },
    tennis: { ...initialCaptain },
    other: { ...initialCaptain }
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      if (data) {
        setTeams(data);
        if (data.length > 0) setSelectedTeamId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleImageUpload = (tabId: string) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingTab(tabId);
        const reader = new FileReader();
        reader.onload = async () => {
          const previewUrl = reader.result as string;
          const base64Data = previewUrl.split(',')[1];
          const mimeType = file.type;

          setImages(prev => ({ ...prev, [tabId]: previewUrl }));
          setBase64Images(prev => ({ ...prev, [tabId]: { base64Data, mimeType } }));

          // Automatically trigger Gemini AI parser
          await parseImageWithAI(tabId, base64Data, mimeType);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const parseImageWithAI = async (tabId: string, base64Data: string, mimeType: string) => {
    setParsingTab(tabId);
    try {
      let prompt = "";
      if (tabId === 'profile') {
        prompt = `Extract the following player profile details from this image:
- full_name (string: player's name, e.g. "Rahul Sharma")
- batting_style (string: 'Right-hand bat', 'Left-hand bat', or 'N/A')
- bowling_style (string: 'Right-arm fast', 'Right-arm medium', 'Right-arm offbreak', 'Right-arm legbreak', 'Left-arm fast', 'Left-arm orthodox', 'Left-arm chinaman', or 'N/A')
- player_type (string: 'Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper')
- team_name (string: current team, e.g. "Delhi Mavericks" or "N/A")
- tags (array of strings, e.g. ["Hard Hitter", "Classicist", "Accumulator", "Spearhead", "Economist", "Steady Batter"])

Return JSON matching exactly:
{
  "full_name": "Name",
  "batting_style": "Style",
  "bowling_style": "Style",
  "player_type": "Type",
  "team_name": "Team",
  "tags": ["Tag1"]
}`;
      } else if (tabId === 'batting') {
        prompt = `Analyze the uploaded cricket stats sheet and extract batting stats partitioned by ball type/format (OVERALL, LEATHER BALL, TENNIS BALL, and OTHER BALL).
For each format, locate the main "Total" or summary row and extract:
- matches_played (number, label: Mat)
- innings_batted (number, label: Inns)
- not_outs (number, label: NO)
- total_runs (number, label: Runs)
- highest_score (number, label: HS. Ignore asterisks or symbols, e.g. "195*" -> 195)
- average (number, label: Avg)
- strike_rate (number, label: SR)
- fifties (number, label: 50s)
- hundreds (number, label: 100s)
- fours_hit (number, label: 4s)
- sixes_hit (number, label: 6s)
- thirties (number, label: 30s)
- ducks (number, label: Ducks or Ducks / Duck)
- matches_won (number, label: Won)
- matches_lost (number, label: Loss)

Return a single JSON matching exactly this structure:
{
  "overall": {
    "matches_played": 0, "innings_batted": 0, "not_outs": 0, "total_runs": 0, "highest_score": 0,
    "average": 0.0, "strike_rate": 0.0, "fifties": 0, "hundreds": 0, "fours_hit": 0, "sixes_hit": 0, "thirties": 0,
    "ducks": 0, "matches_won": 0, "matches_lost": 0
  },
  "leather": {
    "matches_played": 0, "innings_batted": 0, "not_outs": 0, "total_runs": 0, "highest_score": 0,
    "average": 0.0, "strike_rate": 0.0, "fifties": 0, "hundreds": 0, "fours_hit": 0, "sixes_hit": 0, "thirties": 0,
    "ducks": 0, "matches_won": 0, "matches_lost": 0
  },
  "tennis": {
    "matches_played": 0, "innings_batted": 0, "not_outs": 0, "total_runs": 0, "highest_score": 0,
    "average": 0.0, "strike_rate": 0.0, "fifties": 0, "hundreds": 0, "fours_hit": 0, "sixes_hit": 0, "thirties": 0,
    "ducks": 0, "matches_won": 0, "matches_lost": 0
  },
  "other": {
    "matches_played": 0, "innings_batted": 0, "not_outs": 0, "total_runs": 0, "highest_score": 0,
    "average": 0.0, "strike_rate": 0.0, "fifties": 0, "hundreds": 0, "fours_hit": 0, "sixes_hit": 0, "thirties": 0,
    "ducks": 0, "matches_won": 0, "matches_lost": 0
  }
}`;
      } else if (tabId === 'bowling') {
        prompt = `Analyze the uploaded cricket stats sheet and extract bowling stats partitioned by ball type/format (OVERALL, LEATHER BALL, TENNIS BALL, and OTHER BALL).
For each format, locate the main "Total" or summary row and extract:
- innings_bowled (number)
- total_wickets (number)
- overs_bowled (number)
- runs_conceded (number)
- economy_rate (number)
- best_bowling (string, e.g. "3/15")
- best_bowling_wickets (number)
- best_bowling_runs (number)
- maidens (number)
- five_wicket_hauls (number)
- three_wicket_hauls (number)
- wides_conceded (number)
- no_balls_conceded (number)
- dot_balls_bowled (number)
- fours_conceded (number)
- sixes_conceded (number)

Return a single JSON matching exactly this structure:
{
  "overall": {
    "innings_bowled": 0, "total_wickets": 0, "overs_bowled": 0.0, "runs_conceded": 0, "economy_rate": 0.0,
    "best_bowling": "0/0", "best_bowling_wickets": 0, "best_bowling_runs": 0, "maidens": 0, "five_wicket_hauls": 0,
    "three_wicket_hauls": 0, "wides_conceded": 0, "no_balls_conceded": 0, "dot_balls_bowled": 0, "fours_conceded": 0, "sixes_conceded": 0
  },
  "leather": {
    "innings_bowled": 0, "total_wickets": 0, "overs_bowled": 0.0, "runs_conceded": 0, "economy_rate": 0.0,
    "best_bowling": "0/0", "best_bowling_wickets": 0, "best_bowling_runs": 0, "maidens": 0, "five_wicket_hauls": 0,
    "three_wicket_hauls": 0, "wides_conceded": 0, "no_balls_conceded": 0, "dot_balls_bowled": 0, "fours_conceded": 0, "sixes_conceded": 0
  },
  "tennis": {
    "innings_bowled": 0, "total_wickets": 0, "overs_bowled": 0.0, "runs_conceded": 0, "economy_rate": 0.0,
    "best_bowling": "0/0", "best_bowling_wickets": 0, "best_bowling_runs": 0, "maidens": 0, "five_wicket_hauls": 0,
    "three_wicket_hauls": 0, "wides_conceded": 0, "no_balls_conceded": 0, "dot_balls_bowled": 0, "fours_conceded": 0, "sixes_conceded": 0
  },
  "other": {
    "innings_bowled": 0, "total_wickets": 0, "overs_bowled": 0.0, "runs_conceded": 0, "economy_rate": 0.0,
    "best_bowling": "0/0", "best_bowling_wickets": 0, "best_bowling_runs": 0, "maidens": 0, "five_wicket_hauls": 0,
    "three_wicket_hauls": 0, "wides_conceded": 0, "no_balls_conceded": 0, "dot_balls_bowled": 0, "fours_conceded": 0, "sixes_conceded": 0
  }
}`;
      } else if (tabId === 'fielding') {
        prompt = `Analyze the uploaded cricket stats sheet and extract fielding stats partitioned by ball type/format (OVERALL, LEATHER BALL, TENNIS BALL, and OTHER BALL).
For each format, locate the main summary stats and extract:
- total_catches (number, label: Catches)
- caught_and_bowled (number, label: C.B or Caught & Bowled)
- run_outs (number, label: R/O or Run Outs)
- stumpings (number, label: St or Stumpings)
- assisted_run_outs (number, label: Asst. R/O or Assisted Run Outs)
- byes_conceded (number, label: Byes)

Return a single JSON matching exactly this structure:
{
  "overall": { "total_catches": 0, "caught_and_bowled": 0, "run_outs": 0, "stumpings": 0, "assisted_run_outs": 0, "byes_conceded": 0 },
  "leather": { "total_catches": 0, "caught_and_bowled": 0, "run_outs": 0, "stumpings": 0, "assisted_run_outs": 0, "byes_conceded": 0 },
  "tennis": { "total_catches": 0, "caught_and_bowled": 0, "run_outs": 0, "stumpings": 0, "assisted_run_outs": 0, "byes_conceded": 0 },
  "other": { "total_catches": 0, "caught_and_bowled": 0, "run_outs": 0, "stumpings": 0, "assisted_run_outs": 0, "byes_conceded": 0 }
}`;
      } else if (tabId === 'captain') {
        prompt = `Analyze the uploaded cricket stats sheet and extract captaincy stats partitioned by ball type/format (OVERALL, LEATHER BALL, TENNIS BALL, and OTHER BALL).
For each format, locate the main summary stats and extract:
- matches_captained (number)
- matches_won_as_captain (number)
- matches_lost_as_captain (number)
- matches_tied_as_captain (number)
- matches_abandoned_as_captain (number)

Return a single JSON matching exactly this structure:
{
  "overall": {
    "matches_captained": 0, "matches_won_as_captain": 0, "matches_lost_as_captain": 0,
    "matches_tied_as_captain": 0, "matches_abandoned_as_captain": 0
  },
  "leather": {
    "matches_captained": 0, "matches_won_as_captain": 0, "matches_lost_as_captain": 0,
    "matches_tied_as_captain": 0, "matches_abandoned_as_captain": 0
  },
  "tennis": {
    "matches_captained": 0, "matches_won_as_captain": 0, "matches_lost_as_captain": 0,
    "matches_tied_as_captain": 0, "matches_abandoned_as_captain": 0
  },
  "other": {
    "matches_captained": 0, "matches_won_as_captain": 0, "matches_lost_as_captain": 0,
    "matches_tied_as_captain": 0, "matches_abandoned_as_captain": 0
  }
}`;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from AI");

      const data = JSON.parse(text.trim());
      updateStateWithParsedData(tabId, data);
      setSuccessTabs(prev => ({ ...prev, [tabId]: true }));
      setIsAiUsed(true);
    } catch (err: any) {
      console.error('AI Parsing failed:', err);
      alert(`AI stats sheet scanning failed: ${err.message || 'Please check your API key and connection.'}`);
    } finally {
      setParsingTab(null);
      setUploadingTab(null);
    }
  };

  const updateStateWithParsedData = (tabId: string, data: any) => {
    if (tabId === 'profile') {
      setProfileData(prev => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        phone: data.phone || prev.phone,
        player_type: data.player_type || prev.player_type,
        batting_style: data.batting_style || prev.batting_style,
        bowling_style: data.bowling_style || prev.bowling_style,
        team_name: data.team_name || prev.team_name,
        tags: Array.isArray(data.tags) ? data.tags : prev.tags
      }));
    } else if (tabId === 'batting') {
      setBattingData(prev => {
        const next = { ...prev };
        for (const type of ['overall', 'leather', 'tennis', 'other']) {
          if (data[type]) {
            next[type] = { ...next[type], ...data[type] };
          } else if (type === 'overall' && !data.overall && (data.matches_played !== undefined || data.total_runs !== undefined)) {
            next.overall = { ...next.overall, ...data };
          }
        }
        return next;
      });
    } else if (tabId === 'bowling') {
      setBowlingData(prev => {
        const next = { ...prev };
        for (const type of ['overall', 'leather', 'tennis', 'other']) {
          if (data[type]) {
            next[type] = { ...next[type], ...data[type] };
          } else if (type === 'overall' && !data.overall && data.total_wickets !== undefined) {
            next.overall = { ...next.overall, ...data };
          }
        }
        return next;
      });
    } else if (tabId === 'fielding') {
      setFieldingData(prev => {
        const next = { ...prev };
        for (const type of ['overall', 'leather', 'tennis', 'other']) {
          if (data[type]) {
            next[type] = { ...next[type], ...data[type] };
          } else if (type === 'overall' && !data.overall && data.total_catches !== undefined) {
            next.overall = { ...next.overall, ...data };
          }
        }
        return next;
      });
    } else if (tabId === 'captain') {
      setCaptainData(prev => {
        const next = { ...prev };
        for (const type of ['overall', 'leather', 'tennis', 'other']) {
          if (data[type]) {
            next[type] = { ...next[type], ...data[type] };
          } else if (type === 'overall' && !data.overall && data.matches_captained !== undefined) {
            next.overall = { ...next.overall, ...data };
          }
        }
        return next;
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.full_name) {
      alert("Please upload a Profile image or enter the Player Name manually.");
      return;
    }

    try {
      setSaving(true);

      // 1. Generate player UUID
      const profileId = crypto.randomUUID();
      let avatarUrl = "";

      // 3. Save into profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          full_name: profileData.full_name,
          phone: profileData.phone || null,
          avatar_url: avatarUrl || null,
          role: 'user',
          team_name: profileData.team_name || null,
          player_type: profileData.player_type,
          batting_style: profileData.batting_style,
          bowling_style: profileData.bowling_style
        });

      if (profileError) throw profileError;

      // 4. Save stats in team_members table (Overall stats)
      const memberId = crypto.randomUUID();
      const totalCatches = Number(fieldingData.overall.total_catches) || 0;
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          id: memberId,
          team_id: selectedTeamId,
          profile_id: profileId,
          player_name: profileData.full_name,
          player_phone: profileData.phone || null,
          role: captainData.overall.matches_captained > 0 ? 'captain' : 'player',
          status: 'accepted',
          matches_played: Number(battingData.overall.matches_played) || 0,
          total_runs: Number(battingData.overall.total_runs) || 0,
          total_wickets: Number(bowlingData.overall.total_wickets) || 0,
          total_catches: totalCatches,
          best_score: Number(battingData.overall.highest_score) || 0,
          best_bowling: bowlingData.overall.best_bowling || '0/0',
          strike_rate: Number(battingData.overall.strike_rate) || 0,
          economy_rate: Number(bowlingData.overall.economy_rate) || 0,
          innings_batted: Number(battingData.overall.innings_batted) || 0,
          not_outs: Number(battingData.overall.not_outs) || 0,
          highest_score: Number(battingData.overall.highest_score) || 0,
          thirties: Number(battingData.overall.thirties) || 0,
          fifties: Number(battingData.overall.fifties) || 0,
          hundreds: Number(battingData.overall.hundreds) || 0,
          fours_hit: Number(battingData.overall.fours_hit) || 0,
          sixes_hit: Number(battingData.overall.sixes_hit) || 0,
          balls_faced: Number(battingData.overall.balls_faced) || 0,
          innings_bowled: Number(bowlingData.overall.innings_bowled) || 0,
          overs_bowled: Number(bowlingData.overall.overs_bowled) || 0,
          maidens: Number(bowlingData.overall.maidens) || 0,
          runs_conceded: Number(bowlingData.overall.runs_conceded) || 0,
          five_wicket_hauls: Number(bowlingData.overall.five_wicket_hauls) || 0,
          best_bowling_wickets: Number(bowlingData.overall.best_bowling_wickets) || 0,
          best_bowling_runs: Number(bowlingData.overall.best_bowling_runs) || 0,
          run_outs: Number(fieldingData.overall.run_outs) || 0,
          stumpings: Number(fieldingData.overall.stumpings) || 0,
          matches_captained: Number(captainData.overall.matches_captained) || 0,
          matches_won_as_captain: Number(captainData.overall.matches_won_as_captain) || 0,
          matches_lost_as_captain: Number(captainData.overall.matches_lost_as_captain) || 0,
          matches_tied_as_captain: Number(captainData.overall.matches_tied_as_captain) || 0,
          matches_abandoned_as_captain: Number(captainData.overall.matches_abandoned_as_captain) || 0
        });

      if (memberError) throw memberError;

      // 5. Save ball-specific stats in player_ball_stats table (leather, tennis, other)
      const ballTypes = ['leather', 'tennis', 'other'] as const;
      for (const type of ballTypes) {
        const b = battingData[type];
        const w = bowlingData[type];
        const f = fieldingData[type];
        const c = captainData[type];

        const { error: ballStatsError } = await supabase
          .from('player_ball_stats')
          .insert({
            member_id: memberId,
            ball_type: type,
            matches_played: Number(b.matches_played) || 0,
            innings_batted: Number(b.innings_batted) || 0,
            not_outs: Number(b.not_outs) || 0,
            total_runs: Number(b.total_runs) || 0,
            highest_score: Number(b.highest_score) || 0,
            strike_rate: Number(b.strike_rate) || 0,
            thirties: Number(b.thirties) || 0,
            fifties: Number(b.fifties) || 0,
            hundreds: Number(b.hundreds) || 0,
            fours_hit: Number(b.fours_hit) || 0,
            sixes_hit: Number(b.sixes_hit) || 0,
            balls_faced: Number(b.balls_faced) || 0,
            ducks: Number(b.ducks) || 0,
            matches_won: Number(b.matches_won) || 0,
            matches_lost: Number(b.matches_lost) || 0,
            innings_bowled: Number(w.innings_bowled) || 0,
            overs_bowled: Number(w.overs_bowled) || 0,
            maidens: Number(w.maidens) || 0,
            runs_conceded: Number(w.runs_conceded) || 0,
            total_wickets: Number(w.total_wickets) || 0,
            best_bowling_wickets: Number(w.best_bowling_wickets) || 0,
            best_bowling_runs: Number(w.best_bowling_runs) || 0,
            economy_rate: Number(w.economy_rate) || 0,
            five_wicket_hauls: Number(w.five_wicket_hauls) || 0,
            three_wicket_hauls: Number(w.three_wicket_hauls) || 0,
            wides_conceded: Number(w.wides_conceded) || 0,
            no_balls_conceded: Number(w.no_balls_conceded) || 0,
            dot_balls_bowled: Number(w.dot_balls_bowled) || 0,
            fours_conceded: Number(w.fours_conceded) || 0,
            sixes_conceded: Number(w.sixes_conceded) || 0,
            total_catches: Number(f.total_catches) || 0,
            run_outs: Number(f.run_outs) || 0,
            stumpings: Number(f.stumpings) || 0,
            caught_and_bowled: Number(f.caught_and_bowled) || 0,
            assisted_run_outs: Number(f.assisted_run_outs) || 0,
            byes_conceded: Number(f.byes_conceded) || 0,
            matches_captained: Number(c.matches_captained) || 0,
            matches_won_as_captain: Number(c.matches_won_as_captain) || 0,
            matches_lost_as_captain: Number(c.matches_lost_as_captain) || 0,
            matches_tied_as_captain: Number(c.matches_tied_as_captain) || 0,
            matches_abandoned_as_captain: Number(c.matches_abandoned_as_captain) || 0
          });

        if (ballStatsError) throw ballStatsError;
      }

      alert(`Profile for ${profileData.full_name} saved successfully!`);
      router.push('/cricketdata/players');
    } catch (err: any) {
      console.error('Save failed:', err);
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderBallTypeSelector = () => {
    return (
      <View style={styles.ballTypeTabRow}>
        {(['overall', 'leather', 'tennis', 'other'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.ballTypeTabBtn,
              activeBallType === type && styles.activeBallTypeTabBtn
            ]}
            onPress={() => setActiveBallType(type)}
          >
            <Text
              style={[
                styles.ballTypeTabBtnText,
                activeBallType === type && styles.activeBallTypeTabBtnText
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderActiveForm = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Player Profile Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileData.full_name}
                onChangeText={t => setProfileData(p => ({ ...p, full_name: t }))}
                placeholder="Enter player's name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Phone (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.phone}
                  onChangeText={t => setProfileData(p => ({ ...p, phone: t }))}
                  placeholder="+91..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Current Team Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.team_name}
                  onChangeText={t => setProfileData(p => ({ ...p, team_name: t }))}
                  placeholder="e.g. Mavericks"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Batting Style</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.batting_style}
                  onChangeText={t => setProfileData(p => ({ ...p, batting_style: t }))}
                  placeholder="Right-hand bat"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Bowling Style</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.bowling_style}
                  onChangeText={t => setProfileData(p => ({ ...p, bowling_style: t }))}
                  placeholder="Right-arm fast"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Player Type</Text>
              <View style={styles.typeRow}>
                {['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, profileData.player_type === t && styles.activeTypeChip]}
                    onPress={() => setProfileData(p => ({ ...p, player_type: t }))}
                  >
                    <Text style={[styles.typeChipText, profileData.player_type === t && styles.activeTypeChipText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'batting':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Batting Performance Stats</Text>
            {renderBallTypeSelector()}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Matches Played</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].matches_played)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_played: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Innings Batted</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].innings_batted)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], innings_batted: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Total Runs</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].total_runs)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], total_runs: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Highest Score</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].highest_score)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], highest_score: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Batting Average</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].average)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], average: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Strike Rate</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].strike_rate)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], strike_rate: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Balls Faced</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].balls_faced)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], balls_faced: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Not Outs</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].not_outs)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], not_outs: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fifties (50s)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].fifties)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], fifties: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Hundreds (100s)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].hundreds)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], hundreds: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fours (4s)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].fours_hit)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], fours_hit: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Sixes (6s)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].sixes_hit)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], sixes_hit: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Thirties (30s)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].thirties)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], thirties: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Ducks</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].ducks)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], ducks: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Matches Won (Won)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].matches_won)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_won: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Matches Lost (Loss)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(battingData[activeBallType].matches_lost)}
                  onChangeText={t => setBattingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_lost: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 'bowling':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Bowling Performance Stats</Text>
            {renderBallTypeSelector()}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Innings Bowled</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].innings_bowled)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], innings_bowled: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Total Wickets</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].total_wickets)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], total_wickets: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Overs Bowled</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].overs_bowled)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], overs_bowled: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Runs Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].runs_conceded)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], runs_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Economy Rate</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].economy_rate)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], economy_rate: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Best Bowling (W/R)</Text>
                <TextInput
                  style={styles.textInput}
                  value={bowlingData[activeBallType].best_bowling}
                  onChangeText={t => {
                    const [wk, rn] = t.split('/');
                    setBowlingData(p => ({
                      ...p,
                      [activeBallType]: {
                        ...p[activeBallType],
                        best_bowling: t,
                        best_bowling_wickets: Number(wk) || 0,
                        best_bowling_runs: Number(rn) || 0
                      }
                    }));
                  }}
                  placeholder="3/18"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Maiden Overs</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].maidens)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], maidens: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>3 Wicket Hauls</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].three_wicket_hauls)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], three_wicket_hauls: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>5 Wicket Hauls</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].five_wicket_hauls)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], five_wicket_hauls: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Dot Balls Bowled</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].dot_balls_bowled)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], dot_balls_bowled: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Wides Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].wides_conceded)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], wides_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>No Balls Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].no_balls_conceded)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], no_balls_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fours Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].fours_conceded)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], fours_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Sixes Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(bowlingData[activeBallType].sixes_conceded)}
                  onChangeText={t => setBowlingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], sixes_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 'fielding':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Fielding Performance Stats</Text>
            {renderBallTypeSelector()}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Catches Taken</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].total_catches)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], total_catches: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Caught & Bowled (C.B)</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].caught_and_bowled)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], caught_and_bowled: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Stumpings</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].stumpings)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], stumpings: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Run Outs</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].run_outs)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], run_outs: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Assisted Run Outs</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].assisted_run_outs)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], assisted_run_outs: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Byes Conceded</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(fieldingData[activeBallType].byes_conceded)}
                  onChangeText={t => setFieldingData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], byes_conceded: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 'captain':
        return (
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Captaincy Performance Stats</Text>
            {renderBallTypeSelector()}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Matches Led</Text>
              <TextInput
                style={styles.textInput}
                value={String(captainData[activeBallType].matches_captained)}
                onChangeText={t => setCaptainData(p => ({
                  ...p,
                  [activeBallType]: { ...p[activeBallType], matches_captained: Number(t) || 0 }
                }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Wins</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(captainData[activeBallType].matches_won_as_captain)}
                  onChangeText={t => setCaptainData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_won_as_captain: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Losses</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(captainData[activeBallType].matches_lost_as_captain)}
                  onChangeText={t => setCaptainData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_lost_as_captain: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ties</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(captainData[activeBallType].matches_tied_as_captain)}
                  onChangeText={t => setCaptainData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_tied_as_captain: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Abandoned</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(captainData[activeBallType].matches_abandoned_as_captain)}
                  onChangeText={t => setCaptainData(p => ({
                    ...p,
                    [activeBallType]: { ...p[activeBallType], matches_abandoned_as_captain: Number(t) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const content = (
    <CricketSubbar>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        <View style={styles.layoutRow}>
          
          {/* Left Panel: Image Dropzones */}
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle}>AI Stats Sheet Scanning Pipeline</Text>
            
            {TABS.map((tab) => {
              const isTabActive = activeTab === tab.id;
              const hasImage = !!images[tab.id];
              const isParsing = parsingTab === tab.id;
              const isUploading = uploadingTab === tab.id;
              const isSuccess = successTabs[tab.id];

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.dropzoneCard,
                    isTabActive && styles.activeDropzoneCard,
                    hasImage && styles.hasImageCard
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <View style={styles.dropzoneHeader}>
                    <View style={styles.tabMeta}>
                      <Text style={[styles.tabLabelText, isTabActive && styles.activeTabLabelText]}>
                        {tab.label}
                      </Text>
                      <Text style={styles.tabDescText}>{tab.desc}</Text>
                    </View>
                    
                    {isSuccess && (
                      <View style={styles.checkBadge}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.checkText}>AI Parsed</Text>
                      </View>
                    )}
                  </View>

                  {/* Dropzone Image Box */}
                  <View style={styles.imageSelectorBox}>
                    {hasImage ? (
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: images[tab.id] }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            setImages(prev => {
                              const copy = { ...prev };
                              delete copy[tab.id];
                              return copy;
                            });
                            setSuccessTabs(prev => ({ ...prev, [tab.id]: false }));
                          }}
                        >
                          <X size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadArea}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleImageUpload(tab.id);
                        }}
                      >
                        {isParsing || isUploading ? (
                          <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                          <UploadCloud size={20} color="#6B7280" />
                        )}
                        <Text style={styles.uploadText}>
                          {isParsing ? 'Scanning with AI...' : isUploading ? 'Uploading image...' : 'Click to Upload Image'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Panel: Form Fields */}
          <View style={styles.rightPanel}>
            <Text style={styles.panelTitle}>Interactive Form Controls</Text>

            {/* Horizontal Tabs to toggle Right Column Fields */}
            <View style={styles.tabNavRow}>
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.navTabBtn, activeTab === t.id && styles.activeNavTabBtn]}
                  onPress={() => setActiveTab(t.id)}
                >
                  <Text style={[styles.navTabBtnText, activeTab === t.id && styles.activeNavTabBtnText]}>
                    {t.id.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Active form view */}
            <View style={styles.formContainer}>
              {renderActiveForm()}
            </View>

            {/* Target Team Assignment Selection */}
            <View style={styles.teamAssignmentSection}>
              <Text style={styles.sectionHeader}>Link to Target Platform Team</Text>
              <Text style={styles.helpText}>
                Assign this imported player profile directly to one of the active league teams:
              </Text>
              {loadingTeams ? (
                <ActivityIndicator size="small" color="#10b981" style={{ alignSelf: 'flex-start', marginVertical: 12 }} />
              ) : (
                <View style={styles.teamDropdown}>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    style={styles.dropdownElement}
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </View>
              )}
            </View>

            {/* Save Buttons Panel */}
            <View style={styles.saveActionsPanel}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                ) : (
                  <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.saveBtnText}>
                  {saving ? 'Creating Player records...' : 'Verify & Save Player Profile'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

      </ScrollView>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B45309',
    fontFamily: 'Inter',
    flex: 1,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 24,
  },
  leftPanel: {
    flex: 1,
    gap: 16,
  },
  rightPanel: {
    flex: 1.2,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  dropzoneCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    transition: 'all 0.2s',
  },
  activeDropzoneCard: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10b981',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  hasImageCard: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB'
  },
  dropzoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tabMeta: {
    flex: 1,
  },
  tabLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter',
  },
  activeTabLabelText: {
    color: '#10b981',
  },
  tabDescText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4,
  },
  checkText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065F46',
    fontFamily: 'Inter',
  },
  imageSelectorBox: {
    marginTop: 4,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAFAFA',
  },
  uploadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  imageWrapper: {
    position: 'relative',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
  },
  navTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeNavTabBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  navTabBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  activeNavTabBtnText: {
    color: '#10b981',
  },
  ballTypeTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  ballTypeTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeBallTypeTabBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  ballTypeTabBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  activeBallTypeTabBtnText: {
    color: '#10b981',
  },
  formContainer: {
    marginBottom: 24,
  },
  formSection: {
    gap: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    fontFamily: 'Inter',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1F2937',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
  inputRow: {
    flexDirection: 'row',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTypeChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  typeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  activeTypeChipText: {
    color: '#065F46',
  },
  teamAssignmentSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 8,
    marginBottom: 24,
  },
  helpText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  teamDropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdownElement: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1F2937',
    fontFamily: 'Inter',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  } as any,
  saveActionsPanel: {
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
