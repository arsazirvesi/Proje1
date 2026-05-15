import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function ExpertLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role !== "expert" && user.role !== "admin") {
        setErr("Bu hesap uzman paneline erişemiyor");
        setLoading(false);
        return;
      }
      navigate("/uzman/yatirim-oyunu", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.detail || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-summit-navy via-[#1A264F] to-[#0F1833] flex items-center justify-center px-4 font-body relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 backdrop-blur-sm border border-amber-400/40 rounded-full px-4 py-1.5 mb-4">
            <Sparkles size={13} className="text-amber-300" />
            <span className="text-[11px] tracking-wider uppercase font-semibold text-amber-100">Uzman Paneli</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-white">Hoş Geldiniz</h1>
          <p className="text-white/70 text-sm mt-1.5">Arsa Yatırım Zirvesi simülatör değerlendirme paneli</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4" data-testid="expert-login-form">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5 block flex items-center gap-1.5">
              <Mail size={11} className="text-amber-500" /> E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="uzman@arsayatirim.com"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy transition-colors"
              data-testid="expert-email"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5 block flex items-center gap-1.5">
              <Lock size={11} className="text-amber-500" /> Şifre
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 pr-10 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy transition-colors"
                data-testid="expert-password"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-summit-navy">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5 text-xs flex items-start gap-1.5"><AlertCircle size={12} className="shrink-0 mt-0.5" />{err}</div>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gradient-to-r from-summit-navy to-summit-navy-dark hover:shadow-xl text-white rounded-lg py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            data-testid="expert-login-btn"
          >
            <LogIn size={15} /> {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <p className="text-[11px] text-gray-400 text-center pt-2 border-t border-gray-100">
            Erişim için sistem yöneticinizden uzman hesabı talep edin.
          </p>
        </form>
      </div>
    </div>
  );
}
