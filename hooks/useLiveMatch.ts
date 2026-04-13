import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useLiveMatch(matchId?: string) {
  const { session } = useAuth();
  const [liveState, setLiveState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_live_state', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setLiveState(payload.new);
        }
      )
      .subscribe();

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

  return {
    liveState,
    loading,
    startLiveMatch,
    updateLiveState
  };
}
