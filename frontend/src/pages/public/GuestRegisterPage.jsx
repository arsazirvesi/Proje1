import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, User, Mail, Phone, Building2, MapPin, Briefcase, FileText, ExternalLink } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function GuestRegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", title: "", city: "", expectations: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register/guest`, form);
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const badgeUrl = `${API.replace(/\/api$/, "")}${result.badge_url}`;
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="bg-summit-paper border border-summit-gold/30 rounded-2xl p-10 max-w-md w-full text-center gold-glow">
            <div className="w-16 h-16 bg-summit-gold/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-gold" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl font-bold">Kaydınız Alındı!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              Arsa Yatırım Zirvesi 2026 kaydınız başarıyla alınmıştır. Onay emaili gönderilmiştir.
            </p>
            <div className="bg-gray-50 rounded-xl border border-summit-gold/20 p-4 mt-6">
              <p className="text-summit-gold text-xs font-semibold uppercase tracking-wider mb-2">Yaka Kartınız</p>
              <p className="text-gray-600 text-xs mb-3">Etkinlik günü kayıt masasında teslim edilecektir. Aşağıdan önizleyebilirsiniz:</p>
              <a href={badgeUrl} target="_blank" rel="noopener noreferrer"
                className="btn-gold px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="view-badge-btn">
                Yaka Kartını Gör <ExternalLink size={14} />
              </a>
            </div>
            <a href="/" className="btn-outline-gold px-8 py-3 text-sm mt-4 inline-block">Ana Sayfaya Dön</a>
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
            <span className="section-overline">21 Mayıs 2026</span>
            <h1 className="font-heading text-summit-navy text-4xl sm:text-5xl">Zirve Kaydı</h1>
            <p className="text-gray-600 mt-4 text-sm">
              Hilton İstanbul Bosphorus'taki zirvemize katılmak için kayıt oluşturun. Ücretsizdir.
            </p>
          </div>

          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="guest-register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Ad Soyad *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder="Adınız Soyadınız" value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-name" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">E-posta *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" required placeholder="ornek@email.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-email" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Telefon *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" required placeholder="+90 5XX XXX XXXX" value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-phone" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Şirket / Kurum</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Şirket adı" value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-company" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Unvan</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Unvanınız" value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-title" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Şehir</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="İstanbul" value={form.city}
                      onChange={e => setForm({...form, city: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors"
                      data-testid="input-guest-city" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Zirveden Beklentileriniz</label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-gray-500" />
                  <textarea
                    placeholder="Hangi konuları öğrenmek istiyorsunuz?"
                    rows={3}
                    value={form.expectations}
                    onChange={e => setForm({...form, expectations: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 transition-colors resize-none"
                    data-testid="input-guest-expectations"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm" data-testid="guest-error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gold py-3.5 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-guest-btn"
              >
                {loading ? "Kaydediliyor..." : "Zirveye Ücretsiz Katıl"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Katılım tamamen ücretsizdir. Yaka kartınız etkinlik günü hazır olacaktır.
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
