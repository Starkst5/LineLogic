import { X } from "lucide-react";
import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      navigate("/players");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      onClose();
      navigate("/players");
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ✅ FIX ONLY: open register modal from login
  const handleSignUp = () => {
    onClose();
    const event = new CustomEvent("open-register-modal");
    window.dispatchEvent(event);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a1a] to-black rounded-3xl border-2 border-[#f5c542]/30 shadow-[0_0_50px_rgba(245,197,66,0.3)] p-8">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-white mb-2 text-[32px] font-bold">
            Welcome Back
          </h2>
          <p className="text-gray-400">
            Login to continue your winning streak
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleLogin}>
          
          <div>
            <label className="block text-white mb-2">
              Email
            </label>
            <input 
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#f5c542]/30 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#f5c542] transition-colors"
            />
          </div>

          <div>
            <label className="block text-white mb-2">
              Password
            </label>
            <input 
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#f5c542]/30 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#f5c542] transition-colors"
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[#f5c542]/30" 
              />
              <span className="text-[14px]">Remember me</span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[#f5c542] hover:text-[#ffd700] transition-colors text-[14px]"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#f5c542] to-[#d4a527] text-black rounded-xl hover:shadow-[0_0_30px_rgba(245,197,66,0.6)] transition-all text-[16px] font-bold"
          >
            Login
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#f5c542]/20"></div>
          <span className="text-gray-500 text-[14px]">OR</span>
          <div className="flex-1 h-px bg-[#f5c542]/20"></div>
        </div>

        {/* Google Login */}
        <div className="space-y-3">
          <button 
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-[#0f0f0f] border border-[#f5c542]/30 rounded-xl text-white hover:bg-[#f5c542]/10 transition-all"
          >
            Continue with Google
          </button>
        </div>

        {/* Sign Up Link (FIXED ONLY HERE) */}
        <p className="text-center text-gray-400 mt-6">
          Don't have an account?{" "}
          <span 
            onClick={handleSignUp}
            className="text-[#f5c542] hover:text-[#ffd700] transition-colors font-semibold cursor-pointer"
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}





