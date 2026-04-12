import React, { useState } from 'react';
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
} from 'react-native';
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
  Crown,
  QrCode,
  MapPin,
  User,
  Users2,
} from 'lucide-react-native';

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
    id: '3',
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
    id: '1',
    title: 'Pioneer Sports Park Practice Weekend',
    dateRange: '25 Nov, 2022 to 25 Nov, 2040',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
    hasCrown: true,
  },
  {
    id: '2',
    title: '10th Vikram Singh Cup',
    dateRange: '31 May, 2025 to 26 Apr, 2026',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
    hasCrown: false,
  }
];

const TEAMS_DATA = [
  {
    id: '1',
    name: 'Ggn Titans',
    location: 'Gurugram ( Gurgaon )',
    captain: 'Manu Yadav',
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Tennessee_Titans_logo.svg/1200px-Tennessee_Titans_logo.svg.png',
  },
  {
    id: '2',
    name: 'The Yankees',
    location: 'New Delhi',
    captain: 'Arpit Kanotra',
    initials: 'TY',
    bgColor: '#0EA5E9',
  },
  {
    id: '3',
    name: 'AHC Tigers',
    location: 'New Delhi',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/47701/tiger-animal-predator-wild-47701.jpeg',
  },
  {
    id: '4',
    name: 'Crixcus XI',
    location: 'Delhi',
    captain: 'Ashish Sharma',
    initials: 'CX',
    bgColor: '#F87171',
  },
  {
    id: '5',
    name: 'Rohtak Dhakkad XI',
    location: 'Gurugram ( Gurgaon )',
    captain: 'Ajay Singh Dalal',
    initials: 'RD',
    bgColor: '#EF4444',
  },
  {
    id: '6',
    name: 'Dollars Club',
    location: 'Delhi',
    captain: 'Arvind Upreti',
    initials: 'DC',
    bgColor: '#713F12',
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
  const { width } = useWindowDimensions();
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
          match.status === 'Result' ? styles.statusBadgeResult : styles.statusBadgeUpcoming
        ]}>
          <Text style={[
            styles.statusBadgeText,
            match.status === 'Result' ? styles.statusBadgeTextResult : styles.statusBadgeTextUpcoming
          ]}>{match.status}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.teamRow}>
          <Text style={[styles.teamName, match.status === 'Result' && styles.teamNameBold]}>{match.team1}</Text>
          {match.team1Score && (
            <Text style={styles.teamScore}>
              <Text style={styles.teamScoreBold}>{match.team1Score}</Text> {match.team1Overs}
            </Text>
          )}
        </View>
        <View style={styles.teamRow}>
          <Text style={[styles.teamName, match.status === 'Result' && styles.teamNameBold]}>{match.team2}</Text>
          {match.team2Score && (
            <Text style={styles.teamScore}>
              <Text style={styles.teamScoreBold}>{match.team2Score}</Text> {match.team2Overs}
            </Text>
          )}
        </View>
      </View>

      {match.message && <Text style={styles.matchMessage}>{match.message}</Text>}
      {match.result && <Text style={styles.matchResultText}>{match.result}</Text>}

      <View style={styles.matchFooter}>
        <TouchableOpacity><Text style={styles.footerLink}>Insights</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Table</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Leaderboard</Text></TouchableOpacity>
      </View>
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

  const TeamCard = ({ team }: { team: any }) => (
    <View style={styles.teamCard}>
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
          <QrCode size={20} color="#0D9488" strokeWidth={1.5} />
       </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'matches':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity style={[styles.subTab, subTab === 'all' && styles.subTabActive]} onPress={() => setSubTab('all')}>
                <Text style={[styles.subTabText, subTab === 'all' && styles.subTabTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.subTab, subTab === 'played' && styles.subTabActive]} onPress={() => setSubTab('played')}>
                <Text style={[styles.subTabText, subTab === 'played' && styles.subTabTextActive]}>Played</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.matchesList}>
               {MATCHES_DATA.filter(m => subTab === 'all' || (subTab === 'played' && m.status === 'Result')).map(match => (
                 <MatchCard key={match.id} match={match} />
               ))}
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
               {TEAMS_DATA.map(team => (
                 <TeamCard key={team.id} team={team} />
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

  const content = (
    <View style={styles.container}>
      <View style={styles.tabsStickyWrapper}>
        <View style={styles.tabsInnerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={{ flex: 1 }}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => { setActiveTab(tab.id); setSubTab(tab.id === 'stats' ? 'batting' : tab.id === 'teams' ? 'your' : 'all'); }}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          </ScrollView>
          {!isCompact && (
            <View style={styles.titleWrapper}>
              <Text style={[styles.heroLabel, { marginBottom: 0 }]}>Cricket Central</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') { return <WebLayout noCard>{content}</WebLayout>; }
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>{content}</View>;
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  statusBadgeUpcoming: { backgroundColor: '#FFF7ED' },
  statusBadgeResult: { backgroundColor: '#111827' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#000000' },
  statusBadgeTextResult: { color: '#FFFFFF' },
  statusBadgeTextUpcoming: { color: '#EA580C' },
  matchTeams: { gap: 12, marginBottom: 16 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { fontSize: 15, color: '#111827' },
  teamNameBold: { fontWeight: '700', fontSize: 16 },
  teamScore: { fontSize: 14, color: '#4B5563' },
  teamScoreBold: { fontWeight: '700', color: '#111827', fontSize: 16 },
  matchMessage: { fontSize: 13, color: '#4B5563', fontStyle: 'italic', marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  matchResultText: { fontSize: 13, color: '#059669', fontWeight: '600', marginBottom: 12 },
  matchFooter: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  footerLink: { fontSize: 13, color: '#0D9488', fontWeight: '600' },
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
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
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
});
