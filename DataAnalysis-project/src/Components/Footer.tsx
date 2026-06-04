import { Facebook, Twitter, Instagram, Youtube, Mail, MessageCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallBack";
import { useTheme } from "../context/ThemeContext";
import logicLogoLight from "../assets/LineLogicLogoLight.png";
import { useNavigate } from "react-router-dom";

interface FooterProps {
  logicLogo: string;
}

export function Footer({ logicLogo }: FooterProps) {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const activeLogo = isDark ? logicLogo : logicLogoLight;
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textMuted = isDark ? "#9ca3af" : "#555555";
  const textFaint = isDark ? "#6b7280" : "#888888";
  const bg = isDark ? "#000000" : "#ffffff";
  const cardBg = isDark ? "#0f0f0f" : "#f3f3f5";

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/about");
  };

  return (
    <footer className="border-t border-[#f5c542]/20" style={{ backgroundColor: bg }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#f5c542]">
                <ImageWithFallback
                  src={activeLogo}
                  alt="LINELOGIC"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-[#f5c542]" style={{ fontSize: "18px", fontWeight: 700 }}>
                LINELOGIC
              </div>
            </div>

            <p style={{ fontSize: "14px", color: textMuted }}>
              Premium projections and next-level analytics designed to give you the edge.
            </p>

            <div className="flex gap-3 mt-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-[#f5c542]/10 hover:bg-[#f5c542]/20 border border-[#f5c542]/30 rounded-lg flex items-center justify-center transition-all"
                >
                  <Icon className="text-[#f5c542]" size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h3
              className="mb-4"
              style={{ fontSize: "18px", fontWeight: 700, color: textPrimary }}
            >
              Support
            </h3>

            <ul className="space-y-2">
              {["Help Center", "Payment Methods"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="hover:text-[#f5c542] transition-colors"
                    style={{ color: textMuted }}
                  >
                    {item}
                  </a>
                </li>
              ))}

              {/* ✅ FIXED ABOUT US LINK */}
              <li>
                <a
                  href="#"
                  onClick={handleAboutClick}
                  className="hover:text-[#f5c542] transition-colors"
                  style={{ color: textMuted }}
                >
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="mb-4"
              style={{ fontSize: "18px", fontWeight: 700, color: textPrimary }}
            >
              Contact Us
            </h3>

            <div className="space-y-3">
              <a
                href="mailto:support@linelogic.com"
                className="flex items-center gap-3 hover:text-[#f5c542] transition-colors"
                style={{ color: textMuted }}
              >
                <Mail size={18} />
                <span>support@linelogic.com</span>
              </a>

              <a
                href="#"
                className="flex items-center gap-3 hover:text-[#f5c542] transition-colors"
                style={{ color: textMuted }}
              >
                <MessageCircle size={18} />
                <span>Live Chat 24/7</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#f5c542]/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p style={{ fontSize: "14px", color: textFaint }}>
              © 2025 LINELOGIC. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span style={{ fontSize: "14px", color: textFaint }}>
                🔒 SSL Secured
              </span>
              <span style={{ fontSize: "14px", color: textFaint }}>
                ✓ Licensed
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}