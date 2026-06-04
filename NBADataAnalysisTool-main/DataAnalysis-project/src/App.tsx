import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./Components/ProtectedRoute";
import { Header } from "./Components/Header";
import { Footer } from "./Components/Footer";
import { HeroSection } from "./Components/HeroSection";
import { LoginModal } from "./Components/LoginModal";
import { RegisterModal } from "./Components/RegisterModal";
import GamesPage from "./Pages/GamesPage";
import PlayersPage from "./Pages/PlayersPage";
import PlayerPage from "./Pages/PlayerPage";
import AboutPage from "./Pages/AboutPage";
import logicLogo from "./assets/LineLogicLogo.png";
import { ThemeProvider } from "./context/ThemeContext";
import logicLogoLight from "./assets/LineLogicLogoLight.png";


import { auth } from "./firebase";


export default function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // ✅ listens for login modal "Sign Up" click
  useEffect(() => {
    const handler = () => {
      setLoginOpen(false);
      setRegisterOpen(true);
    };

    window.addEventListener("open-register-modal", handler);
    return () => window.removeEventListener("open-register-modal", handler);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

          {/* ================= HOME PAGE ================= */}
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-black">
                <Header
                  logicLogo={logicLogo}
                  onLoginClick={() => setLoginOpen(true)}
                  onRegisterClick={() => setRegisterOpen(true)}
                />
                <HeroSection
                  logicLogo={logicLogo}
                  logicLogoLight={logicLogoLight}
                  onPlayNow={() => setLoginOpen(true)}
                  onJoinNow={() => setRegisterOpen(true)}
                />
                <Footer logicLogo={logicLogo} />

                <LoginModal
                  isOpen={loginOpen}
                  onClose={() => setLoginOpen(false)}
                />
                <RegisterModal
                  isOpen={registerOpen}
                  onClose={() => setRegisterOpen(false)}
                />
              </div>
            }
          />

          {/* ================= PROTECTED ROUTES ================= */}
          <Route
            path="/players"
            element={
              <ProtectedRoute>
                <PlayersPage
                  logicLogo={logicLogo}
                  onLoginClick={() => setLoginOpen(true)}
                  onRegisterClick={() => setRegisterOpen(true)}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/players/:id"
            element={
              <ProtectedRoute>
                <PlayerPage
                  logicLogo={logicLogo}
                  onLoginClick={() => setLoginOpen(true)}
                  onRegisterClick={() => setRegisterOpen(true)}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GamesPage
                  logicLogo={logicLogo}
                  onLoginClick={() => setLoginOpen(true)}
                  onRegisterClick={() => setRegisterOpen(true)}
                />
              </ProtectedRoute>
            }
          />

          {/* ================= ABOUT PAGE ================= */}
          <Route
            path="/about"
            element={
              <AboutPage
                logicLogo={logicLogo}
                onLoginClick={() => setLoginOpen(true)}
                onRegisterClick={() => setRegisterOpen(true)}
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  );
}