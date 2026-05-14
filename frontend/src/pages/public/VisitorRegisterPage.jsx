import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import KvkkConsent from "../../components/KvkkConsent";
import {
  CheckCircle, User, Mail, Phone, Building2, MapPin, Briefcase, FileText,
  ExternalLink, Ticket, Store, ArrowLeft, Users as UsersIcon, Check, Info, KeyRound, Loader2, X
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

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

const VISIT_META = {
  summit: {
    key: "summit",
    tag: "Zirve + Fuar Ziyareti",
    title: "Arsa Yatırım Zirvesi 2026",
    subtitle: "Konferans · Panel · Networking · Tam Gün + Fuar Geçişi Dahil",
    formTitle: "Zirve + Fuar Ziyaret Kaydı",
    formSubtitle: "21 Mayıs Perşembe günü, Hilton İstanbul Bosphorus Zirve Salonu'ndaki konferans ve panel programına katılmak için formu doldurun. Bu kayıt aynı zamanda fuar alanına ek başvuru olmadan giriş hakkı verir.",
    successMessage: "Arsa Yatırım Zirvesi 2026 ziyaretçi kaydınız başarıyla alınmıştır.",
  },
  fair: {
    key: "fair",
    tag: "Sadece Fuar Ziyareti",
    title: "8. Gayrimenkul Proje Yatırım Fuarı",
    subtitle: "Proje Fuarı · Maket Sergisi · Yatırım Fırsatları · Sınırsız Katılım",
    formTitle: "Fuar Ziyaret Kaydı",
    formSubtitle: "20-21 Mayıs'ta Hilton İstanbul Bosphorus'taki gayrimenkul proje fuarını ziyaret etmek için formu doldurun. Katılım ücretsiz ve sınırsızdır.",
    successMessage: "8. Gayrimenkul Proje Fuar ziyareti kaydınız başarıyla alınmıştır.",
  },
};

export default function VisitorRegisterPage() {
  const [visitType, setVisitType] = useState(null); // null | "summit" | "fair"
  const [kvkk, setKvkk] = useState(false);
  const location = useLocation();

  // Auto-select visit type based on URL path so a direct link can deep-link to either tab
  useEffect(() => {
    const p = location.pathname;
    if (p === "/zirve-kaydi") setVisitType("summit");
    else if (p === "/fuar-kaydi") setVisitType("fair");
    // /ziyaretci-kaydi keeps the chooser screen (visitType=null)
  }, [location.pathname]);
  const [capacity, setCapacity] = useState(null);
  const [seoContact, setSeoContact] = useState({ phone: "+90 535 259 93 77", invitePhone: "+90 533 728 01 02" });

  // Fetch contact phones from SEO settings (admin-editable)
  useEffect(() => {
    axios.get(`${API}/seo`).then(r => {
      const d = r.data || {};
      setSeoContact({
        phone: d.contact_phone || "+90 535 259 93 77",
        invitePhone: d.invite_code_phone || "+90 533 728 01 02",
      });
    }).catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", title: "",
    city: "", expectations: "", interest_area: "", participant_type: "",
    invite_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [codeStatus, setCodeStatus] = useState(null); // null | "checking" | "valid" | "invalid"
  const [codeMessage, setCodeMessage] = useState("");

  useEffect(() => {
    axios.get(`${API}/register/capacity`).then(r => setCapacity(r.data)).catch(() => {});
  }, []);

  // Validate invite code on blur or after typing
  const validateCode = async () => {
    const code = (form.invite_code || "").trim();
    if (!code) {
      setCodeStatus(null);
      setCodeMessage("");
      return;
    }
    setCodeStatus("checking");
    try {
      const { data } = await axios.post(`${API}/register/validate-code`, {
        code,
        visit_type: visitType || "summit",
      });
      if (data.valid) {
        setCodeStatus("valid");
        setCodeMessage(data.label ? `Kod geçerli (${data.label})` : "Kod geçerli");
      } else {
        setCodeStatus("invalid");
        setCodeMessage(data.reason || "Kod geçersiz");
      }
    } catch {
      setCodeStatus("invalid");
      setCodeMessage("Kod doğrulanamadı");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Davet kodu sadece Zirve için zorunlu
    if (visitType === "summit" && codeStatus !== "valid") {
      setError("Lütfen geçerli bir davet kodu girin ve doğrulayın.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register/guest`, {
        ...form,
        visit_type: visitType,
      });
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // === STEP 3: Success — both summit & fair auto-verified, badge ready immediately ===
  if (result) {
    const meta = VISIT_META[visitType] || VISIT_META.summit;
    const badgeUrl = result.badge_url ? `${API.replace(/\/api$/, "")}${result.badge_url}` : null;
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-32 pb-24 px-4">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg" data-testid="register-success-card">
            <div className="w-16 h-16 bg-summit-accent/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-navy" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl">Kaydınız Tamamlandı!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              {meta.successMessage} Yaka kartınız <strong>{form.email}</strong> adresine gönderildi.
            </p>
            {badgeUrl && (
              <div className="bg-summit-paper rounded-md border-l-4 border-summit-navy p-4 mt-6 text-left">
                <p className="text-summit-navy text-xs font-semibold uppercase tracking-wider mb-2">Yaka Kartınız</p>
                <p className="text-gray-700 text-sm mb-3">
                  Etkinlik günü kayıt masasında yaka kartınız hazır olacaktır. Aşağıdan önizleyebilir veya cep telefonunuza kaydedebilirsiniz.
                </p>
                <a href={badgeUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-gold px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="view-badge-btn">
                  Yaka Kartını Gör <ExternalLink size={14} />
                </a>
              </div>
            )}
            <p className="text-gray-400 text-xs mt-5 leading-relaxed">
              Mailimiz birkaç dakika içinde gelmezse Spam klasörünü kontrol edin.
            </p>
            <a href="/" className="btn-outline-navy px-8 py-3 mt-6 inline-block" data-testid="back-home-btn">Ana Sayfaya Dön</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // === STEP 1: Choose visit type ===
  if (!visitType) {
    const summitCap = capacity?.summit;
    const summitFull = summitCap?.is_full;
    const fillPct = summitCap ? Math.min(100, Math.round((summitCap.registered / summitCap.capacity) * 100)) : 0;

    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-28 pb-20 bg-summit-paper">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
                <Ticket size={14} className="text-summit-navy" />
                <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Ücretsiz Kayıt</span>
              </div>
              <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl" data-testid="visit-picker-title">
                Neye Katılmak İstersiniz?
              </h1>
              <p className="text-gray-600 mt-4 text-sm max-w-xl mx-auto">
                Aynı mekânda iki ayrı etkinlik: <strong>konferans programına dahil Zirve</strong> ve <strong>proje fuarı ziyareti</strong>. Her ikisi de ücretsizdir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* SUMMIT CARD */}
              <button
                type="button"
                onClick={() => !summitFull && setVisitType("summit")}
                disabled={summitFull}
                className={`group text-left bg-white rounded-md overflow-hidden transition-all shadow-md ring-1 ring-black/5
                  ${summitFull
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-2xl hover:ring-summit-navy/30 hover:-translate-y-1 cursor-pointer"}`}
                data-testid="visit-option-summit"
              >
                <div className="relative w-full overflow-hidden bg-summit-navy" style={{ height: 280 }}>
                  <img
                    src="https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/6ol0ek8g_Arsa%20Yat%C4%B1r%C4%B1m%20Zirvesi.jpeg"
                    alt="Arsa Yatırım Zirvesi"
                    className="block w-full h-full"
                    style={{ objectFit: "cover", objectPosition: "center", display: "block" }}
                  />
                </div>
                <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-md bg-summit-navy/10 flex items-center justify-center text-summit-navy group-hover:bg-summit-navy group-hover:text-white transition-colors">
                    <Ticket size={22} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-summit-navy bg-summit-navy/8 px-2.5 py-1 rounded">
                    {VISIT_META.summit.tag}
                  </span>
                </div>
                <h3 className="font-heading text-summit-navy text-xl leading-tight">{VISIT_META.summit.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{VISIT_META.summit.subtitle}</p>

                <ul className="mt-5 space-y-1.5 text-xs text-gray-700">
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Uzman konuşmacılar ve panel programı</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Kahve molası + öğle ikramı</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Plaket takdimi ve networking</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Fuara da ek başvuru olmadan geçiş</li>
                </ul>

                {/* === LIVE CAPACITY METER (highly visible — FOMO design) === */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {summitCap && (() => {
                    const remaining = summitCap.remaining;
                    const isCritical = remaining <= 50 && remaining > 0;
                    const isLow = remaining <= 150 && remaining > 50;
                    const meterColor = summitFull
                      ? "bg-gradient-to-r from-red-600 to-red-500"
                      : isCritical
                        ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
                        : isLow
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-gradient-to-r from-summit-navy to-summit-accent";
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {/* Live pulse dot */}
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${summitFull ? "bg-red-500" : isCritical ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500"}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${summitFull ? "bg-red-600" : isCritical ? "bg-red-600" : isLow ? "bg-amber-600" : "bg-green-600"}`}></span>
                            </span>
                            <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${summitFull ? "text-red-600" : isCritical ? "text-red-600" : isLow ? "text-amber-700" : "text-summit-navy"}`}>
                              {summitFull ? "Kontenjan Doldu" : "Canlı Kontenjan"}
                            </span>
                          </div>
                          <span className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-semibold">
                            {summitCap.registered} / {summitCap.capacity}
                          </span>
                        </div>

                        {/* HUGE Counter — kalan yer */}
                        {!summitFull && (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className={`font-heading text-4xl font-black leading-none tabular-nums
                              ${isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-summit-navy"}`}
                              data-testid="capacity-remaining-big">
                              {remaining}
                            </span>
                            <span className={`text-xs font-semibold uppercase tracking-wider
                              ${isCritical ? "text-red-600" : isLow ? "text-amber-700" : "text-gray-600"}`}>
                              kişilik yer kaldı
                            </span>
                          </div>
                        )}
                        {summitFull && (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-heading text-3xl font-black leading-none text-red-600">
                              0
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                              boş yer kalmadı
                            </span>
                          </div>
                        )}

                        {/* Progress bar — bigger, gradient, pulse on critical */}
                        <div className={`relative w-full h-3 bg-gray-100 rounded-full overflow-hidden border ${isCritical && !summitFull ? "border-red-200 ring-2 ring-red-500/20" : "border-gray-200"}`}>
                          <div
                            className={`h-full ${meterColor} transition-all duration-1000 relative`}
                            style={{ width: `${fillPct}%` }}
                          >
                            {/* Animated stripe overlay for critical state */}
                            {(isCritical || summitFull) && (
                              <div className="absolute inset-0 opacity-30"
                                style={{
                                  backgroundImage: "linear-gradient(45deg,rgba(255,255,255,0.4) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.4) 50%,rgba(255,255,255,0.4) 75%,transparent 75%,transparent)",
                                  backgroundSize: "16px 16px",
                                  animation: "stripeMove 1s linear infinite"
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Urgency message */}
                        {!summitFull && isCritical && (
                          <p className="mt-2.5 text-[0.7rem] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                            ⚠ Acil! Son birkaç yer — hemen kaydol
                          </p>
                        )}
                        {!summitFull && isLow && !isCritical && (
                          <p className="mt-2.5 text-[0.7rem] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                            🔥 Hızlı dolduruyor — geç kalmayın
                          </p>
                        )}
                        {!summitFull && !isCritical && !isLow && fillPct >= 50 && (
                          <p className="mt-2.5 text-[0.7rem] font-semibold text-summit-navy uppercase tracking-wider flex items-center gap-1.5">
                            📈 Yarıdan fazlası doldu
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className={`mt-5 inline-flex items-center gap-2 text-sm font-bold
                  ${summitFull ? "text-gray-400" : "text-summit-navy group-hover:gap-3 transition-all"}`}>
                  {summitFull ? "Kayıt Kapandı" : "Zirve + Fuar İçin Kaydol"}
                  {!summitFull && <ArrowLeft size={14} className="rotate-180" />}
                </div>
                </div>
              </button>

              {/* FAIR CARD */}
              <button
                type="button"
                onClick={() => setVisitType("fair")}
                className="group text-left bg-white rounded-md overflow-hidden transition-all shadow-md ring-1 ring-summit-accent/30 hover:shadow-2xl hover:ring-summit-accent hover:-translate-y-1 cursor-pointer relative"
                data-testid="visit-option-fair"
              >
                <div className="relative w-full overflow-hidden bg-summit-navy" style={{ height: 280 }}>
                  <img
                    src={`${API}/uploads/fair_stands.jpeg?v=${Date.now()}`}
                    alt="Fuar alanı standları"
                    className="block w-full h-full"
                    style={{ objectFit: "cover", objectPosition: "center 20%", display: "block", width: "100%", height: "100%" }}
                  />
                </div>
                <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-md bg-summit-accent/20 flex items-center justify-center text-summit-navy group-hover:bg-summit-accent transition-colors">
                    <Store size={22} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-summit-navy bg-summit-accent/20 px-2.5 py-1 rounded">
                    {VISIT_META.fair.tag}
                  </span>
                </div>
                <h3 className="font-heading text-summit-navy text-xl leading-tight">{VISIT_META.fair.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{VISIT_META.fair.subtitle}</p>

                <ul className="mt-5 space-y-1.5 text-xs text-gray-700">
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> 36 gayrimenkul proje standı</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Proje maketleri ve sunumlar</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> Sektör temsilcileri ile birebir görüşme</li>
                  <li className="flex items-start gap-2"><Check size={13} className="text-summit-navy mt-0.5 shrink-0" /> İki gün (20-21 Mayıs), serbest giriş</li>
                </ul>

                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-summit-accent text-summit-navy font-bold uppercase tracking-wider rounded text-[0.65rem]">
                    Sınırsız Kayıt
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon size={13} className="text-summit-navy" />
                    Dilediğiniz saatte giriş
                  </span>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-summit-navy">
                  Fuar Ziyareti İçin Kaydol
                  <ArrowLeft size={14} className="rotate-180" />
                </div>
                </div>
              </button>
            </div>

            <div className="mt-8 bg-white border border-gray-200 rounded-md p-4 flex items-start gap-3">
              <Info size={16} className="text-summit-navy mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong className="text-summit-navy">Zirveye kaydolanlar</strong> aynı zamanda fuar alanına da ek kayıt olmadan giriş yapabilir.
                <strong className="text-summit-navy"> Sadece fuarı</strong> ziyaret etmek isteyenler için ayrı kayıt gereklidir.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // === STEP 2: Form ===
  const meta = VISIT_META[visitType];
  const inputCls = "w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none transition-colors";
  const labelCls = "text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold";

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              if (location.pathname !== "/ziyaretci-kaydi") {
                window.location.href = "/ziyaretci-kaydi";
              } else {
                setVisitType(null);
              }
            }}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-summit-navy text-xs mb-6 transition-colors"
            data-testid="visit-picker-back"
          >
            <ArrowLeft size={13} /> Kayıt türünü değiştir
          </button>

          <div className="text-center mb-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md mb-4
              ${visitType === "fair" ? "bg-summit-accent/20" : "bg-summit-navy/10"}`}>
              {visitType === "fair" ? <Store size={14} className="text-summit-navy" /> : <Ticket size={14} className="text-summit-navy" />}
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">{meta.tag}</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">{meta.formTitle}</h1>
            <p className="text-gray-600 mt-4 text-sm max-w-xl mx-auto">{meta.formSubtitle}</p>
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
                <label className={labelCls}>
                  {visitType === "fair" ? "Fuardan Beklentileriniz" : "Zirveden Beklentileriniz"}
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-gray-500" />
                  <textarea
                    placeholder={visitType === "fair" ? "Hangi tür projelerle ilgileniyorsunuz?" : "Hangi konuları öğrenmek istiyorsunuz?"}
                    rows={3}
                    value={form.expectations}
                    onChange={e => setForm({...form, expectations: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                    data-testid="input-visitor-expectations"
                  />
                </div>
              </div>

              {/* === INVITE CODE FIELD (only for SUMMIT) === */}
              {visitType === "summit" && (
              <div className="pt-4 border-t border-gray-100">
                <label className={labelCls}>Davet Kodu *</label>
                <p className="text-xs text-gray-500 mb-2.5 leading-relaxed" data-testid="invite-code-phone">
                  Aşağıdaki konuşmacılardan davetlisi olduğunuz kişiyi seçerek kaydınıza devam edebilirsiniz.
                </p>

                <InviteCodePicker
                  value={form.invite_code}
                  onChange={(code) => {
                    setForm({...form, invite_code: code});
                    setCodeStatus(null);
                    setCodeMessage("");
                  }}
                  onValidate={validateCode}
                  status={codeStatus}
                  message={codeMessage}
                />
              </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="visitor-error-message">
                  {error}
                </div>
              )}

              <KvkkConsent checked={kvkk} onChange={setKvkk} testid="visitor-kvkk" />
              <button type="submit" disabled={loading || !kvkk || (visitType === "summit" && codeStatus !== "valid")}
                className="w-full btn-navy py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-visitor-btn">
                {loading
                  ? "Kaydediliyor..."
                  : visitType === "summit" && codeStatus !== "valid"
                    ? "Önce davet kodunu doğrulayın"
                    : `${meta.formTitle}nı Tamamla`}
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

// ===================== INVITE CODE PICKER (Chip-style selector) =====================
const PRESET_INVITES = [
  { code: "MRXOZDEMIR", name: "Muhammet Özdemir", initials: "MÖ", color: "from-amber-400 to-amber-600" },
  { code: "MASTER",     name: "Oğuzhan Öztürk",   initials: "OÖ", color: "from-summit-navy to-summit-navy-dark" },
  { code: "KIRAZ",      name: "Büşra Kiraz",      initials: "BK", color: "from-rose-400 to-rose-600" },
  { code: "MRTGUL",     name: "Murat Gültekin",   initials: "MG", color: "from-emerald-400 to-emerald-600" },
];

function InviteCodePicker({ value, onChange, onValidate, status, message }) {
  const presetCodes = PRESET_INVITES.map(p => p.code);
  const isCustom = value && !presetCodes.includes(value);
  const [showCustom, setShowCustom] = React.useState(isCustom);

  // Auto-validate after onChange settles (when value matches a preset)
  React.useEffect(() => {
    if (value && presetCodes.includes(value) && status !== "valid" && status !== "checking") {
      const t = setTimeout(() => onValidate(), 80);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pick = (code) => {
    setShowCustom(false);
    onChange(code);
  };

  return (
    <div className="space-y-2.5" data-testid="invite-picker">
      {/* Preset chips — 2 columns on mobile/desktop */}
      <div className="grid grid-cols-2 gap-2">
        {PRESET_INVITES.map(p => {
          const active = value === p.code;
          const valid = active && status === "valid";
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => pick(p.code)}
              className={`group relative flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border text-left transition-all overflow-hidden ${
                active
                  ? (valid ? "border-green-500 bg-green-50 shadow-sm" : "border-summit-navy bg-summit-navy/5 shadow-sm")
                  : "border-gray-200 hover:border-summit-navy/40 hover:bg-summit-paper/60 bg-white"
              }`}
              data-testid={`invite-chip-${p.code}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold tracking-wider shadow-sm`}>
                {p.initials}
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1 leading-tight">
                <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${active ? "text-summit-navy" : "text-gray-700"}`}>
                  {p.name}
                </div>
                <div className={`text-[9px] sm:text-[10px] truncate font-semibold tabular-nums ${active ? "text-summit-gold" : "text-gray-400"}`}>
                  {p.code}
                </div>
              </div>
              {/* Selected indicator */}
              {active && (
                <div className={`absolute top-1 right-1 w-4 h-4 rounded-full ${valid ? "bg-green-500" : "bg-summit-navy"} flex items-center justify-center`}>
                  <Check size={9} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Other code toggle / custom input */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => { setShowCustom(true); onChange(""); }}
          className="w-full text-[11px] text-gray-500 hover:text-summit-navy underline-offset-2 hover:underline transition-colors py-1"
          data-testid="invite-other-toggle"
        >
          Listede yok mu? Başka bir davet kodum var
        </button>
      ) : (
        <div className="bg-summit-paper/60 rounded-lg border border-gray-200 p-2.5 space-y-2" data-testid="invite-custom-block">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Diğer Davet Kodu</span>
            <button type="button" onClick={() => { setShowCustom(false); onChange(""); }} className="text-[10px] text-gray-400 hover:text-summit-navy" data-testid="invite-custom-back">
              ← Listeye dön
            </button>
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <KeyRound size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Örn: VIP2026"
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                onBlur={onValidate}
                className={`w-full bg-white border rounded-md pl-7 pr-8 py-2 text-summit-navy text-sm focus:outline-none uppercase tracking-wider font-semibold ${
                  status === "valid" ? "border-green-500 bg-green-50" :
                  status === "invalid" ? "border-red-400 bg-red-50" :
                  "border-gray-200 focus:border-summit-navy"
                }`}
                data-testid="input-invite-code"
              />
              {status === "checking" && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              {status === "valid" && <Check size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-600" />}
              {status === "invalid" && <X size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
            </div>
            <button
              type="button"
              onClick={onValidate}
              disabled={!value || status === "checking"}
              className="bg-summit-navy text-white rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-summit-navy-dark transition-colors whitespace-nowrap"
              data-testid="btn-validate-code"
            >
              {status === "checking" ? "..." : "Doğrula"}
            </button>
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <p className={`text-xs font-medium flex items-center gap-1 ${
          status === "valid" ? "text-green-700" :
          status === "invalid" ? "text-red-600" : "text-gray-500"
        }`} data-testid="code-feedback">
          {status === "valid" ? <Check size={12} /> : status === "invalid" ? <X size={12} /> : null}
          {message}
        </p>
      )}
    </div>
  );
}
