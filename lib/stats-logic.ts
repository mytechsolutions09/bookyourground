/**
 * Player Style Logic (CricHeroes Style)
 * This utility calculates player personality tags based on their historical match data.
 */

export interface PlayerStats {
  matches_played: number;
  total_runs: number;
  strike_rate: number;
  total_wickets: number;
  innings_batted: number;
  innings_bowled: number;
  not_outs: number;
  runs_conceded: number;
  overs_bowled: number;
  balls_faced?: number;
}

export interface PlayerTag {
  id: string;
  label: string;
  type: 'batting' | 'bowling';
  description: string;
  color: string;
  icon: string;
}

export function getPlayerTags(stats: PlayerStats | null): PlayerTag[] {
  if (!stats) return [];
  
  const tags: PlayerTag[] = [];
  
  // BATTING TAGS (Min 5 innings)
  if (stats.innings_batted >= 5) {
    const avg = stats.total_runs / (stats.innings_batted - stats.not_outs || 1);
    const sr = Number(stats.strike_rate);

    if (sr > 165 && avg > 25) {
      tags.push({
        id: 'destroyer',
        label: 'Destroyer',
        type: 'batting',
        description: 'Consistent big-boundary hitter with a massive strike rate.',
        color: '#991B1B', // Red
        icon: 'zap'
      });
    } else if (sr > 145 && avg < 25) {
      tags.push({
        id: 'hard_hitter',
        label: 'Hard Hitter',
        type: 'batting',
        description: 'Aggressive powerful striker who deals primarily in boundaries.',
        color: '#EA580C', // Orange
        icon: 'flame'
      });
    } else if (avg > 35 && sr > 115) {
      tags.push({
        id: 'accumulator',
        label: 'Accumulator',
        type: 'batting',
        description: 'Highly consistent player who adapts perfectly to the match situation.',
        color: '#1E40AF', // Blue
        icon: 'trending-up'
      });
    } else if (avg > 40 && sr >= 90 && sr <= 115) {
      tags.push({
        id: 'classicist',
        label: 'Classicist',
        type: 'batting',
        description: 'Technical master focused on strike rotation and gap finding.',
        color: '#15803d', // Green
        icon: 'target'
      });
    } else if (avg > 25 && sr < 95) {
      tags.push({
        id: 'steady',
        label: 'Steady Batter',
        type: 'batting',
        description: 'Reliable anchor who provides stability to the innings.',
        color: '#4B5563', // Gray
        icon: 'shield'
      });
    }
  }

  // BOWLING TAGS (Min 5 innings)
  if (stats.innings_bowled >= 5) {
    const wktsPerInn = stats.total_wickets / stats.innings_bowled;
    const eco = stats.overs_bowled > 0 ? (stats.runs_conceded / stats.overs_bowled) : 0;

    if (wktsPerInn > 1.4 && eco < 7.5) {
      tags.push({
        id: 'spearhead',
        label: 'Spearhead',
        type: 'bowling',
        description: 'The primary wicket-taker who keeps runs under tight control.',
        color: '#7C3AED', // Purple
        icon: 'target'
      });
    } else if (eco < 6.5) {
       tags.push({
        id: 'economist',
        label: 'Economist',
        type: 'bowling',
        description: 'Built-in pressure. Specializes in bowling extremely tight spells.',
        color: '#10B981', // Emerald
        icon: 'database'
      });
    } else if (wktsPerInn > 1.1 && eco > 9.0) {
      tags.push({
        id: 'wildcard',
        label: 'Wildcard',
        type: 'bowling',
        description: 'A match-winner who fearlessly trades runs for crucial wickets.',
        color: '#F59E0B', // Amber
        icon: 'plus'
      });
    }
  } else if (stats.innings_bowled > 0 && stats.innings_bowled < 5) {
     tags.push({
        id: 'aspirant',
        label: 'Aspirant',
        type: 'bowling',
        description: 'A rising talent with high potential, gaining experience with every match.',
        color: '#6366F1', // Indigo
        icon: 'star'
      });
  }

  return tags;
}
