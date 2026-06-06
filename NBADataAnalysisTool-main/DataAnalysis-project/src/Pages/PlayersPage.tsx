import { useState } from "react";
import { API_BASE } from '../lib/api';
import { useNavigate } from "react-router-dom";
import { Header } from "../Components/Header";
import { Footer } from "../Components/Footer";
import { Search } from "lucide-react";

interface PlayersPageProps {
  logicLogo: string;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

interface PlayerSearchResult {
  person_id: number;
  player_name: string;
  photo_url?: string;
  games_in_db: number;
  latest_game: string;
  opponent_abbr?: string;
  h2h_pts?: number;
  h2h_reb?: number;
  h2h_ast?: number;
  h2h_blk?: number;
}

function StatBadge({ label, value }: { label: string; value?: number }) {
  const num =
    value !== undefined && value !== null
      ? parseFloat(String(value))
      : null;

  return (
    <div className="flex flex-col items-center bg-black/40 rounded-xl px-3 py-2 min-w-[56px]">
      <span className="text-[#f5c542] font-bold text-base leading-tight">
        {num !== null && !isNaN(num) ? num.toFixed(1) : "—"}
      </span>
      <span className="text-gray-500 text-[11px] uppercase tracking-wide mt-0.5">
        {label}
      </span>
    </div>
  );
}

export default function PlayersPage({
  logicLogo,
  onLoginClick,
  onRegisterClick,
}: PlayersPageProps) {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handlePlayerClick = (id: number) => {
    navigate("/players/" + id);
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setPlayers([]);

    try {
      const url = `${API_BASE}/api/players/search?search=${encodeURIComponent(searchInput)}`;
      const response = await fetch(url);
      const data: PlayerSearchResult[] = await response.json();
      setPlayers(data);
    } catch (err) {
      setError("Failed to fetch matching players.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event: any) => {
      setSearchInput(event.results[0][0].transcript);
    };
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
          <h1 className="text-white text-[42px] font-extrabold">
            Players
          </h1>
          <p className="text-gray-400 mt-2">
            Search for a player and view matching current players
          </p>
        </div>

        {/* SEARCH */}
        <div className="mb-8 flex justify-center">
          <div className="w-full max-w-md p-4 rounded-2xl border border-[#f5c542]/20 bg-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={loading ? "" : searchInput}
                onChange={(e) => !loading && setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder={loading ? "Loading player data..." : "Search players..."}
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-center"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="text-[#f5c542] px-2 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-[#f5c542]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : (
                  <Search size={20} />
                )}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* RESULTS */}
        {loading ? null : players.length > 0 ? (
          <div className="flex flex-col items-center space-y-4">
            {players.map((player) => {
              const fallbackImg = `https://cdn.nba.com/headshots/nba/latest/260x190/${player.person_id}.png`;
              const imgSrc = player.photo_url || fallbackImg;

              return (
                <div
                  key={player.person_id}
                  className="w-full flex justify-center"
                >
                  <div
                    onClick={() => handlePlayerClick(player.person_id)}
                    className="w-full max-w-md cursor-pointer p-4 rounded-2xl border border-[#f5c542]/20 bg-gradient-to-br from-[#1a1a1a] to-black flex justify-between items-center hover:border-[#f5c542] transition-colors"
                  >
                    {/* LEFT */}
                    <div className="flex flex-col gap-3">
                      <p className="text-white font-bold text-lg">
                        {player.player_name}
                      </p>

                      {player.opponent_abbr && (
                        <p className="text-white text-xs">
                          Next: vs {player.opponent_abbr}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <StatBadge label="PTS" value={player.h2h_pts} />
                        <StatBadge label="REB" value={player.h2h_reb} />
                        <StatBadge label="AST" value={player.h2h_ast} />
                        <StatBadge label="BLK" value={player.h2h_blk} />
                      </div>

                      <p className="text-gray-500 text-xs mt-1">
                        2025-26 Season Avg
                      </p>
                    </div>

                    {/* RIGHT IMAGE */}
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={imgSrc}
                        alt={player.player_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#f5c542]/30"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/56x56?text=N/A";
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasSearched ? (
          <div className="flex justify-center">
            <div className="max-w-md w-full rounded-3xl border border-[#f5c542]/20 bg-gradient-to-br from-[#1a1a1a] to-black p-8 text-center">
              <h2 className="text-white text-[26px] font-bold mb-3">
                No Players Found
              </h2>
            </div>
          </div>
        ) : null}
      </main>

      <Footer logicLogo={logicLogo} />
    </div>
  );
}