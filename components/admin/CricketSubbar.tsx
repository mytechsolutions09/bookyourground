import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Swords, Users, Trophy, BarChart, BarChart2, Activity } from 'lucide-react-native';

const BASE = '/(admin)/cricketdata';

export default function CricketSubbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isOverview = pathname === BASE || pathname === (BASE + '/');
  const isMatches = pathname.includes('/cricketdata/matches');
  const isTeams = pathname.includes('/cricketdata/teams');
  const isTournaments = pathname.includes('/cricketdata/tournaments');
  const isStats = pathname.includes('/cricketdata/stats');

  return (
    <View style={styles.shell}>
      <View style={styles.subbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subbarScroll}
        >
          <Pressable
            onPress={() => router.push(BASE as any)}
            style={[styles.subLink, isOverview && styles.subLinkActive]}
          >
            <Activity size={16} color={isOverview ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isOverview && styles.subLinkTextActive]}>Overview</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/matches') as any)}
            style={[styles.subLink, isMatches && styles.subLinkActive]}
          >
            <Swords size={16} color={isMatches ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isMatches && styles.subLinkTextActive]}>
              Live Matches
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/teams') as any)}
            style={[styles.subLink, isTeams && styles.subLinkActive]}
          >
            <Users size={16} color={isTeams ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isTeams && styles.subLinkTextActive]}>
              Teams
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/tournaments') as any)}
            style={[styles.subLink, isTournaments && styles.subLinkActive]}
          >
            <Trophy size={16} color={isTournaments ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isTournaments && styles.subLinkTextActive]}>
              Tournaments
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/leaderboard') as any)}
            style={[styles.subLink, pathname.includes('/cricketdata/leaderboard') && styles.subLinkActive]}
          >
            <BarChart size={16} color={pathname.includes('/cricketdata/leaderboard') ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, pathname.includes('/cricketdata/leaderboard') && styles.subLinkTextActive]}>
              Stats
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/stats') as any)}
            style={[styles.subLink, isStats && styles.subLinkActive]}
          >
            <BarChart2 size={16} color={isStats ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isStats && styles.subLinkTextActive]}>
              System Stats
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/players') as any)}
            style={[styles.subLink, pathname.includes('/cricketdata/players') && styles.subLinkActive]}
          >
            <Users size={16} color={pathname.includes('/cricketdata/players') ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, pathname.includes('/cricketdata/players') && styles.subLinkTextActive]}>
              Players
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  subbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  subbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  subLinkActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  subLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  subLinkTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
