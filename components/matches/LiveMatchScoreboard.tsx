import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { Ionicons } from '@expo/vector-icons';

interface LiveMatchScoreboardProps {
  matchId: string;
}

const EMOJIS = ['🔥', '👏', '😮', '🏏', '💯', '🙌'];

export default function LiveMatchScoreboard({ matchId }: LiveMatchScoreboardProps) {
  const { liveState, viewerCount, reactions, sendReaction, loading } = useLiveMatch(matchId);

  if (loading && !liveState) return <View style={styles.loading}><Text>Connecting to Match...</Text></View>;

  return (
    <View style={styles.container}>
      {/* Header with Viewer Count */}
      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Ionicons name="eye" size={14} color="#64748B" />
          <Text style={styles.viewerText}>{viewerCount} watching</Text>
        </View>
      </View>

      {/* Main Score Area */}
      <View style={styles.scoreContainer}>
        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{liveState?.batting_team_name || 'Batting Team'}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{liveState?.total_runs || 0}</Text>
            <Text style={styles.wicketText}>/{liveState?.wickets || 0}</Text>
          </View>
          <Text style={styles.overText}>
            Overs: {liveState?.overs || 0}.{liveState?.balls_in_over || 0}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.teamSection}>
          <Text style={styles.teamLabel}>Target</Text>
          <Text style={styles.targetText}>{liveState?.target || '-'}</Text>
        </View>
      </View>

      {/* Realtime Reactions */}
      <View style={styles.reactionSection}>
        <View style={styles.reactionStream}>
          {reactions.map((r) => (
            <Text key={r.id} style={styles.reactionEmoji}>{r.emoji}</Text>
          ))}
        </View>
        
        <View style={styles.emojiPicker}>
          {EMOJIS.map((emoji) => (
            <TouchableOpacity 
              key={emoji} 
              onPress={() => sendReaction(emoji)}
              style={styles.emojiBtn}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  teamSection: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
  },
  wicketText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#94A3B8',
  },
  overText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  teamLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  reactionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  reactionStream: {
    flexDirection: 'row',
    height: 30,
    marginBottom: 12,
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
    marginHorizontal: 4,
  },
  emojiPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emojiText: {
    fontSize: 20,
  },
});
