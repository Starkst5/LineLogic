import type {GradeBreakdown, GradeResult, PlayerContext, PlayerGameLog} from "./types";
import {averageStat, clamp, percentageHit, sampleSizeMultiplier, stdDev} from "./helpers";
import { getVerdictFromGrade } from "./labels";

// Gets the most recent N games for a player, filtering out garbage time
function getRecentGames(games: PlayerGameLog[], count: number): PlayerGameLog[] {
  return [...games]
    .filter((g) => g.minutes >= 10)
    .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
    .slice(0, count);
}

// Filters games based on home/away status, excluding garbage time
function getLocationGames(games: PlayerGameLog[], isHome: boolean): PlayerGameLog[] {
  return games.filter((g) => g.isHome === isHome && g.minutes >= 10);
}

// Filters games against a specific opponent, excluding garbage time
function getOpponentGames(games: PlayerGameLog[], opponent: string): PlayerGameLog[] {
  if (!opponent) return [];
  return games.filter((g) => {
    if (!g.opponent || g.minutes < 10) return false;
    return g.opponent.toLowerCase() === opponent.toLowerCase();
  });
}

// Filters games where specified teammates were inactive
function getGamesWithoutTeammates(
  games: PlayerGameLog[],
  inactiveTeammates: string[] = []
): PlayerGameLog[] {
  if (!inactiveTeammates.length) return [];
  return games.filter((g) => {
    if (!g.teammateStatuses || g.minutes < 10) return false;
    return inactiveTeammates.every((name) => g.teammateStatuses?.[name] === "out");
  });
}

// Trend: compares last 7 vs last 20 for a more stable signal
function getTrendAdjustment(
  games: PlayerGameLog[],
  stat: PlayerContext["targetStat"]
): number {
  const recent7  = getRecentGames(games, 7);
  const recent20 = getRecentGames(games, 20);

  if (recent7.length < 4 || recent20.length < 10) return 0;

  const avg7  = averageStat(recent7, stat);
  const avg20 = averageStat(recent20, stat);

  if (avg20 < 0.5) return 0;

  const pctChange = (avg7 - avg20) / avg20;

  if (pctChange >= 0.25) return 10;
  if (pctChange >= 0.15) return 6;
  if (pctChange >= 0.08) return 3;
  if (pctChange <= -0.25) return -10;
  if (pctChange <= -0.15) return -6;
  if (pctChange <= -0.08) return -3;
  return 0;
}

// Streak detector: checks if player hit or missed line in each of last 3 games
function getStreakAdjustment(
  games: PlayerGameLog[],
  stat: PlayerContext["targetStat"],
  line: number
): number {
  const recent3 = getRecentGames(games, 3);
  if (recent3.length < 3) return 0;

  const allHit  = recent3.every((g) => averageStat([g], stat) >= line);
  const allMiss = recent3.every((g) => averageStat([g], stat) < line);

  if (allHit)  return 6;
  if (allMiss) return -6;
  return 0;
}

// Rest detector: checks days between last two games
function getRestAdjustment(games: PlayerGameLog[], isBackToBack?: boolean): number {
  if (isBackToBack === true) return -5;
  if (isBackToBack === false) return 3;

  // Fallback to game log calculation if not provided
  const recent2 = getRecentGames(games, 2);
  if (recent2.length < 2) return 0;
  const latest   = new Date(recent2[0].gameDate).getTime();
  const previous = new Date(recent2[1].gameDate).getTime();
  const daysBetween = (latest - previous) / (1000 * 60 * 60 * 24);
  if (daysBetween <= 1) return -5;
  if (daysBetween >= 3) return 3;
  return 0;
}

// Minutes stability over recent 10 games
function getMinutesStabilityAdjustment(games: PlayerGameLog[]): number {
  const recent10 = getRecentGames(games, 10);
  const minutes = recent10.map((g) => g.minutes).filter(Boolean);

  if (minutes.length < 5) return 0;

  const volatility = stdDev(minutes);
  const avgMinutes = minutes.reduce((a, b) => a + b, 0) / minutes.length;

  // Filter outliers before computing trend
  // Use games within 1.5 std deviations of the mean
  const filtered = minutes.filter((m) => Math.abs(m - avgMinutes) <= volatility * 1.5);
  const trendMinutes = filtered.length >= 4 ? filtered : minutes;

  const half = Math.floor(trendMinutes.length / 2);
  const recentAvg = trendMinutes.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const olderAvg  = trendMinutes.slice(half).reduce((a, b) => a + b, 0) / (trendMinutes.length - half);
  const minutesTrending = recentAvg - olderAvg;

  if (volatility <= 2) return 6;
  if (volatility <= 4) return 3;

  if (volatility >= 6) {
    if (avgMinutes >= 32 && minutesTrending >= 0) return 3;
    if (minutesTrending > 2) return 0;
    if (minutesTrending < -2) return -6;
    return -3;
  }

  if (volatility >= 8) {
    if (avgMinutes >= 32 && minutesTrending >= 0) return 0;
    if (minutesTrending > 2) return -3;
    return -6;
  }

  return 0;
}

