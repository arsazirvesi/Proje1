import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
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
  const [capacity, setCapacity] = useState(null);
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

  // === STEP 3: Success ===
  if (result) {
    const meta = VISIT_META[visitType] || VISIT_META.summit;
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-32 pb-24 px-4">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg">
            <div className="w-16 h-16 bg-summit-accent/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail size={32} className="text-summit-navy" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl">E-postanızı Kontrol Edin</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              Kaydınız için teşekkürler! <strong>{form.email}</strong> adresine bir <strong>doğrulama linki</strong> gönderdik.
            </p>
            <div className="bg-summit-paper rounded-md border-l-4 border-summit-navy p-4 mt-6 text-left">
              <p className="text-summit-navy text-xs font-semibold uppercase tracking-wider mb-2">Son Adım</p>
              <ol className="text-gray-700 text-sm space-y-1.5 pl-4 list-decimal">
                <li>E-posta kutunuzu (veya <strong>Spam</strong> klasörünü) açın</li>
                <li>"<strong>{meta.tag}</strong> · E-postanızı Doğrulayın" konulu maili bulun</li>
                <li><strong>E-postamı Doğrula</strong> butonuna tıklayın</li>
                <li>Doğrulama sonrası yaka kartınız mail ile gelecek 🎫</li>
              </ol>
            </div>
            <p className="text-gray-400 text-xs mt-5 leading-relaxed">
              Mail birkaç dakika içinde gelmezse Spam klasörünü kontrol edin. Mailimiz hâlâ gelmediyse
              farklı bir adresle tekrar kayıt olabilirsiniz.
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
                <div className="relative w-full overflow-hidden bg-summit-navy aspect-[16/9] sm:aspect-[5/3]">
                  <img
                    src="https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/6ol0ek8g_Arsa%20Yat%C4%B1r%C4%B1m%20Zirvesi.jpeg"
                    alt="Arsa Yatırım Zirvesi"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "center" }}
                    loading="eager"
                    decoding="async"
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
                <span className="absolute top-4 right-4 z-10 px-2.5 py-0.5 bg-summit-accent text-summit-navy text-[0.65rem] font-bold uppercase tracking-wider rounded shadow">
                  Sınırsız Kayıt
                </span>
                <div className="relative w-full overflow-hidden bg-summit-navy aspect-[16/9] sm:aspect-[5/3]">
                  <img
                    src={`${API}/uploads/fair_stands.jpeg`}
                    alt="Fuar alanı standları"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "center center" }}
                    loading="eager"
                    decoding="async"
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

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
                  <UsersIcon size={13} className="text-summit-navy" />
                  <span>Kontenjan sınırı yok · Dilediğiniz saatte giriş</span>
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
            onClick={() => setVisitType(null)}
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
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Zirveye katılım için size verilen davet kodunu girin. Kod yoksa
                  <a href="mailto:info@arsayatirimzirvesi.com" className="text-summit-navy font-semibold hover:underline ml-1">info@arsayatirimzirvesi.com</a> adresinden talep edebilirsiniz.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      placeholder="Örn: VIP2026"
                      value={form.invite_code}
                      onChange={e => {
                        const v = e.target.value.toUpperCase();
                        setForm({...form, invite_code: v});
                        if (codeStatus) { setCodeStatus(null); setCodeMessage(""); }
                      }}
                      onBlur={validateCode}
                      className={`w-full bg-white border rounded-md pl-9 pr-9 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none transition-colors uppercase tracking-wider font-semibold
                        ${codeStatus === "valid" ? "border-green-500 bg-green-50" :
                          codeStatus === "invalid" ? "border-red-400 bg-red-50" :
                          "border-gray-200 focus:border-summit-navy"}`}
                      data-testid="input-invite-code"
                    />
                    {codeStatus === "checking" && (
                      <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                    {codeStatus === "valid" && (
                      <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" />
                    )}
                    {codeStatus === "invalid" && (
                      <X size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={validateCode}
                    disabled={!form.invite_code || codeStatus === "checking"}
                    className="bg-summit-navy text-white rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-summit-navy-dark transition-colors"
                    data-testid="btn-validate-code"
                  >
                    {codeStatus === "checking" ? "Kontrol..." : "Kodu Doğrula"}
                  </button>
                </div>
                {codeMessage && (
                  <p className={`text-xs mt-2 font-medium ${
                    codeStatus === "valid" ? "text-green-700" :
                    codeStatus === "invalid" ? "text-red-600" : "text-gray-500"
                  }`} data-testid="code-feedback">
                    {codeStatus === "valid" ? "✓ " : codeStatus === "invalid" ? "✗ " : ""}{codeMessage}
                  </p>
                )}
              </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="visitor-error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || (visitType === "summit" && codeStatus !== "valid")}
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
