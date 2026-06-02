import type { PlayerGameLog, TargetStat } from "./types";

export function getStatValue(game: PlayerGameLog, stat: TargetStat): number {
  switch (stat) {
    case "points":
      return game.points;
    case "assists":
      return game.assists;
    case "rebounds":
      return game.rebounds;
    case "threes":
      return game.threes;
    case "blocks":
      return game.blocks ?? 0;
    case "steals":
      return game.steals ?? 0;
    case "ftm":
      return game.ftm ?? 0;
    case "pra":
      return game.points + game.rebounds + game.assists;
    case "pr":
      return game.points + game.rebounds;
    case "pa":
      return game.points + game.assists;
    default:
      return 0;
  }
}

export function hitTarget(value: number, line: number): boolean {
  return value >= line;
}

export function percentageHit(
  games: PlayerGameLog[],
  stat: TargetStat,
  line: number
): number {
  if (!games.length) return 0;

  const hits = games.filter((g) => hitTarget(getStatValue(g, stat), line)).length;
  return (hits / games.length) * 100;
}

export function averageStat(
  games: PlayerGameLog[],
  stat: TargetStat
): number {
  if (!games.length) return 0;
  const total = games.reduce((sum, g) => sum + getStatValue(g, stat), 0);
  return total / games.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sampleSizeMultiplier(sampleSize: number, ideal = 8): number {
  return clamp(sampleSize / ideal, 0.25, 1);
}

export function stdDev(numbers: number[]): number {
  if (numbers.length <= 1) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const variance =
    numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}