// Home/away split adjustment
function getLocationAdjustment(
  allGames: PlayerGameLog[],
  context: PlayerContext
): { rate: number | null; adjustment: number } {
  const qualifiedGames = allGames.filter((g) => g.minutes >= 10);
  const locationGames  = getLocationGames(qualifiedGames, context.isHome);
  if (!locationGames.length) return { rate: null, adjustment: 0 };

  const locationRate = percentageHit(locationGames, context.targetStat, context.targetLine);
  const overallRate  = percentageHit(qualifiedGames, context.targetStat, context.targetLine);

  const diff = locationRate - overallRate;
  const weightedDiff = diff * sampleSizeMultiplier(locationGames.length, 10);

  return {
    rate: locationRate,
    adjustment: clamp(weightedDiff * 0.65, -14, 14),
  };
}

interface OpponentContext {
  defRating?: number;
  pace?: number;
  positionRank?: number;
  leagueAvgDefRating?: number;
  leagueAvgPace?: number;
}

// Opponent adjustment: blends historical hit rate with defensive proxy
function getOpponentAdjustment(
  allGames: PlayerGameLog[],
  context: PlayerContext,
  opponentCtx?: OpponentContext
): { rate: number | null; adjustment: number } {
  if (!context.currentOpponent) return { rate: null, adjustment: 0 };

  const qualifiedGames = allGames.filter((g) => g.minutes >= 10);
  const opponentGames  = getOpponentGames(qualifiedGames, context.currentOpponent);
  const overallRate    = percentageHit(qualifiedGames, context.targetStat, context.targetLine);

  let historyAdjustment = 0;
  let historyWeight = 0;

  if (opponentGames.length >= 2) {
    const opponentRate = percentageHit(opponentGames, context.targetStat, context.targetLine);
    const diff = opponentRate - overallRate;
    const weightedDiff = diff * sampleSizeMultiplier(opponentGames.length, 3);
    historyAdjustment = clamp(weightedDiff * 0.85, -20, 20);
    historyWeight = Math.min(opponentGames.length / 5, 1);
  }

  let proxyAdjustment = 0;
  let proxyWeight = 0;

  if (opponentCtx) {
    if (opponentCtx.defRating !== undefined && opponentCtx.leagueAvgDefRating !== undefined) {
      const defDiff = opponentCtx.defRating - opponentCtx.leagueAvgDefRating;
      proxyAdjustment += clamp(defDiff * 1.2, -12, 12);
    }
    if (opponentCtx.pace !== undefined && opponentCtx.leagueAvgPace !== undefined) {
      const paceDiff = opponentCtx.pace - opponentCtx.leagueAvgPace;
      proxyAdjustment += clamp(paceDiff * 0.4, -6, 6);
    }
    if (opponentCtx.positionRank !== undefined) {
      const rankAdj = ((opponentCtx.positionRank - 15.5) / 14.5) * 8;
      proxyAdjustment += clamp(rankAdj, -8, 8);
    }
    proxyWeight = 1 - historyWeight;
  }

  const totalWeight = historyWeight + proxyWeight;
  let finalAdjustment = 0;

  if (totalWeight > 0) {
    finalAdjustment = (
      historyAdjustment * historyWeight +
      proxyAdjustment * proxyWeight
    ) / totalWeight;
  }

  return {
    rate: opponentGames.length >= 2
      ? percentageHit(opponentGames, context.targetStat, context.targetLine)
      : null,
    adjustment: clamp(finalAdjustment, -20, 20),
  };
}

// Teammate absence adjustment
function getTeammateAdjustment(
  allGames: PlayerGameLog[],
  context: PlayerContext
): number {
  const qualifiedGames = allGames.filter((g) => g.minutes >= 10);
  const inactiveGames  = getGamesWithoutTeammates(
    qualifiedGames,
    context.inactiveTeammates || []
  );

  if (!inactiveGames.length) return 0;

  const inactiveRate = percentageHit(inactiveGames, context.targetStat, context.targetLine);
  const overallRate  = percentageHit(qualifiedGames, context.targetStat, context.targetLine);

  const diff = inactiveRate - overallRate;
  const weightedDiff = diff * sampleSizeMultiplier(inactiveGames.length, 6);

  return clamp(weightedDiff * 0.5, -15, 15);
}

