import { X } from "lucide-react";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onClose();
      navigate("/players");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a1a] to-black rounded-3xl border-2 border-[#f5c542]/30 shadow-[0_0_50px_rgba(245,197,66,0.3)] p-8">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-white mb-2 text-[32px] font-bold">
            Create Account
          </h2>
          <p className="text-gray-400">
            Join and start building your winning strategy
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleRegister}>
          <div>
            <label className="block text-white mb-2">
              Email
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#f5c542]/30 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#f5c542] transition-colors"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#f5c542] to-[#d4a527] text-black rounded-xl hover:shadow-[0_0_30px_rgba(245,197,66,0.6)] transition-all text-[16px] font-bold"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}



