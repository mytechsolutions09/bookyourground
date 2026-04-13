// hooks/useCricketScoring.ts
// Drop-in scoring engine adapted for BookYourGround
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Ball {
  type: string;
  label: string;
}

interface Batter {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  onStrike: boolean;
  status: 'batting' | 'out' | 'yet';
  out: boolean;
  dismissal: string;
}

interface Bowler {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  overRuns: number;
}

interface InningState {
  battingTeam: string;
  bowlingTeam: string;
  battingPlayers: string[];
  bowlingPlayers: string[];
  runs: number;
  wickets: number;
  balls: number;
  legalBalls: number;
  extras: Record<string, number>;
  batters: Batter[];
  bowlers: Bowler[];
  currentBowlerIdx: number;
  overBalls: Ball[];
  allOvers: Ball[][];
  target: number | null;
  inningsId: string | null;
}

const formatOvers = (legalBalls: number) =>
  `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

const calcCRR = (runs: number, legalBalls: number) =>
  legalBalls > 0 ? parseFloat((runs / (legalBalls / 6)).toFixed(2)) : 0;

const calcRRR = (target: number, runs: number, legalBalls: number, totalOvers: number) => {
  const ballsLeft = totalOvers * 6 - legalBalls;
  if (ballsLeft <= 0) return null;
  const need = target - runs;
  return parseFloat((need / (ballsLeft / 6)).toFixed(2));
};

const initInning = ({ battingTeam, bowlingTeam, battingPlayers, bowlingPlayers }: any): InningState => ({
  battingTeam, bowlingTeam,
  battingPlayers, bowlingPlayers,
  runs: 0, wickets: 0, balls: 0, legalBalls: 0,
  extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 },
  batters: battingPlayers.map((name: string, i: number) => ({
    name, runs: 0, balls: 0, fours: 0, sixes: 0,
    onStrike: i < 2, status: i < 2 ? 'batting' : 'yet',
    out: false, dismissal: '',
  })),
  bowlers: bowlingPlayers.map((name: string) => ({
    name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0,
  })),
  currentBowlerIdx: 0,
  overBalls: [],
  allOvers: [],
  target: null,
  inningsId: null,
});

export function useCricketScoring() {
  const { session } = useAuth();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchConfig, setConfig] = useState<any>(null);
  const [inningsList, setInningsList] = useState<[InningState | null, InningState | null]>([null, null]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'setup' | 'toss' | 'live' | 'innings_break' | 'completed'>('setup');
  const [result, setResult] = useState<string | null>(null);
  const historyRef = useRef<InningState[]>([]);

  const inn = inningsList[currentIdx];

  const setInn = (updater: InningState | ((prev: InningState) => InningState)) => {
    setInningsList(prev => {
      const next = [...prev] as [InningState | null, InningState | null];
      const current = prev[currentIdx];
      if (!current) return prev;
      next[currentIdx] = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
  };

  const pushLiveState = useCallback(async (innState: InningState, cfg: any, mid: string, extraResult: string | null = null) => {
    if (!mid) return;
    const striker = innState.batters.find(b => b.onStrike && !b.out && b.status === 'batting');
    const nonStriker = innState.batters.find(b => !b.onStrike && !b.out && b.status === 'batting');
    const bowler = innState.bowlers[innState.currentBowlerIdx];
    const lastBall = innState.overBalls[innState.overBalls.length - 1];

    const payload = {
      match_id: mid,
      innings_number: currentIdx + 1,
      batting_team: innState.battingTeam,
      bowling_team: innState.bowlingTeam,
      runs: innState.runs,
      wickets: innState.wickets,
      legal_balls: innState.legalBalls,
      overs_total: cfg?.overs,
      target: innState.target,
      crr: calcCRR(innState.runs, innState.legalBalls),
      rrr: innState.target
        ? calcRRR(innState.target, innState.runs, innState.legalBalls, cfg?.overs)
        : null,
      striker_name: striker?.name ?? null,
      striker_runs: striker?.runs ?? 0,
      striker_balls: striker?.balls ?? 0,
      striker_fours: striker?.fours ?? 0,
      striker_sixes: striker?.sixes ?? 0,
      nonstriker_name: nonStriker?.name ?? null,
      nonstriker_runs: nonStriker?.runs ?? 0,
      nonstriker_balls: nonStriker?.balls ?? 0,
      nonstriker_fours: nonStriker?.fours ?? 0,
      nonstriker_sixes: nonStriker?.sixes ?? 0,
      bowler_name: bowler?.name ?? null,
      bowler_overs: bowler ? `${bowler.overs}.${bowler.balls}` : '0.0',
      bowler_runs: bowler?.runs ?? 0,
      bowler_wickets: bowler?.wickets ?? 0,
      bowler_maidens: bowler?.maidens ?? 0,
      last_ball_label: lastBall?.label ?? null,
      last_ball_type: lastBall?.type ?? null,
      current_over_balls: JSON.stringify(innState.overBalls),
      match_status: extraResult ? 'completed' : 'live',
      result_text: extraResult ?? null,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('match_live_state')
      .upsert(payload, { onConflict: 'match_id' });
  }, [currentIdx]);

  const logBall = useCallback(async (innState: InningState, ballData: any, mid: string) => {
    if (!mid || !innState.inningsId) return;
    const overNum = Math.floor(innState.legalBalls / 6);
    const ballNum = innState.overBalls.length;
    const bowler = innState.bowlers[innState.currentBowlerIdx];
    const striker = innState.batters.find(b => b.onStrike && !b.out && b.status === 'batting');
    await supabase.from('ball_log').insert({
      match_id: mid,
      innings_id: innState.inningsId,
      over_number: overNum,
      ball_number: ballNum,
      runs: ballData.runs ?? 0,
      extras: ballData.extras ?? 0,
      extra_type: ballData.extraType ?? null,
      is_wicket: ballData.isWicket ?? false,
      dismissal_type: ballData.dismissalType ?? null,
      batter_name: striker?.name ?? null,
      bowler_name: bowler?.name ?? null,
      fielder_name: ballData.fielder ?? null,
      label: ballData.label,
      ball_type: ballData.type,
    });
  }, []);

  const createMatch = useCallback(async (config: any) => {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        owner_id: session?.user?.id,
        title: `${config.teamA} vs ${config.teamB}`,
        team_a: config.teamA,
        team_b: config.teamB,
        team_a_id: config.teamAId,
        team_b_id: config.teamBId,
        overs: config.overs,
        players: config.players,
        venue: config.venue,
        match_type: config.matchType,
        status: 'toss',
      })
      .select()
      .single();
    if (error) { console.error('createMatch error', error); return null; }
    setMatchId(data.id);
    setConfig(config);
    return data.id;
  }, [session]);

  const createInningsRow = useCallback(async (mid: string, innNum: number, batting: string, bowling: string, target: number | null = null) => {
    const { data, error } = await supabase
      .from('innings')
      .insert({
        match_id: mid,
        innings_number: innNum,
        batting_team: batting,
        bowling_team: bowling,
        target,
      })
      .select()
      .single();
    if (error) { console.error('createInningsRow error', error); return null; }
    return data.id;
  }, []);

  const startMatch = useCallback(async (config: any, tossWinner: string, tossChoice: 'bat' | 'bowl') => {
    const battingFirst = tossChoice === 'bat';
    const battingTeam = tossWinner === config.teamA
      ? (battingFirst ? config.teamA : config.teamB)
      : (battingFirst ? config.teamB : config.teamA);
    const bowlingTeam = battingTeam === config.teamA ? config.teamB : config.teamA;
    const battingPlayers = battingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers;
    const bowlingPlayers = bowlingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers;

    const mid = await createMatch(config);
    if (!mid) return;
    const innId = await createInningsRow(mid, 1, battingTeam, bowlingTeam);
    const innObj = initInning({ battingTeam, bowlingTeam, battingPlayers, bowlingPlayers });
    innObj.inningsId = innId;

    await supabase.from('matches').update({ status: 'live', toss_winner: tossWinner, toss_choice: tossChoice }).eq('id', mid);

    setInningsList([innObj, null]);
    setCurrentIdx(0);
    setPhase('live');
    return { matchId: mid, inn: innObj };
  }, [createMatch, createInningsRow]);

  const rotateStrike = (batters: Batter[]) => batters.map(b =>
    b.status === 'batting' && !b.out ? { ...b, onStrike: !b.onStrike } : b
  );

  const snapshot = (innState: InningState) => {
    historyRef.current.push(JSON.parse(JSON.stringify(innState)));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const checkEnd = useCallback(async (innState: InningState, cfg: any, mid: string) => {
    const allOut = innState.wickets >= cfg.players - 1;
    const oversUp = innState.legalBalls >= cfg.overs * 6;
    const chaseWon = currentIdx === 1 && innState.target && innState.runs >= innState.target;
    if (!allOut && !oversUp && !chaseWon) return false;

    if (currentIdx === 0) {
      await supabase.from('innings').update({ status: 'completed', runs: innState.runs, wickets: innState.wickets, legal_balls: innState.legalBalls }).eq('id', innState.inningsId);
      await supabase.from('matches').update({ status: 'innings_break' }).eq('id', mid);
      setPhase('innings_break');
    } else {
      const inn1 = inningsList[0]!;
      let resultText;
      if (chaseWon) {
        const wktsLeft = (cfg.players - 1) - innState.wickets;
        resultText = `${innState.battingTeam} won by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`;
      } else {
        const runDiff = (innState.target || 0) - innState.runs - 1;
        resultText = `${inn1.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
      }
      await supabase.from('innings').update({ status: 'completed', runs: innState.runs, wickets: innState.wickets, legal_balls: innState.legalBalls }).eq('id', innState.inningsId);
      await supabase.from('matches').update({ status: 'completed' }).eq('id', mid);
      await pushLiveState(innState, cfg, mid, resultText);
      setResult(resultText);
      setPhase('completed');
    }
    return true;
  }, [currentIdx, inningsList, pushLiveState]);

  const handleOverEnd = useCallback((innState: InningState) => {
    const bowler = { ...innState.bowlers[innState.currentBowlerIdx] };
    bowler.overs++;
    bowler.balls = 0;
    if (bowler.overRuns === 0) bowler.maidens++;
    bowler.overRuns = 0;
    const newBowlers = innState.bowlers.map((b, i) =>
      i === innState.currentBowlerIdx ? bowler : b
    );
    const allOvers = [...(innState.allOvers || []), [...innState.overBalls]];
    return { ...innState, bowlers: newBowlers, allOvers, overBalls: [] };
  }, []);

  const addBall = useCallback(async (runs: number) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    const strikerIdx = next.batters.findIndex(b => b.onStrike && !b.out && b.status === 'batting');
    const bowlerIdx = next.currentBowlerIdx;

    next.runs += runs;
    next.balls += 1;
    next.legalBalls += 1;
    
    if (strikerIdx !== -1) {
      next.batters[strikerIdx].runs += runs;
      next.batters[strikerIdx].balls += 1;
      if (runs === 4) next.batters[strikerIdx].fours++;
      if (runs === 6) next.batters[strikerIdx].sixes++;
    }

    if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
      next.bowlers[bowlerIdx].runs += runs;
      next.bowlers[bowlerIdx].balls += 1;
      next.bowlers[bowlerIdx].overRuns = (next.bowlers[bowlerIdx].overRuns || 0) + runs;
    }

    const ballType = runs === 4 ? 'four' : runs === 6 ? 'six' : runs === 0 ? 'dot' : 'run';
    const ballLabel = runs === 0 ? '•' : String(runs);
    next.overBalls = [...next.overBalls, { type: ballType, label: ballLabel }];

    if (runs % 2 === 1) next.batters = rotateStrike(next.batters);

    if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
      next = handleOverEnd(next);
      next.batters = rotateStrike(next.batters);
    }

    setInn(next);
    await logBall(next, { runs, type: ballType, label: ballLabel }, matchId!);
    await pushLiveState(next, matchConfig, matchId!);
    await checkEnd(next, matchConfig, matchId!);

    return next;
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addExtra = useCallback(async (type: string) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    const bowlerIdx = next.currentBowlerIdx;
    const labels: Record<string, string> = { wide: 'Wd', noball: 'Nb', bye: 'B', legbye: 'LB', penalty: 'P' };
    const ballType = type === 'wide' ? 'wide' : type === 'noball' ? 'noball' : 'run';

    next.runs += 1;
    next.extras[type] = (next.extras[type] || 0) + 1;
    
    if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
      next.bowlers[bowlerIdx].runs += 1;
      next.bowlers[bowlerIdx].overRuns = (next.bowlers[bowlerIdx].overRuns || 0) + 1;
    }
    
    next.overBalls = [...next.overBalls, { type: ballType, label: labels[type] }];

    if (type !== 'wide') {
      next.balls += 1;
      next.legalBalls += 1;
      if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
        next = handleOverEnd(next);
        next.batters = rotateStrike(next.batters);
      }
    }

    setInn(next);
    await logBall(next, { runs: 0, extras: 1, extraType: type, type: ballType, label: labels[type] }, matchId!);
    await pushLiveState(next, matchConfig, matchId!);
    await checkEnd(next, matchConfig, matchId!);
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addWicket = useCallback(async ({ dismissedName, dismissalType, fielder, newBatterName }: any) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    const bowlerIdx = next.currentBowlerIdx;
    const dismissedIdx = next.batters.findIndex(b => b.name === dismissedName);
    const nextBatIdx = next.batters.findIndex(b => b.name === newBatterName);

    if (dismissedIdx !== -1) {
      next.batters[dismissedIdx].out = true;
      next.batters[dismissedIdx].status = 'out';
      next.batters[dismissedIdx].onStrike = false;
      const bwrName = next.bowlers[bowlerIdx]?.name || 'Unknown';
      next.batters[dismissedIdx].dismissal = `${dismissalType} b ${bwrName}`;
    }
    if (nextBatIdx !== -1) {
      next.batters[nextBatIdx].status = 'batting';
      next.batters[nextBatIdx].onStrike = true;
    }

    next.wickets += 1;
    next.bowlers[bowlerIdx].wickets += 1;
    next.bowlers[bowlerIdx].balls += 1;
    next.balls += 1;
    next.legalBalls += 1;
    next.overBalls = [...next.overBalls, { type: 'wicket', label: 'W' }];

    if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
      next = handleOverEnd(next);
    }

    setInn(next);
    await logBall(next, { isWicket: true, dismissalType, fielder, type: 'wicket', label: 'W' }, matchId!);
    await pushLiveState(next, matchConfig, matchId!);
    await checkEnd(next, matchConfig, matchId!);
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const changeBowler = useCallback((bowlerIdx: number) => {
    setInn(prev => ({ ...prev, currentBowlerIdx: bowlerIdx }));
  }, []);

  const undoLastBall = useCallback(async () => {
    if (historyRef.current.length === 0) return false;
    const prev = historyRef.current.pop()!;
    setInn(prev);
    await pushLiveState(prev, matchConfig, matchId!);
    return true;
  }, [matchId, matchConfig, pushLiveState]);

  const startSecondInnings = useCallback(async () => {
    if (!inningsList[0]) return;
    const inn1 = inningsList[0];
    const battingTeam = inn1.bowlingTeam;
    const bowlingTeam = inn1.battingTeam;
    const battingPlayers = battingTeam === matchConfig.teamA ? matchConfig.teamAPlayers : matchConfig.teamBPlayers;
    const bowlingPlayers = bowlingTeam === matchConfig.teamA ? matchConfig.teamAPlayers : matchConfig.teamBPlayers;
    const target = inn1.runs + 1;

    const innId = await createInningsRow(matchId!, 2, battingTeam, bowlingTeam, target);
    const inn2 = initInning({ battingTeam, bowlingTeam, battingPlayers, bowlingPlayers });
    inn2.inningsId = innId;
    inn2.target = target;

    await supabase.from('matches').update({ status: 'live' }).eq('id', matchId!);

    setInningsList([inningsList[0], inn2]);
    setCurrentIdx(1);
    setPhase('live');
    historyRef.current = [];
  }, [inningsList, matchConfig, matchId, createInningsRow]);

  const striker = inn?.batters.find(b => b.onStrike && !b.out && b.status === 'batting');
  const nonStriker = inn?.batters.find(b => !b.onStrike && !b.out && b.status === 'batting');
  const bowler = inn?.bowlers[inn?.currentBowlerIdx];
  const crr = inn ? calcCRR(inn.runs, inn.legalBalls) : 0;
  const rrr = inn?.target ? calcRRR(inn.target, inn.runs, inn.legalBalls, matchConfig?.overs) : null;
  const yetToBat = inn?.batters.filter(b => b.status === 'yet') ?? [];

  return {
    matchId, phase, result,
    inn, inn1: inningsList[0], inn2: inningsList[1],
    matchConfig,
    striker, nonStriker, bowler, crr, rrr, yetToBat,
    formatOvers,
    startMatch, addBall, addExtra, addWicket,
    changeBowler, undoLastBall, startSecondInnings,
  };
}
