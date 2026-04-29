import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useLiveMatch(matchId?: string) {
  const { session } = useAuth();
  const [liveState, setLiveState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [channel, setChannel] = useState<any>(null);

  // Initial fetch and subscription
  useEffect(() => {
    if (!matchId) return;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('match_live_state')
        .select('*')
        .eq('match_id', matchId)
        .single();
      
      if (data) setLiveState(data);
      setLoading(false);
    };

    fetchInitial();

    const channel = supabase.channel(`match:${matchId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: matchId },
      },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_live_state', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setLiveState(payload.new);
        }
      )
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const newReaction = {
          id: Math.random().toString(36).substr(2, 9),
          emoji: payload.payload.emoji
        };
        setReactions((prev) => [...prev.slice(-10), newReaction]); // Keep last 10
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            viewer_id: Math.random().toString(36).substr(2, 9),
            joined_at: new Date().toISOString(),
          });
        }
      });

    setChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const startLiveMatch = async (matchConfig: any) => {
    if (!session?.user?.id) throw new Error('Not authenticated');

    // 1. Create Match Metadata
    const { data: match, error: mError } = await supabase
      .from('matches')
      .insert([{
        owner_id: session.user.id,
        title: `${matchConfig.teamA.name} vs ${matchConfig.teamB.name}`,
        team_a_name: matchConfig.teamA.name,
        team_b_name: matchConfig.teamB.name,
        total_overs: parseInt(matchConfig.totalOvers),
        venue: matchConfig.ground || 'Standard Ground',
        status: 'live'
      }])
      .select()
      .single();

    if (mError) throw mError;

    // 2. Initialize Live State
    const { data: live, error: lError } = await supabase
      .from('match_live_state')
      .insert([{
        match_id: match.id,
        phase: 'toss',
        batting_team_name: matchConfig.teamA.name, // Will be updated after toss
        bowling_team_name: matchConfig.teamB.name
      }])
      .select()
      .single();

    if (lError) throw lError;

    return match.id;
  };

  const updateLiveState = useCallback(async (newState: any) => {
    if (!matchId || !session?.user?.id) return;

    const { error } = await supabase
      .from('match_live_state')
      .update({
        ...newState,
        updated_at: new Date().toISOString()
      })
      .eq('match_id', matchId);

    if (error) console.error('Error updating live state:', error);
  }, [matchId, session]);

  const sendReaction = useCallback((emoji: string) => {
    if (!channel) return;
    channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji }
    });
    // Optimistic UI for self
    const newReaction = {
      id: Math.random().toString(36).substr(2, 9),
      emoji
    };
    setReactions((prev) => [...prev.slice(-10), newReaction]);
  }, [channel]);

  return {
    liveState,
    loading,
    startLiveMatch,
    updateLiveState,
    viewerCount,
    reactions,
    sendReaction
  };
}
