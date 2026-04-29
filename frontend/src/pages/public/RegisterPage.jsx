import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, User, Mail, Phone, Building2, MapPin, Briefcase } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", title: "", city: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/register/member`, form);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="bg-summit-paper border border-summit-gold/30 rounded-2xl p-10 max-w-md w-full text-center gold-glow">
            <div className="w-16 h-16 bg-summit-gold/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-gold" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl font-bold">Üyeliğiniz Oluşturuldu!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              Arsa Yatırım Zirvesi 2026 üyeliğiniz başarıyla oluşturulmuştur. Tüm güncellemelerden haberdar olacaksınız.
            </p>
            <a href="/" className="btn-gold px-8 py-3 text-sm mt-6 inline-block">Ana Sayfaya Dön</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="section-overline">Ücretsiz</span>
            <h1 className="font-heading text-summit-navy text-4xl sm:text-5xl">Üyelik Oluştur</h1>
            <p className="text-gray-600 mt-4 text-sm">
              Zirveyle ilgili tüm güncellemelerden haberdar olmak için üye olun.
            </p>
          </div>

          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="member-register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Ad Soyad *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      placeholder="Adınız Soyadınız"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">E-posta *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="ornek@email.com"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Telefon</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="tel"
                      placeholder="+90 5XX XXX XXXX"
                      value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Şirket / Kurum</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Şirket adı"
                      value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-company"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Unvan</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Unvanınız"
                      value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-title"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Şehir</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="İstanbul"
                      value={form.city}
                      onChange={e => setForm({...form, city: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-city"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm" data-testid="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gold py-3.5 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-register-btn"
              >
                {loading ? "Kaydediliyor..." : "Ücretsiz Üye Ol"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Üyelik tamamen ücretsizdir. Kişisel verileriniz güvenle saklanmaktadır.
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
