export type TargetStat = "points" | "assists" | "rebounds" | "threes" | "blocks" | "steals" | "ftm" | "pra" | "pr" | "pa";

export interface PlayerGameLog {
    gameId: string;
    gameDate: string;
    opponent: string;
    isHome: boolean;
    minutes: number;
    points: number;
    assists: number;
    rebounds: number;
    threes: number;
    blocks: number;      // add
    steals: number;      // add
    ftm: number;         // add
    pra: number;         // add
    pr: number;          // add
    pa: number;          // add
    teammateStatuses?: Record<string, "out" | "active">;
  }

export interface PlayerContext {
  currentOpponent: string;
  isHome: boolean;
  targetStat: TargetStat;
  targetLine: number;
  inactiveTeammates?: string[];
  activeTeammates?: string[]; 
  isBackToBack?: boolean;
}

export interface GradeBreakdown {
  seasonHitRate: number;
  recent5HitRate: number;
  recent10HitRate: number;
  matchupHitRate: number | null;
  locationHitRate: number | null;

  homeAwayAdjustment: number;
  opponentAdjustment: number;
  teammateAdjustment: number;
  minutesStabilityAdjustment: number;
  trendAdjustment: number;
}

export interface GradeResult {
  verdict: 
    | "ALMOST GUARANTEED" 
    | "LIKELY"
    | "LEAN LIKELY"
    | "TOSS UP"
    | "LEAN UNLIKELY"
    | "UNLIKELY"
    | "HIGHLY UNLIKELY";
  probability: number;
  confidence: "Low" | "Medium" | "High";
  grade: number;
  target: {
    stat: TargetStat;
    line: number;
  };
  breakdown: GradeBreakdown;
  explanation: string[];
}

export interface OpponentContext {
  defRating?: number;      
  pace?: number;          
  positionRank?: number;   
  leagueAvgDefRating?: number;
  leagueAvgPace?: number;         
}