import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { gradePlayerProp } from "../lib/playerGrader/grader";
import type { PlayerGameLog } from "../lib/playerGrader/types";
import { useTheme } from "../context/ThemeContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const targetLinePlugin = {
  id: "targetLine",
  beforeDraw: (chart: any) => {
    const targetValue = chart.config.options?.plugins?.targetLine?.value;
    if (targetValue === null || targetValue === undefined) return;
    const yScale = chart.scales?.y;
    if (!yScale) return;
    const { ctx, chartArea } = chart;
    const yPos = yScale.getPixelForValue(targetValue);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chartArea.left, yPos);
    ctx.lineTo(chartArea.right, yPos);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(34,197,94,0.9)";
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(targetLinePlugin);

interface PlayerPageProps {
  logicLogo: string;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

interface PlayerGame {
  player_name: string;
  photo_url?: string;
  game_id: string;
  game_datetime_est: string;
  game_type?: string;
  points: number | string;
  assists: number | string;
  reb_total: number | string;
  ftm: number | string;
  fta: number | string;
  blocks: number | string;
  steals: number | string;
  home: boolean | string;
  fg3m?: number | string;
  matchup?: string;
  opponent_abbr?: string;
  minutes?: number | string;
}

interface PlayerGameContext {
  opponent_abbr: string;
  opponent_full_name?: string;
  is_home: boolean;
  own_team_abbrev?: string;
  game_datetime_est?: string;
  opponent_team_id?: string | number;
  opponentContext?: {
    defRating?: number;
    pace?: number;
    positionRank?: number;
    leagueAvgDefRating?: number;
    leagueAvgPace?: number;
  };
}

interface Teammate {
  person_id: number;
  player_name: string;
  games_together: number;
}

interface TeammatePresence {
  game_id: string;
  teammate_active: boolean;
}

type PropKey =
  | "points"
  | "assists"
  | "reb_total"
  | "blocks"
  | "steals"
  | "fg3m"
  | "ftm"
  | "pra"
  | "pr"
  | "pa";

type LocationKey = "both" | "home" | "away";

function getPropValue(game: PlayerGame, p: PropKey): number {
  switch (p) {
    case "pra":
      return Number(game.points ?? 0) + Number(game.reb_total ?? 0) + Number(game.assists ?? 0);
    case "pr":
      return Number(game.points ?? 0) + Number(game.reb_total ?? 0);
    case "pa":
      return Number(game.points ?? 0) + Number(game.assists ?? 0);
    default:
      return Number((game as unknown as Record<string, unknown>)[p] ?? 0);
  }
}

export default function PlayerPage({
  logicLogo,
  onLoginClick,
  onRegisterClick,
}: PlayerPageProps) {
  const { id } = useParams();
  const { isDark } = useTheme();

  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textMuted = isDark ? "#9ca3af" : "#555555";
  const pageBg = isDark ? "#000000" : "#ffffff";
  const cardBg = isDark ? "#111111" : "#f3f3f5";

  const [games, setGames] = useState<PlayerGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prop, setProp] = useState<PropKey>("points");
  const [location, setLocation] = useState<LocationKey>("both");
  const [gameCount, setGameCount] = useState<number | "h2h">(5);
  const [seasonType, setSeasonType] = useState<"Regular Season" | "Playoffs" | "Emirates NBA Cup" | "Play-in Tournament" | "Preseason" | "both">("Regular Season");

  const [targetValueInput, setTargetValueInput] = useState<string>("");
  const [targetValue, setTargetValue] = useState<number | null>(null);

