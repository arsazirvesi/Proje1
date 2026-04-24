import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        setError("Bu sayfaya erişim yetkiniz yok.");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Giriş başarısız. Bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-summit-paper flex items-center justify-center px-4 font-body"
      style={{
        backgroundImage: "radial-gradient(ellipse at 20% 30%, rgba(201,148,26,0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(26,39,68,0.05) 0%, transparent 55%)"
      }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="font-heading font-bold text-summit-navy text-lg">AYZ</span>
          </div>
          <h1 className="font-heading text-summit-navy text-2xl font-bold">Yönetici Paneli</h1>
          <p className="text-gray-500 text-sm mt-1">Arsa Yatırım Zirvesi 2026</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="admin-login-form">
            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">E-posta</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@arsayatirim.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                  data-testid="admin-email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Şifre</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-10 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-summit-navy transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="admin-login-btn"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          <a href="/" className="hover:text-summit-gold transition-colors">← Ana Siteye Dön</a>
        </p>
      </div>
    </div>
  );
}
