import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, User, Mail, Phone, Building2, MapPin, Briefcase, FileText, ExternalLink, Ticket } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const interestAreas = [
  { value: "arsa", label: "Arsa Yatırımı" },
  { value: "konut", label: "Konut Projeleri" },
  { value: "ticari", label: "Ticari Gayrimenkul" },
  { value: "karma", label: "Karma Projeler" },
  { value: "diger", label: "Diğer" },
];

const participantTypes = [
  { value: "yatirimci", label: "Yatırımcı" },
  { value: "emlakci", label: "Emlak Danışmanı" },
  { value: "muteahhit", label: "Müteahhit" },
  { value: "danisman", label: "Danışman" },
  { value: "bireysel", label: "Bireysel Katılımcı" },
  { value: "diger", label: "Diğer" },
];

export default function VisitorRegisterPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", title: "",
    city: "", expectations: "", interest_area: "", participant_type: ""
  });
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
    const badgeUrl = `${process.env.REACT_APP_BACKEND_URL}${result.badge_url}`;
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-32 pb-24 px-4">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg">
            <div className="w-16 h-16 bg-summit-navy/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-navy" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl">Kaydınız Alındı!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              Arsa Yatırım Zirvesi 2026 ziyaretçi kaydınız başarıyla alınmıştır. Onay emaili gönderilmiştir.
            </p>
            <div className="bg-summit-paper rounded-md border border-gray-200 p-4 mt-6">
              <p className="text-summit-navy text-xs font-semibold uppercase tracking-wider mb-2">Yaka Kartınız</p>
              <p className="text-gray-600 text-xs mb-3">Etkinlik günü kayıt masasında teslim edilecektir. Önizlemek için:</p>
              <a href={badgeUrl} target="_blank" rel="noopener noreferrer"
                className="btn-navy px-5 py-2.5 inline-flex items-center gap-2" data-testid="view-badge-btn">
                Yaka Kartını Gör <ExternalLink size={14} />
              </a>
            </div>
            <a href="/" className="btn-outline-navy px-8 py-3 mt-4 inline-block">Ana Sayfaya Dön</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none transition-colors";
  const labelCls = "text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold";

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Ticket size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Ziyaretçi Kaydı</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">Zirveye Katılın</h1>
            <p className="text-gray-600 mt-4 text-sm max-w-xl mx-auto">
              Hilton İstanbul Bosphorus'taki zirvemize ücretsiz katılmak için aşağıdaki formu doldurun.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-10 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="visitor-register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Ad Soyad *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder="Adınız Soyadınız" value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-name" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>E-posta *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" required placeholder="ornek@email.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-email" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefon *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" required placeholder="+90 5XX XXX XXXX" value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-phone" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Şehir</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="İstanbul" value={form.city}
                      onChange={e => setForm({...form, city: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-city" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Şirket / Kurum</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Şirket adı" value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-company" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Unvan</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Unvanınız" value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})}
                      className={inputCls}
                      data-testid="input-visitor-title" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Katılımcı Türü</label>
                  <select value={form.participant_type}
                    onChange={e => setForm({...form, participant_type: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                    data-testid="input-visitor-type">
                    <option value="">Seçiniz</option>
                    {participantTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>İlgi Alanı</label>
                  <select value={form.interest_area}
                    onChange={e => setForm({...form, interest_area: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                    data-testid="input-visitor-interest">
                    <option value="">Seçiniz</option>
                    {interestAreas.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Zirveden Beklentileriniz</label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-gray-500" />
                  <textarea
                    placeholder="Hangi konuları öğrenmek istiyorsunuz?"
                    rows={3}
                    value={form.expectations}
                    onChange={e => setForm({...form, expectations: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                    data-testid="input-visitor-expectations"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="visitor-error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-navy py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-visitor-btn">
                {loading ? "Kaydediliyor..." : "Ziyaretçi Kaydını Tamamla"}
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