// Line distance: uses recent 7 to match trend window
function getLineDistanceAdjustment(
  games: PlayerGameLog[],
  stat: PlayerContext["targetStat"],
  line: number
): number {
  const recent7 = getRecentGames(games, 7);
  if (!recent7.length) return 0;

  const avg = averageStat(recent7, stat);
  if (line < 0.5) return 0;

  const pctDiff = (avg - line) / line;

  if (pctDiff >= 0.20) return 10;
  if (pctDiff >= 0.12) return 6;
  if (pctDiff >= 0.06) return 3;
  if (pctDiff <= -0.20) return -10;
  if (pctDiff <= -0.12) return -6;
  if (pctDiff <= -0.06) return -3;
  return 0;
}

// Main grading function
export function gradePlayerProp(
  games: PlayerGameLog[],
  context: PlayerContext,
  opponentCtx?: OpponentContext
): GradeResult {
  const qualifiedGames = games.filter((g) => g.minutes >= 10);

  const sortedGames = [...qualifiedGames].sort(
    (a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
  );

  const recent5  = getRecentGames(sortedGames, 5);
  const recent10 = getRecentGames(sortedGames, 10);

  const seasonHitRate   = percentageHit(sortedGames, context.targetStat, context.targetLine);
  const recent5HitRate  = percentageHit(recent5,     context.targetStat, context.targetLine);
  const recent10HitRate = percentageHit(recent10,    context.targetStat, context.targetLine);

  const lineDistanceAdjustment    = getLineDistanceAdjustment(sortedGames, context.targetStat, context.targetLine);
  const locationData              = getLocationAdjustment(sortedGames, context);
  const opponentData              = getOpponentAdjustment(sortedGames, context, opponentCtx);
  const teammateAdjustment        = getTeammateAdjustment(sortedGames, context);
  const trendAdjustment           = getTrendAdjustment(sortedGames, context.targetStat);
  const minutesStabilityAdjustment = getMinutesStabilityAdjustment(sortedGames);
  const streakAdjustment          = getStreakAdjustment(sortedGames, context.targetStat, context.targetLine);
  const restAdjustment            = getRestAdjustment(sortedGames);

  // Recency-weighted base grade
  const baseGrade =
    seasonHitRate   * 0.25 +
    recent10HitRate * 0.35 +
    recent5HitRate  * 0.40;

  // Scale down positive adjustments when base grade is already strong
  const rawAdjustments =
    locationData.adjustment +
    opponentData.adjustment +
    teammateAdjustment +
    trendAdjustment +
    minutesStabilityAdjustment +
    lineDistanceAdjustment +
    streakAdjustment +
    restAdjustment;

  let adjustmentScale = 1.0;
  if (baseGrade >= 75 && rawAdjustments > 0) adjustmentScale = 0.35;
  else if (baseGrade >= 65 && rawAdjustments > 0) adjustmentScale = 0.55;
  else if (baseGrade >= 55 && rawAdjustments > 0) adjustmentScale = 0.75;
  else if (baseGrade <= 25 && rawAdjustments < 0) adjustmentScale = 0.35;
  else if (baseGrade <= 35 && rawAdjustments < 0) adjustmentScale = 0.55;

  let grade = baseGrade + rawAdjustments * adjustmentScale;

  // Hard ceiling: extreme grades require season hit rate to justify them
  if (grade > 90 && seasonHitRate < 80) grade = Math.min(grade, 89);
  if (grade > 95 && seasonHitRate < 90) grade = Math.min(grade, 94);

  grade = clamp(grade, 1, 99);

  const verdict = getVerdictFromGrade(grade);

  const adjustmentMagnitude = Math.abs(rawAdjustments * adjustmentScale);

  let confidence: "Low" | "Medium" | "High" = "Low";

  if (sortedGames.length >= 20) {
    confidence = "Medium";
    if (Math.abs(grade - 50) >= 25 && adjustmentMagnitude <= 10 && seasonHitRate >= 70) {
      confidence = "High";
    }
  } else if (sortedGames.length >= 10) {
    if (Math.abs(grade - 50) >= 15 && adjustmentMagnitude <= 15) {
      confidence = "Medium";
    }
  }

  // Never High confidence without strong season hit rate alignment
  if (confidence === "High" && Math.abs(seasonHitRate - grade) > 25) {
    confidence = "Medium";
  }

  if (opponentData.rate === null) {
    if (confidence === "High") confidence = "Medium";
  }

  const breakdown: GradeBreakdown = {
    seasonHitRate,
    recent5HitRate,
    recent10HitRate,
    matchupHitRate: opponentData.rate,
    locationHitRate: locationData.rate,
    homeAwayAdjustment: locationData.adjustment,
    opponentAdjustment: opponentData.adjustment,
    teammateAdjustment,
    minutesStabilityAdjustment,
    trendAdjustment,
  };

  const explanation: string[] = [];

  // Sample size warning
  if (sortedGames.length < 10) {
    explanation.push(
      `Limited sample size — only ${sortedGames.length} qualified games available. Grade should be treated as a rough estimate.`
    );
  }

  // Toss-up line warning
  const recentAvg = averageStat(getRecentGames(sortedGames, 10), context.targetStat);
  const proximityPct = Math.abs(recentAvg - context.targetLine) / Math.max(recentAvg, 0.5);
  if (proximityPct < 0.08 && sortedGames.length >= 10) {
    explanation.push(
      `This line is very close to the player's recent average of ${recentAvg.toFixed(1)} — this is a toss-up line by design and carries inherent uncertainty.`
    );
  }

  explanation.push(
    `Player cleared ${context.targetLine} ${context.targetStat} in ${seasonHitRate.toFixed(1)}% of qualified games this season.`
  );

  explanation.push(
    `Recent form: ${recent5HitRate.toFixed(1)}% over last 5 and ${recent10HitRate.toFixed(1)}% over last 10.`
  );

  if (locationData.rate !== null) {
    explanation.push(
      `${context.isHome ? "Home" : "Away"} split hit rate: ${locationData.rate.toFixed(1)}%.`
    );
  }

  if (opponentData.rate !== null) {
    explanation.push(
      `Vs ${context.currentOpponent}: ${opponentData.rate.toFixed(1)}% hit rate in prior meetings.`
    );
  }

  if (context.inactiveTeammates?.length) {
    const names = context.inactiveTeammates.join(", ");
    const inactiveGames = getGamesWithoutTeammates(sortedGames, context.inactiveTeammates);
    const inactiveRate = inactiveGames.length
      ? percentageHit(inactiveGames, context.targetStat, context.targetLine)
      : null;

    if (inactiveGames.length === 0) {
      explanation.push(
        `No qualifying games found without ${names} — not enough history to evaluate this lineup change.`
      );
    } else if (teammateAdjustment > 5) {
      explanation.push(
        `Without ${names}: hit rate rises to ${inactiveRate?.toFixed(1)}% across ${inactiveGames.length} games — player tends to see an expanded role and more opportunity.`
      );
    } else if (teammateAdjustment < -5) {
      explanation.push(
        `Without ${names}: hit rate drops to ${inactiveRate?.toFixed(1)}% across ${inactiveGames.length} games — player tends to struggle without this teammate on the floor.`
      );
    } else {
      explanation.push(
        `Without ${names}: hit rate is ${inactiveRate?.toFixed(1)}% across ${inactiveGames.length} games — performance is relatively consistent regardless of this teammate's availability.`
      );
    }
  }

  // Streak
  if (streakAdjustment > 0) {
    explanation.push(`Player has hit this line in each of their last 3 games — currently on a streak.`);
  } else if (streakAdjustment < 0) {
    explanation.push(`Player has missed this line in each of their last 3 games — currently in a slump.`);
  }

  // Rest
  if (restAdjustment < 0) {
    explanation.push(`Player is on a back-to-back — fatigue typically reduces performance.`);
  } else if (restAdjustment > 0) {
    explanation.push(`Player is well rested with 3+ days since their last game.`);
  }

  // Trend
  if (trendAdjustment > 0) {
    explanation.push(`Player is trending up — recent games averaging above their season baseline.`);
  } else if (trendAdjustment < 0) {
    explanation.push(`Player is trending down — recent games averaging below their season baseline.`);
  }

  // Line distance
  if (lineDistanceAdjustment > 0) {
    explanation.push(`Recent average is comfortably above this line.`);
  } else if (lineDistanceAdjustment < 0) {
    explanation.push(`Recent average is below this line — represents a stretch.`);
  }

  // Location
  if (Math.abs(locationData.adjustment) > 2) {
    explanation.push(
      `${context.isHome ? "Home" : "Away"} games show a notably different hit rate for this line.`
    );
  }

  // Opponent
  if (opponentData.adjustment > 5) {
    explanation.push(`Favorable matchup — ${context.currentOpponent} ranks among the weaker defensive teams.`);
  } else if (opponentData.adjustment < -5) {
    explanation.push(`Tough matchup — ${context.currentOpponent} ranks among the stronger defensive teams.`);
  }

  // Minutes stability
if (minutesStabilityAdjustment > 0) {
  explanation.push(`Consistent playing time recently adds reliability to this projection.`);
} else if (minutesStabilityAdjustment === 0 && stdDev(recent10.map(g => g.minutes)) >= 6) {
  explanation.push(`Minutes have been variable recently but trending in a stable direction.`);
} else if (minutesStabilityAdjustment < 0) {
  explanation.push(`Minutes trending downward recently — reduced role lowers projection reliability.`);
}

  return {
    verdict,
    probability: Math.round(grade),
    confidence,
    grade: Number(grade.toFixed(1)),
    target: {
      stat: context.targetStat,
      line: context.targetLine,
    },
    breakdown,
    explanation,
  };
}