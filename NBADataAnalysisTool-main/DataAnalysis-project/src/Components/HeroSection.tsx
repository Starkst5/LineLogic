import { ImageWithFallback } from "./figma/ImageWithFallBack";
import { useTheme } from "../context/ThemeContext";

interface HeroSectionProps {
  logicLogo: string;
  logicLogoLight?: string;
  onPlayNow: () => void;
  onJoinNow: () => void;
}

export function HeroSection({ logicLogo, logicLogoLight, onPlayNow, onJoinNow }: HeroSectionProps) {
  const { isDark } = useTheme();
  const activeLogo = isDark ? logicLogo : (logicLogoLight ?? logicLogo);


  return (
    <section
      className="relative min-h-[600px] flex items-center justify-center overflow-hidden pt-20"
      style={{
        background: isDark
          ? "linear-gradient(to bottom right, #000000, #0f0f0f, #000000)"
          : "linear-gradient(to bottom right, #ffffff, #f3f3f5, #ffffff)",
      }}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f5c542]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left space-y-6">
            <div className="inline-block px-4 py-2 bg-[#f5c542]/10 border border-[#f5c542]/30 rounded-full">
              <span className="text-[#f5c542]" style={{ fontSize: "14px", letterSpacing: "2px" }}>
                PREMIUM ANALYTICS
              </span>
            </div>

            <h1
              style={{ fontSize: "56px", fontWeight: 800, lineHeight: "1.1", letterSpacing: "-1px", color: isDark ? "#ffffff" : "#111111" }}
            >
              WELCOME TO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5c542] via-[#ffd700] to-[#f5c542]">
                LINELOGIC
              </span>
            </h1>

            <p className="text-[#00d4ff]" style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "3px" }}>
              INSIGHT · ANALYZE · WIN
            </p>

            <p style={{ fontSize: "18px", maxWidth: "500px", margin: "0 auto", color: isDark ? "#9ca3af" : "#555555" }}>
              The ultimate sports analytics experience with unmatched projections and smarter decisions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button
                onClick={onPlayNow}
                className="px-8 py-4 bg-gradient-to-r from-[#f5c542] to-[#d4a527] text-black rounded-2xl shadow-[0_0_30px_rgba(245,197,66,0.5)] hover:shadow-[0_0_40px_rgba(245,197,66,0.8)] transition-all transform hover:scale-105"
                style={{ fontSize: "18px", fontWeight: 700 }}
              >
                Login
              </button>
              <button
                onClick={onJoinNow}
                className="px-8 py-4 bg-[#00d4ff]/10 text-[#00d4ff] border-2 border-[#00d4ff] rounded-2xl hover:bg-[#00d4ff]/20 shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] transition-all transform hover:scale-105"
                style={{ fontSize: "18px", fontWeight: 700 }}
              >
                Join Now
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f5c542] via-[#ff8c00] to-[#00d4ff] opacity-30 blur-3xl animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#f5c542]/50 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="relative w-[400px] h-[400px] rounded-full overflow-hidden border-4 border-[#f5c542] shadow-[0_0_50px_rgba(245,197,66,0.6),0_0_100px_rgba(255,140,0,0.4),0_0_150px_rgba(0,212,255,0.3)]">
                <ImageWithFallback
                  src={activeLogo}
                  alt="LINELOGIC Hero"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff8c00]/20 via-transparent to-[#00d4ff]/20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}