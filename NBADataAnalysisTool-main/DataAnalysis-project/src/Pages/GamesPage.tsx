import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../Components/Header";
import { Footer } from "../Components/Footer";

interface GamesPageProps {
  logicLogo: string;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

interface Game {
  game_id: string;
  game_datetime_est: string;
  home_team_id: string;
  home_team_name: string;
  home_team_abbrev: string;
  away_team_id: string;
  away_team_name: string;
  away_team_abbrev: string;
}

interface TeamPlayer {
  person_id: number;
  player_name: string;
  avg_pts: number;
  avg_reb: number;
  avg_ast: number;
  avg_min: number;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateOptions() {
  const today = new Date();
  return [0, 1, 2].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return {
      value: toDateString(d),
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    };
  });
}

export default function GamesPage({
  logicLogo,
  onLoginClick,
  onRegisterClick,
}: GamesPageProps) {
  const navigate = useNavigate();
  const dateOptions = getDateOptions();

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "home" | "away">>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<string, TeamPlayer[]>>({});
  const [loadingPlayers, setLoadingPlayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchGames = async () => {
      setLoadingGames(true);
      setExpandedGameId(null);
      setTeamPlayers({});
      try {
        const res = await fetch(`/api/players/games/schedule?date=${selectedDate}`);
        if (!res.ok) throw new Error("Failed to load games");
        const data: Game[] = await res.json();
        setGames(data);
      } catch (err) {
        console.error(err);
        setGames([]);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchGames();
  }, [selectedDate]);

  const fetchTeamPlayers = async (teamId: string) => {
    if (teamPlayers[teamId]) return;
    setLoadingPlayers((prev) => ({ ...prev, [teamId]: true }));
    try {
      const res = await fetch(`/api/players/games/team/${teamId}/players`);
      if (!res.ok) throw new Error("Failed to load players");
      const data: TeamPlayer[] = await res.json();
      setTeamPlayers((prev) => ({ ...prev, [teamId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlayers((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  const handleGameClick = async (game: Game) => {
    if (expandedGameId === game.game_id) {
      setExpandedGameId(null);
      return;
    }
    setExpandedGameId(game.game_id);
    setActiveTabs((prev) => ({ ...prev, [game.game_id]: "away" }));
    await Promise.all([
      fetchTeamPlayers(game.home_team_id),
      fetchTeamPlayers(game.away_team_id),
    ]);
  };

  const handleTabChange = (gameId: string, tab: "home" | "away") => {
    setActiveTabs((prev) => ({ ...prev, [gameId]: tab }));
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header
        logicLogo={logicLogo}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />

      <main className="flex-1 px-6 md:px-12 py-10">
        <div className="mb-8">
          <h1 className="text-white text-[42px] font-extrabold">Games</h1>
        </div>

        {/* Date selector */}
        <div className="flex gap-3 mb-8">
          {dateOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedDate(opt.value)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition border text-white ${
                selectedDate === opt.value
                  ? "border-[#f5c542] bg-[#f5c542]/10"
                  : "border-[#f5c542]/30 hover:border-[#f5c542]/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Games list */}
        {loadingGames ? (
          <p className="text-gray-400">Loading games...</p>
        ) : games.length === 0 ? (
          <p className="text-gray-400">No games scheduled for this date.</p>
        ) : (
          <div className="space-y-4">
            {games.map((game) => {
              const isExpanded = expandedGameId === game.game_id;
              const activeTab = activeTabs[game.game_id] ?? "away";
              const activeTeamId = activeTab === "home"
                ? game.home_team_id
                : game.away_team_id;
              const players = teamPlayers[activeTeamId] ?? [];
              const isLoadingPlayers =
                loadingPlayers[game.home_team_id] || loadingPlayers[game.away_team_id];

              const gameTime = new Date(game.game_datetime_est).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
              });

              return (
                <div
                  key={game.game_id}
                  className="rounded-2xl border border-[#f5c542]/20 bg-gradient-to-br from-[#1a1a1a] to-black overflow-hidden"
                >
                  {/* Game header */}
                  <div
                    onClick={() => handleGameClick(game)}
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#f5c542]/5 transition-colors"
                  >
                    <div className="flex items-center gap-8 w-full">
                    {/* Away team */}
                    <div className="flex items-center gap-2" style={{ width: '160px' }}>
                      <img
                        src={`https://cdn.nba.com/logos/nba/${game.away_team_id}/global/L/logo.svg`}
                        alt={game.away_team_abbrev}
                        style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="text-white font-bold text-xl">{game.away_team_abbrev}</span>
                    </div>

                    {/* @ sign */}
                    <span className="text-[#f5c542] font-bold text-sm">@</span>

                    {/* Home team */}
                    <div className="flex items-center gap-2" style={{ width: '160px' }}>
                      <img
                        src={`https://cdn.nba.com/logos/nba/${game.home_team_id}/global/L/logo.svg`}
                        alt={game.home_team_abbrev}
                        style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="text-white font-bold text-xl">{game.home_team_abbrev}</span>
                    </div>

                    {/* Divider */}
                    <span className="text-gray-700">|</span>

                    {/* Time */}
                    <span className="text-gray-500 text-sm">{gameTime} ET</span>
                  </div>

                    <span className="text-gray-500 text-sm">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Expanded player section */}
                  {isExpanded && (
                    <div className="border-t border-[#f5c542]/10">
                      {/* Tabs */}
                      <div className="flex">
                        <button
                          onClick={() => handleTabChange(game.game_id, "away")}
                          className={`flex-1 py-3 text-sm font-semibold transition ${
                            activeTab === "away"
                              ? "text-[#f5c542] border-b-2 border-[#f5c542]"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {game.away_team_name}
                        </button>
                        <button
                          onClick={() => handleTabChange(game.game_id, "home")}
                          className={`flex-1 py-3 text-sm font-semibold transition ${
                            activeTab === "home"
                              ? "text-[#f5c542] border-b-2 border-[#f5c542]"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {game.home_team_name}
                        </button>
                      </div>

                      {/* Player list */}
                      <div className="p-4">
                        {isLoadingPlayers ? (
                          <p className="text-gray-400 text-sm text-center py-4">
                            Loading players...
                          </p>
                        ) : players.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">
                            No player data available.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {/* Header row */}
                            <div className="flex items-center px-3 py-1 text-xs uppercase tracking-wide">
                              <span className="flex-1 text-[#00d4ff]">Player</span>
                              <span className="w-12 text-center text-[#00d4ff]">PTS</span>
                              <span className="w-12 text-center text-[#00d4ff]">REB</span>
                              <span className="w-12 text-center text-[#00d4ff]">AST</span>
                              <span className="w-12 text-center text-[#00d4ff]">MIN</span>
                            </div>

                            {/* Player rows */}
                            {players.map((player) => (
                              <div
                                key={player.person_id}
                                onClick={() => navigate(`/players/${player.person_id}`)}
                                className="flex items-center px-3 py-3 rounded-xl bg-black/40 hover:bg-[#f5c542]/10 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-white font-medium text-sm">
                                    {player.player_name}
                                  </span>
                                </div>
                                <span className="w-12 text-center text-[#f5c542] font-bold text-sm">
                                  {parseFloat(String(player.avg_pts)).toFixed(1)}
                                </span>
                                <span className="w-12 text-center text-[#f5c542] text-sm">
                                  {parseFloat(String(player.avg_reb)).toFixed(1)}
                                </span>
                                <span className="w-12 text-center text-[#f5c542] text-sm">
                                  {parseFloat(String(player.avg_ast)).toFixed(1)}
                                </span>
                                <span className="w-12 text-center text-[#f5c542] text-sm">
                                  {parseFloat(String(player.avg_min)).toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer logicLogo={logicLogo} />
    </div>
  );
}