  const [gameContext, setGameContext] = useState<PlayerGameContext | null>(null);

  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [selectedTeammates, setSelectedTeammates] = useState<Teammate[]>([]);
  const [teammatePresence, setTeammatePresence] = useState<TeammatePresence[]>([]);
  const [teammateDropdownOpen, setTeammateDropdownOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players/${id}`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`Failed to load games: ${res.status} ${msg}`);
        }
        const data: PlayerGame[] = await res.json();
        setGames(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load games";
        console.error(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchContext = async () => {
      try {
        const res = await fetch(`/api/players/${id}/context`);
        if (!res.ok) throw new Error("Failed to load game context");
        const data = await res.json();
        setGameContext(data);
      } catch (err) {
        console.error("Context fetch error:", err);
        setGameContext(null);
      }
    };
    fetchContext();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchTeammates = async () => {
      try {
        const res = await fetch(`/api/players/${id}/teammates`);
        if (!res.ok) return;
        const data: Teammate[] = await res.json();
        setTeammates(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTeammates();
  }, [id]);

  useEffect(() => {
    if (!id || selectedTeammates.length === 0) {
      setTeammatePresence([]);
      return;
    }

    const fetchPresence = async () => {
      try {
        const results = await Promise.all(
          selectedTeammates.map((t) =>
            fetch(`/api/players/${id}/teammate-games/${t.person_id}`)
              .then((r) => r.json()) as Promise<TeammatePresence[]>
          )
        );

        const gameMap = new Map<string, boolean>();
        results.forEach((presenceList) => {
          presenceList.forEach(({ game_id, teammate_active }) => {
            const key = String(game_id);
            if (gameMap.has(key)) {
              if (teammate_active) gameMap.set(key, true);
            } else {
              gameMap.set(key, teammate_active);
            }
          });
        });

        const merged: TeammatePresence[] = Array.from(gameMap.entries()).map(
          ([game_id, teammate_active]) => ({ game_id, teammate_active })
        );

        setTeammatePresence(merged);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPresence();
  }, [id, selectedTeammates]);

  useEffect(() => {
    const handleClickOutside = () => setTeammateDropdownOpen(false);
    if (teammateDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [teammateDropdownOpen]);

  const currentSeasonStart = new Date("2025-10-21");
  const playoffSeasonStart = new Date("2024-10-01"); // includes 2024-25 playoffs

  const baseGames = useMemo(
    () => games.filter((g) => {
      const gameDate = new Date(g.game_datetime_est);
      if (seasonType === "Playoffs") {
        return gameDate >= playoffSeasonStart && g.game_type === "Playoffs";
      }
      if (seasonType === "both") {
        return gameDate >= currentSeasonStart;
      }
      return gameDate >= currentSeasonStart && g.game_type === seasonType;
    }),
    [games, seasonType]
  );

  const filteredBaseGames = useMemo(() => {
    return baseGames.filter((g) => {
      const isHome = g.home === true || g.home === "true";
      if (location === "both") return true;
      if (location === "home") return isHome;
      return !isHome;
    });
  }, [baseGames, location]);

  const filteredGames = useMemo(() => {
    let base = (() => {
      if (gameCount === "h2h") {
        const opponent = (gameContext?.opponent_abbr ?? "").trim().toUpperCase();
        if (!opponent) return [];
        // H2H should respect the season type filter
        return games.filter((g) => {
          const matchesOpponent = (g.opponent_abbr ?? "").trim().toUpperCase() === opponent;
          if (!matchesOpponent) return false;
          if (seasonType === "Playoffs") {
            return new Date(g.game_datetime_est) >= playoffSeasonStart && g.game_type === "Playoffs";
          }
          if (seasonType === "both") {
            return new Date(g.game_datetime_est) >= currentSeasonStart;
          }
          return new Date(g.game_datetime_est) >= currentSeasonStart && g.game_type === seasonType;
        });
      }
      if (gameCount >= filteredBaseGames.length) return filteredBaseGames;
      return filteredBaseGames.slice(0, gameCount);
    })();

    if (selectedTeammates.length > 0 && teammatePresence.length) {
      const presenceMap = new Map(
        teammatePresence.map((p) => [String(p.game_id), p.teammate_active])
      );
      base = base.filter((g) => {
        const active = presenceMap.get(String(g.game_id));
        return active === false;
      });
    }

    return base;
  }, [filteredBaseGames, games, gameCount, gameContext, seasonType, selectedTeammates, teammatePresence]);

  const handleTargetSubmit = () => {
    const value = parseFloat(targetValueInput);
    if (!isNaN(value)) {
      setTargetValue(value);
    } else {
      alert("Please enter a valid number.");
    }
  };

  const handleClearTarget = () => {
    setTargetValue(null);
    setTargetValueInput("");
  };

  const hitCount = useMemo(() => {
    if (targetValue === null) return 0;
    return filteredGames.filter((g) => getPropValue(g, prop) >= targetValue).length;
  }, [filteredGames, prop, targetValue]);

  const missCount = useMemo(() => {
    if (targetValue === null) return 0;
    return filteredGames.filter((g) => getPropValue(g, prop) < targetValue).length;
  }, [filteredGames, prop, targetValue]);

  const chartData = useMemo(() => {
    const displayGames = [...filteredGames].reverse();
    return {
      labels: displayGames.map((g) =>
        new Date(g.game_datetime_est).toLocaleDateString()
      ),
      datasets: [
        {
          label: prop.toUpperCase(),
          data: displayGames.map((g) => getPropValue(g, prop)),
          backgroundColor: displayGames.map((g) => {
            const value = getPropValue(g, prop);
            return targetValue !== null && value < targetValue
              ? "rgba(239,68,68,0.75)"
              : "rgba(245,197,66,0.75)";
          }),
          borderColor: displayGames.map((g) => {
            const value = getPropValue(g, prop);
            return targetValue !== null && value < targetValue
              ? "rgba(239,68,68,1)"
              : "rgba(245,197,66,1)";
          }),
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [filteredGames, prop, targetValue]);

  const chartOptions = useMemo(
  () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text:
          gameCount === "h2h"
            ? `${prop.toUpperCase()} vs ${(gameContext?.opponent_abbr ?? "").trim()}`
            : targetValue !== null
            ? `${prop.toUpperCase()} vs Target ${targetValue}`
            : `Player ${prop.toUpperCase()} Chart`,
        color: isDark ? "#ffffff" : "#111111",
      },
      tooltip: {
        callbacks: {
          title: (items: any[]) => {
            const index = items[0]?.dataIndex;
            const displayGames = [...filteredGames].reverse();
            const game = displayGames[index];
            if (!game) return "";
            const date = new Date(game.game_datetime_est).toLocaleDateString();
            const opponent = (game.opponent_abbr ?? "").trim();
            const isHome = game.home === true || game.home === "true";
            return `${date} ${isHome ? "vs" : "@"} ${opponent}`;
          },
          label: (item: any) => {
            return `${prop.toUpperCase()}: ${item.raw}`;
          },
        },
      },
      targetLine: {
        value: targetValue,
      },
    } as any,
    scales: {
      x: {
        ticks: { color: isDark ? "#d1d5db" : "#555555" },
        grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDark ? "#d1d5db" : "#555555",
          precision: 0,
        },
        grid: { color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
      },
    },
  }),
  [prop, targetValue, gameCount, gameContext, isDark, filteredGames]
);

 const gameLogs: PlayerGameLog[] = useMemo(
  () =>
    games
      .filter((g) => {
        const gameDate = new Date(g.game_datetime_est);
        if (seasonType === "Playoffs") {
          return gameDate >= playoffSeasonStart && g.game_type === "Playoffs";
        }
        if (seasonType === "both") {
          return gameDate >= currentSeasonStart;
        }
        return gameDate >= currentSeasonStart && g.game_type === seasonType;
      })
      .map((game) => ({
        gameId: String(game.game_id),
        gameDate: game.game_datetime_est,
        opponent: (game.opponent_abbr ?? "").trim(),
        isHome: game.home === true || game.home === "true",
        minutes: Number(game.minutes ?? 0),
        points: Number(game.points ?? 0),
        assists: Number(game.assists ?? 0),
        rebounds: Number(game.reb_total ?? 0),
        threes: Number(game.fg3m ?? 0),
        blocks: Number(game.blocks ?? 0),
        steals: Number(game.steals ?? 0),
        ftm: Number(game.ftm ?? 0),
        pra: Number(game.points ?? 0) + Number(game.reb_total ?? 0) + Number(game.assists ?? 0),
        pr: Number(game.points ?? 0) + Number(game.reb_total ?? 0),
        pa: Number(game.points ?? 0) + Number(game.assists ?? 0),
        teammateStatuses: selectedTeammates.length > 0
          ? Object.fromEntries(
              selectedTeammates.map((t) => {
                const presence = teammatePresence.find(
                  (p) => String(p.game_id) === String(game.game_id)
                );
                return [t.player_name, presence?.teammate_active ? "active" : "out"];
              })
            )
          : undefined,
      })),
  [games, seasonType, teammatePresence, selectedTeammates]
);

  const graderStatMap = {
    points: "points",
    assists: "assists",
    reb_total: "rebounds",
    fg3m: "threes",
    blocks: "blocks",
    steals: "steals",
    ftm: "ftm",
    pra: "pra",
    pr: "pr",
    pa: "pa",
  } as const;

  const targetStat = graderStatMap[prop as keyof typeof graderStatMap];

  const result =
    targetValue !== null
      ? gradePlayerProp(
          gameLogs,
          {
            currentOpponent: gameContext?.opponent_abbr ?? "",
            isHome: gameContext?.is_home ?? false,
            targetStat,
            targetLine: targetValue,
            inactiveTeammates: selectedTeammates.map((t) => t.player_name),
          },
          gameContext?.opponentContext
        )
      : null;

  const playerAverages = useMemo(() => {
    if (!filteredGames.length) return null;
    const sum = filteredGames.reduce(
      (acc, g) => {
        acc.points += Number(g.points ?? 0);
        acc.assists += Number(g.assists ?? 0);
        acc.rebounds += Number(g.reb_total ?? 0);
        acc.blocks += Number(g.blocks ?? 0);
        acc.steals += Number(g.steals ?? 0);
        acc.ftm += Number(g.ftm ?? 0);
        acc.threes += Number(g.fg3m ?? 0);
        return acc;
      },
      { points: 0, assists: 0, rebounds: 0, blocks: 0, steals: 0, ftm: 0, threes: 0 }
    );
    return {
      points: (sum.points / filteredGames.length).toFixed(1),
      assists: (sum.assists / filteredGames.length).toFixed(1),
      rebounds: (sum.rebounds / filteredGames.length).toFixed(1),
      blocks: (sum.blocks / filteredGames.length).toFixed(1),
      steals: (sum.steals / filteredGames.length).toFixed(1),
      ftm: (sum.ftm / filteredGames.length).toFixed(1),
      threes: (sum.threes / filteredGames.length).toFixed(1),
      playerName: filteredGames[0].player_name,
    };
  }, [filteredGames]);

  const pieData = useMemo(() => {
    if (!result) return null;
    const prob = Number(result.probability);
    let color = "rgba(239,68,68,0.7)";
    if (prob > 70) color = "rgba(34,197,94,0.7)";
    else if (prob >= 51 && prob <= 69) color = "rgba(245,197,66,0.7)";
    return {
      labels: ["Success", "Remaining"],
      datasets: [
        {
          data: [prob, 100 - prob],
          backgroundColor: [color, "rgba(100,100,100,0.2)"],
          borderWidth: 0,
        },
      ],
    };
  }, [result]);

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
      cutout: "50%",
    }),
    []
  );

  if (!id) {
    return (
      <div className="min-h-screen text-white p-10" style={{ backgroundColor: pageBg }}>
        Missing player id.
      </div>
    );
  }

  const playerName = games.length > 0 ? games[0].player_name : "Player";
  const photoUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: pageBg }}>
      <Header
        logicLogo={logicLogo}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />

      <main className="flex-1 px-6 md:px-12 py-10">
        <h1 className="text-4xl font-bold mb-6" style={{ color: textPrimary }}>
          {playerName}'s Stats Chart
        </h1>

        <div className="mb-4 text-sm" style={{ color: textMuted }}>
          {gameContext ? (
            <span className="font-semibold" style={{ color: textPrimary }}>
              Next Game:{" "}
              {gameContext.is_home
                ? `${gameContext.own_team_abbrev} vs ${gameContext.opponent_full_name ?? gameContext.opponent_abbr}`
                : `${gameContext.own_team_abbrev} @ ${gameContext.opponent_full_name ?? gameContext.opponent_abbr}`}
            </span>
          ) : (
            <span>No upcoming game found</span>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="mb-8 flex flex-wrap gap-4 items-center">
          <select
            value={prop}
            onChange={(e) => setProp(e.target.value as PropKey)}
            className="px-4 py-2 rounded-xl border border-[#f5c542]/30"
            style={{ backgroundColor: cardBg, color: textPrimary }}
          >
            <option value="points">PTS</option>
            <option value="assists">AST</option>
            <option value="reb_total">REB</option>
            <option value="blocks">BLK</option>
            <option value="steals">STL</option>
            <option value="fg3m">3PM</option>
            <option value="ftm">FTM</option>
            <option value="pra">PRA</option>
            <option value="pr">P+R</option>
            <option value="pa">P+A</option>
          </select>

          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as LocationKey)}
            className="px-4 py-2 rounded-xl border border-[#f5c542]/30"
            style={{ backgroundColor: cardBg, color: textPrimary }}
          >
            <option value="both">Both</option>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>

          <select
            value={gameCount}
            onChange={(e) => {
              const val = e.target.value;
              setGameCount(val === "h2h" ? "h2h" : Number(val));
            }}
            className="px-4 py-2 rounded-xl border border-[#f5c542]/30"
            style={{ backgroundColor: cardBg, color: textPrimary }}
          >
            <option value={5}>Last 5</option>
            <option value={10}>Last 10</option>
            <option value={20}>Last 20</option>
            <option value={baseGames.length || 0}>Season</option>
            <option value="h2h">H2H</option>
          </select>
            
          <select
            value={seasonType}
            onChange={(e) => setSeasonType(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-[#f5c542]/30"
            style={{ backgroundColor: cardBg, color: textPrimary }}
          >
            <option value="Regular Season">Regular Season</option>
            <option value="Playoffs">Playoffs</option>
            <option value="Emirates NBA Cup">NBA Cup</option>
            <option value="Play-in Tournament">Play-In</option>
            <option value="Preseason">Preseason</option>
            <option value="both">All Games</option>
          </select>

          {/* Teammate injury filter */}
          {teammates.length > 0 && (
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setTeammateDropdownOpen(!teammateDropdownOpen)}
                className="px-4 py-2 rounded-xl border border-[#f5c542]/30 flex items-center gap-2"
                style={{ backgroundColor: cardBg, color: textPrimary }}
              >
                {selectedTeammates.length > 0
                  ? `${selectedTeammates.length} teammate${selectedTeammates.length > 1 ? "s" : ""} out`
                  : "Injury filter..."}
                <span className="text-xs">▼</span>
              </button>

              {teammateDropdownOpen && (
                <div
                  className="absolute z-50 mt-1 rounded-xl border border-[#f5c542]/30 shadow-lg overflow-y-auto"
                  style={{ backgroundColor: cardBg, maxHeight: "300px", minWidth: "280px" }}
                >
                  <div
                    onClick={() => {
                      setSelectedTeammates([]);
                      setTeammateDropdownOpen(false);
                    }}
                    className="px-4 py-2 text-sm cursor-pointer hover:bg-[#f5c542]/10 border-b border-[#f5c542]/10"
                    style={{ color: textMuted }}
                  >
                    Clear all
                  </div>

                  {teammates.map((t) => {
                    const isSelected = selectedTeammates.some(
                      (s) => s.person_id === t.person_id
                    );
                    return (
                      <div
                        key={t.person_id}
                        onClick={() => {
                          setSelectedTeammates((prev) =>
                            isSelected
                              ? prev.filter((s) => s.person_id !== t.person_id)
                              : [...prev, t]
                          );
                        }}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[#f5c542]/10"
                      >
                        <div
                          className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected ? "#f5c542" : textMuted,
                            backgroundColor: isSelected ? "#f5c542" : "transparent",
                          }}
                        >
                          {isSelected && (
                            <span style={{ color: "#000", fontSize: "10px", fontWeight: "bold" }}>
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: textPrimary }}>
                          {t.player_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <input
            type="number"
            step="0.5"
            placeholder={`Target ${prop.toUpperCase()} (e.g., 20)`}
            value={targetValueInput}
            onChange={(e) => {
              setTargetValueInput(e.target.value);
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                setTargetValue(value);
              }
            }}
            className="px-4 py-2 rounded-xl border border-[#f5c542]/30"
            style={{ backgroundColor: cardBg, color: textPrimary }}
          />
          <button
            onClick={handleTargetSubmit}
            className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold"
          >
            Set Target
          </button>
          <button
            onClick={handleClearTarget}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
          >
            Clear
          </button>
        </div>

        {/* ── Chart + Player Info Side by Side ── */}
        <div
          className="grid gap-8 items-start mb-6"
          style={{ gridTemplateColumns: "3fr 2fr" }}
        >
          {/* Left: Chart + Hit/Miss */}
          <div className="flex flex-col">
            <div className="h-[400px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
            {targetValue !== null && (
              <div
                className="text-lg font-semibold flex gap-12 mt-4 justify-center"
                style={{ color: textPrimary }}
              >
                <span>Hit: {hitCount}</span>
                <span>Miss: {missCount}</span>
              </div>
            )}
          </div>

          {/* Right: Player photo + averages */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <img
                src={photoUrl}
                alt={playerName}
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid rgba(245,197,66,0.3)",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <h2
                className="text-lg font-bold text-center"
                style={{ color: textPrimary }}
              >
                {playerName}
              </h2>
            </div>

            {playerAverages && (
              <div
                className="grid gap-x-4 gap-y-4 w-full px-4"
                style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
              >
                {["points", "rebounds", "assists", "blocks", "steals", "ftm", "threes"].map(
                  (key) => (
                    <div key={key} className="flex flex-col items-center">
                      <span className="text-xs" style={{ color: textMuted }}>
                        {key === "points"
                          ? "PTS"
                          : key === "rebounds"
                          ? "REB"
                          : key === "assists"
                          ? "AST"
                          : key === "blocks"
                          ? "BLK"
                          : key === "steals"
                          ? "STL"
                          : key === "ftm"
                          ? "FTM"
                          : "3PM"}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: textPrimary }}
                      >
                        {(playerAverages as any)[key]}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Selected teammates indicator */}
            {selectedTeammates.length > 0 && (
              <div
                className="w-full px-4 py-3 rounded-xl border border-red-500/30 text-sm"
                style={{ backgroundColor: isDark ? "#1a0000" : "#fff0f0" }}
              >
                <p className="font-semibold mb-1" style={{ color: "#ef4444" }}>
                  Filtering: games without
                </p>
                {selectedTeammates.map((t) => (
                  <p key={t.person_id} style={{ color: textMuted }}>
                    • {t.player_name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Grader Result ── */}
        <div
          className="mt-6 rounded-2xl p-8 border border-[#f5c542]/20"
          style={{ backgroundColor: cardBg, color: textPrimary }}
        >
          <h2 className="text-[#f5c542] font-bold text-lg mb-4 border-b border-[#f5c542]/20 pb-3">
            Line Logic Calculations
          </h2>
          {result ? (
            <div className="flex gap-6 items-start">
              <div className="flex-1 pl-4">
                <h3 className="text-2xl font-bold mb-2">{result.verdict}</h3>
                <p className="text-lg mb-1">{result.probability}% chance</p>
                <p className="text-sm mb-4" style={{ color: textMuted }}>
                  Confidence: {result.confidence}
                </p>
                <div className="space-y-2 text-sm" style={{ color: textMuted }}>
                  {result.explanation.map((line) => (
                    <p key={line}>• {line}</p>
                  ))}
                </div>
              </div>

              {pieData && (
                <div className="relative w-[180px] h-[180px] flex-shrink-0">
                  <Doughnut data={pieData} options={pieOptions} />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                    style={{ color: textPrimary }}
                  >
                    {result.probability}%
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="pl-4" style={{ color: textMuted }}>
              Enter a target value to see grading.
            </p>
          )}
        </div>
      </main>

      <Footer logicLogo={logicLogo} />
    </div>
  );
}
