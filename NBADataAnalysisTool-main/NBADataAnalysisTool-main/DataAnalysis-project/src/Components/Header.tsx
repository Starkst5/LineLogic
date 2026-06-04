import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { useTheme } from "../context/ThemeContext";
import logicLogoLight from "../assets/LineLogicLogoLight.png";

interface HeaderProps {
  logicLogo: string;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export function Header({
  logicLogo,
  onLoginClick,
  onRegisterClick,
}: HeaderProps) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const activeLogo = isDark ? logicLogo : logicLogoLight;

  const firstName = user
    ? user.displayName
      ? user.displayName.split(" ")[0]
      : user.email?.split("@")[0]
    : null;

  return (
    <header
      className="border-b border-[#f5c542]/20 px-6 py-4"
      style={{ backgroundColor: isDark ? "#000000" : "#ffffff" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <img src={activeLogo} alt="Logo" className="w-10 h-10" />
          <span
            className="font-bold text-xl"
            style={{ color: isDark ? "#ffffff" : "#111111" }}
          >
            LINELOGIC
          </span>
        </div>

        {/* Center: Welcome Back */}
        <div className="flex-1 flex justify-center">
          {firstName && (
            <span
              className="font-semibold text-lg"
              style={{ color: isDark ? "#ffffff" : "#111111" }}
            >
              Welcome back, {firstName}
            </span>
          )}
        </div>

        {/* Right: Navigation */}
        <nav className="flex items-center gap-8">
          <Link
            to="/"
            className="hover:text-[#f5c542] transition"
            style={{ color: isDark ? "#ffffff" : "#111111" }}
          >
            Home
          </Link>
          <Link
            to="/players"
            className="hover:text-[#f5c542] transition"
            style={{ color: isDark ? "#ffffff" : "#111111" }}
          >
            Players
          </Link>
          <Link
            to="/games"
            className="hover:text-[#f5c542] transition"
            style={{ color: isDark ? "#ffffff" : "#111111" }}
          >
            Games
          </Link>
          <Link
            to="/about"
            className="hover:text-[#f5c542] transition"
            style={{ color: isDark ? "#ffffff" : "#111111" }}
          >
            About Us
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-lg"
            title="Toggle theme"
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {user ? (
            <button
              onClick={() => signOut(auth)}
              className="hover:text-white text-sm transition"
              style={{ color: isDark ? "#9ca3af" : "#555555" }}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={onLoginClick}
                className="hover:text-[#f5c542] transition"
                style={{ color: isDark ? "#ffffff" : "#111111" }}
              >
                Login
              </button>
              <button
                onClick={onRegisterClick}
                className="bg-[#f5c542] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Register
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}