/**
 * MVP CALCULATION UTILITIES FOR BYG / CricScore
 * Based on CricHQ / CricHeroes Standard (10 runs = 1 MVP point)
 */

// Batting par % by position 1–11 (Standard distribution)
const BATTING_PAR_PCT: number[] = [
  0.14, 0.13, 0.13, 0.12, 0.11, 0.09, 0.07, 0.06, 0.04, 0.03, 0.02,
];

// Wicket "strength" by batting position 1–11
const WICKET_STRENGTH: number[] = [
  1, 1, 1, 1,         // Top order
  0.8, 0.8, 0.8, 0.8, // Middle order
  0.6, 0.6, 0.6,      // Tail
];

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Base runs-per-wicket varies by match length (Match Overs)
 */
export function getBaseRunsPerWicket(matchOvers: number): number {
  if (matchOvers <= 7) return 12;
  if (matchOvers <= 12) return 14;
  if (matchOvers <= 16) return 16;
  if (matchOvers <= 20) return 18;
  if (matchOvers <= 40) return 22;
  return 25;
}

export function getParRunsForPosition(position: number, inningsTotalRuns: number): number {
  const idx = Math.min(Math.max(position - 1, 0), 10);
  const pct = BATTING_PAR_PCT[idx] ?? 0.05;
  return inningsTotalRuns * pct;
}

// ---------- Batting MVP ----------

/**
 * Batting MVP:
 * - Basic MVP = runs / 10
 * - SR bonus: (playerSR / teamSR) * 8% * basicMVP (if playerSR > teamSR)
 * - Par Bonus: +10% points for runs scored above par
 * - Milestones: 50 runs (+0.5), 100 runs (+1.0)
 */
export function calcBattingMVP(
  runs: number,
  position: number,
  inningsTotalRuns: number,
  playerBalls: number,
  teamTotalRuns: number,
  teamTotalBalls: number,
  srBonusPct = 0.08
): number {
  if (runs === 0) return 0;
  
  const basicMVP = runs / 10;

  // 1. Strike Rate Bonus
  const teamSR = teamTotalBalls > 0 ? (teamTotalRuns / teamTotalBalls) * 100 : 100;
  const playerSR = playerBalls > 0 ? (runs / playerBalls) * 100 : 0;
  const srBonus = playerSR > teamSR ? (playerSR / teamSR) * srBonusPct * basicMVP : 0;

  // 2. Par Score Bonus (Batter gets 10% extra for runs above par)
  const parRuns = getParRunsForPosition(position, inningsTotalRuns);
  const runsAbovePar = Math.max(0, runs - parRuns);
  const parBonus = (runsAbovePar / 10) * 0.1;

  // 3. Milestones
  let milestoneBonus = 0;
  if (runs >= 100) milestoneBonus = 1.0;
  else if (runs >= 50) milestoneBonus = 0.5;

  return round2(basicMVP + srBonus + parBonus + milestoneBonus);
}

// ---------- Bowling MVP ----------

export interface WicketInfo {
  batterPosition: number;
  batterRuns: number;
}

/**
 * Compute MVP points for a single wicket:
 * - Base wicket points = (baseRunsPerWicket * wicketStrength) / 10
 * - Par score bonus: reward bowler for dismissing batter below par
 */
export function calcSingleWicketPoints(
  wicket: WicketInfo,
  matchOvers: number,
  inningsTotalRuns: number
): number {
  const baseRuns = getBaseRunsPerWicket(matchOvers);
  const idx = Math.min(Math.max(wicket.batterPosition - 1, 0), 10);
  const strength = WICKET_STRENGTH[idx] ?? 1;
  
  const basePoints = (baseRuns * strength) / 10;

  // Par Bonus: Bowler gets points for "runs saved"
  const parRuns = getParRunsForPosition(wicket.batterPosition, inningsTotalRuns);
  const runsSaved = Math.max(0, parRuns - wicket.batterRuns);
  const parBonus = runsSaved / 10;

  return basePoints + parBonus;
}

/**
 * Bowling MVP:
 * - Sum wicket points
 * - Milestones: 3+ (+0.5), 5+ (+1.0), 10+ (+1.5)
 */
export function calcBowlingMVP(
  wickets: WicketInfo[],
  matchOvers: number,
  inningsTotalRuns: number
): number {
  if (!wickets.length) return 0;

  let total = wickets.reduce((sum, w) => sum + calcSingleWicketPoints(w, matchOvers, inningsTotalRuns), 0);

  const count = wickets.length;
  if (count >= 10) total += 1.5;
  else if (count >= 5) total += 1.0;
  else if (count >= 3) total += 0.5;

  return round2(total);
}

// ---------- Fielding MVP ----------

export type FieldingDismissalType = "ASSISTED" | "UNASSISTED";

export interface FieldingEvent {
  batterPosition: number;
  batterRuns: number;
  type: FieldingDismissalType;
}

/**
 * Fielding MVP:
 * - Assisted (catch/stumping): 20% of wicket points
 * - Unassisted (direct run-out): 100% of wicket points
 */
export function calcFieldingMVP(
  events: FieldingEvent[],
  matchOvers: number,
  inningsTotalRuns: number
): number {
  if (!events.length) return 0;

  let total = 0;
  for (const e of events) {
    const wicketPoints = calcSingleWicketPoints(
      { batterPosition: e.batterPosition, batterRuns: e.batterRuns },
      matchOvers,
      inningsTotalRuns
    );
    total += e.type === "ASSISTED" ? wicketPoints * 0.2 : wicketPoints;
  }

  return round2(total);
}
