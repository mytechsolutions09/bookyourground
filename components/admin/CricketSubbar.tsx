import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, Image } from 'react-native';
import { router, usePathname } from 'expo-router';
import { 
  Swords, 
  Users, 
  Trophy, 
  BarChart2, 
  TrendingUp, 
  UserSquare2, 
  Activity,
  ChevronLeft
} from 'lucide-react-native';

const BASE = '/(admin)/cricketdata';

export default function CricketSubbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isOverview = pathname === BASE || pathname === (BASE + '/');
  const isMatches = pathname.includes('/cricketdata/matches');
  const isTeams = pathname.includes('/cricketdata/teams');
  const isTournaments = pathname.includes('/cricketdata/tournaments');
  const isLeaderboard = pathname.includes('/cricketdata/leaderboard');
  const isStats = pathname.includes('/cricketdata/stats');
  const isPlayers = pathname.includes('/cricketdata/players');

  const getPageInfo = () => {
    if (isMatches) return { title: 'Matches', subtitle: 'Manage matches', icon: Swords };
    if (isTeams) return { title: 'Teams', subtitle: 'Oversee teams', icon: Users };
    if (isTournaments) return { title: 'Tournaments', subtitle: 'Track tournaments', icon: Trophy };
    if (isLeaderboard) return { title: 'Stats', subtitle: 'Leaderboard', icon: BarChart2 };
    if (isStats) return { title: 'System Stats', subtitle: 'Analytics', icon: TrendingUp };
    if (isPlayers) return { title: 'Players', subtitle: 'Manage players', icon: UserSquare2 };
    return { title: 'Overview', subtitle: 'Overview', icon: Activity };
  };

  const { title, subtitle, icon: PageIcon } = getPageInfo();

  return (
    <View style={styles.shell}>
      <View style={styles.headerBar}>
        <View style={styles.leftSection}>
          <View style={styles.iconBox}>
            <PageIcon size={18} color="#10b981" />
          </View>
          <View style={styles.titleGroup}>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScrollContent}
          >
            <NavButton 
              onPress={() => router.push(BASE as any)}
              isActive={isOverview}
              icon={Activity}
              label="Overview"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/matches') as any)}
              isActive={isMatches}
              icon={Swords}
              label="Live Matches"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/teams') as any)}
              isActive={isTeams}
              icon={Users}
              label="Teams"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/tournaments') as any)}
              isActive={isTournaments}
              icon={Trophy}
              label="Tournaments"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/leaderboard') as any)}
              isActive={isLeaderboard}
              icon={BarChart2}
              label="Stats"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/stats') as any)}
              isActive={isStats}
              icon={TrendingUp}
              label="System Stats"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/players') as any)}
              isActive={isPlayers}
              icon={UserSquare2}
              label="Players"
            />
          </ScrollView>
        </View>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

function NavButton({ onPress, isActive, icon: Icon, label }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navBtn, isActive && styles.navBtnActive]}
    >
      <Icon size={18} color={isActive ? '#10b981' : '#4B5563'} strokeWidth={isActive ? 2.5 : 1.5} />
      <Text style={[styles.navBtnLabel, isActive && styles.navBtnLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 24,
    height: 60,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 24,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitleText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  navSection: {
    flex: 1,
    height: '100%',
  },
  navScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  navBtn: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    transition: 'all 0.2s ease',
  },
  navBtnActive: {
    backgroundColor: '#F0FDF4', // Light green background for active item
  },
  navBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  navBtnLabelActive: {
    color: '#10b981',
  },
  content: {
    flex: 1,
  },
});
