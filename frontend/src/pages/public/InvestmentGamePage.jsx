import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Wallet, MapPin, Plus, Trash2, TrendingUp, Share2, ArrowRight,
  Sparkles, RefreshCw, AlertCircle, Building, Trees, Mail, User, Phone,
  Briefcase, Calendar as CalendarIcon, Target, Award, BadgeCheck, Coins
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import KvkkConsent from "../../components/KvkkConsent";

const STARTING_BUDGET = 10_000_000;
const DAIRE_TYPES = ["1+1", "2+1", "3+1", "5+1"];
const ARSA_TYPES = [
  { value: "tarla", label: "Tarla" },
  { value: "arsa", label: "Arsa" },
];

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const fmtN = (n) => Number(n || 0).toLocaleString("tr-TR");

// Budget input: accepts only digits, displays with thousands separators
const parseBudget = (v) => {
  if (typeof v === "number") return v;
  const digits = String(v || "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
};
const formatBudget = (v) => {
  const n = parseBudget(v);
  return n ? fmtN(n) : "";
};

export default function InvestmentGamePage() {
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState({ name: "", phone: "", email: "", age: "", profession: "" });
  const [kvkk, setKvkk] = useState(false);
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalSpent = items.reduce((s, it) => s + Number(it.budget || 0), 0);
  const remaining = STARTING_BUDGET - totalSpent;
  const progressPct = Math.min(100, Math.round((totalSpent / STARTING_BUDGET) * 100));

  const goPortfolio = (e) => {
    e?.preventDefault();
    setError("");
    const { name, phone, email, age, profession } = identity;
    if (!name.trim() || name.trim().length < 2) return setError("İsim girin (en az 2 karakter)");
    if (!phone.trim() || phone.trim().length < 6) return setError("Geçerli bir telefon girin");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Geçerli bir e-posta adresi girin");
    if (!age || Number(age) < 10 || Number(age) > 120) return setError("Yaş 10-120 arasında olmalı");
    if (!profession.trim() || profession.trim().length < 2) return setError("Mesleğinizi yazın");
    if (!kvkk) return setError("Devam etmek için KVKK / Gizlilik onayını işaretleyin");
    setStep(2);
  };

  const handleAddItem = (item) => {
    const newTotal = items.reduce((s, it) => s + Number(it.budget || 0), 0) + Number(item.budget);
    if (newTotal > STARTING_BUDGET) {
      setError(`Bütçeyi aşıyorsun! Kalan: ${fmtTL(remaining)}`);
      setTimeout(() => setError(""), 3500);
      return false;
    }
    setItems([...items, item]);
    setEditItem(null);
    return true;
  };

  const handleRemove = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError("En az bir yatırım eklemelisin");
      return;
    }
    setSubmitting(true); setError("");
    try {
      const { data } = await axios.post(`${API}/investment-game/submit`, {
        name: identity.name.trim(),
        phone: identity.phone.trim(),
        email: identity.email.trim(),
        age: Number(identity.age),
        profession: identity.profession.trim(),
        items,
      });
      setResult(data);
      setStep(3);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {/* ignore */}
    } catch (err) {
      setError(err.response?.data?.detail || "Gönderilemedi, tekrar deneyin");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(1); setItems([]); setResult(null); setError("");
    setIdentity({ name: "", phone: "", email: "", age: "", profession: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-summit-navy via-[#1A264F] to-[#0F1833] text-white font-body" data-testid="game-page">
      {/* Decorative orbs + pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-emerald-400/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-16">
        {/* Header brand */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 backdrop-blur-sm border border-amber-400/40 rounded-full px-4 py-1.5 mb-5">
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-xs tracking-wider uppercase font-semibold text-amber-100">Arsa Yatırım Zirvesi · Yatırım Simülatörü</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 text-white">
            Yatırımını Yapmadan Önce<br/>
            <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">Uzmanlar Değerlendirsin</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto">
            10.000.000 TL sanal bütçeyle aklındaki gayrimenkul yatırımını oluştur.
            Uzmanlarımız portföyünü inceleyip etkinlikte sana özel yorumlar paylaşacak.
          </p>
          <div className="flex items-center justify-center gap-4 mt-5 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} className="text-amber-300" /> Ücretsiz</span>
            <span className="w-1 h-1 bg-white/30 rounded-full" />
            <span className="inline-flex items-center gap-1.5"><Target size={13} className="text-amber-300" /> 2 dakika</span>
            <span className="w-1 h-1 bg-white/30 rounded-full" />
            <span className="inline-flex items-center gap-1.5"><Award size={13} className="text-amber-300" /> Uzman değerlendirmesi</span>
          </div>
        </div>

        {/* Sticky wallet bar (step 2 & 3) */}
        {step >= 2 && (
          <WalletBar total={totalSpent} remaining={remaining} progress={progressPct} over={totalSpent > STARTING_BUDGET} />
        )}

        {/* STEP 1 — Identity */}
        {step === 1 && (
          <form onSubmit={goPortfolio} className="bg-white text-summit-navy rounded-2xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative" data-testid="game-identity-form">
            {/* Decorative gold accent */}
            <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 rounded-t-full" />

            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                <User size={22} className="text-white" />
              </div>
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-summit-navy">Önce Seni Tanıyalım</h2>
                <p className="text-gray-500 text-sm mt-0.5">Portföyünü gerçekten oluşturuyormuş gibi doldur.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GameInput icon={User} label="Ad Soyad *" value={identity.name} onChange={v => setIdentity({...identity, name: v})} placeholder="Ali Veli" testid="in-name" />
              <GameInput icon={Phone} label="Telefon *" value={identity.phone} onChange={v => setIdentity({...identity, phone: v})} placeholder="0555 000 00 00" testid="in-phone" type="tel" />
              <div className="sm:col-span-2">
                <GameInput icon={Mail} label="E-posta *" value={identity.email} onChange={v => setIdentity({...identity, email: v})} placeholder="ornek@email.com" testid="in-email" type="email" />
                <p className="text-[11px] text-gray-500 mt-1 pl-1">📧 Uzman değerlendirme raporunu bu adrese göndereceğiz.</p>
              </div>
              <GameInput icon={CalendarIcon} label="Yaş *" value={identity.age} onChange={v => setIdentity({...identity, age: v})} placeholder="35" testid="in-age" type="number" />
              <GameInput icon={Briefcase} label="Meslek *" value={identity.profession} onChange={v => setIdentity({...identity, profession: v})} placeholder="Mühendis" testid="in-profession" />
            </div>

            {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2" data-testid="form-error"><AlertCircle size={15} className="shrink-0 mt-0.5" />{error}</div>}

            <div className="mt-4">
              <KvkkConsent checked={kvkk} onChange={setKvkk} testid="game-kvkk" />
            </div>

            <button type="submit" disabled={!kvkk} className="mt-5 w-full bg-gradient-to-r from-summit-navy to-summit-navy-dark hover:shadow-xl text-white rounded-xl py-4 text-base font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed" data-testid="game-next-btn">
              Yatırıma Başla <ArrowRight size={18} />
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-1.5">
              <BadgeCheck size={13} className="text-emerald-500" /> Bilgileriniz KVKK kapsamında, yalnızca etkinlik organizasyonunda kullanılır.
            </p>
          </form>
        )}

        {/* STEP 2 — Portfolio */}
        {step === 2 && (
          <div className="space-y-4" data-testid="game-portfolio">
            {!editItem && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setEditItem({ kind: "daire", daire_type: "2+1", city: "", district: "", budget: "", description: "" })}
                  className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/15 hover:border-amber-400 rounded-2xl p-5 text-left transition-all overflow-hidden"
                  data-testid="add-daire-btn"
                >
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
                  <Building size={32} className="text-amber-300 mb-3" />
                  <div className="font-heading font-bold text-xl">+ Daire Ekle</div>
                  <div className="text-xs text-white/60 mt-1">1+1 · 2+1 · 3+1 · 5+1</div>
                </button>
                <button
                  onClick={() => setEditItem({ kind: "arsa", arsa_type: "arsa", city: "", district: "", budget: "", description: "" })}
                  className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/15 hover:border-emerald-400 rounded-2xl p-5 text-left transition-all overflow-hidden"
                  data-testid="add-arsa-btn"
                >
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all" />
                  <Trees size={32} className="text-emerald-300 mb-3" />
                  <div className="font-heading font-bold text-xl">+ Arsa / Tarla Ekle</div>
                  <div className="text-xs text-white/60 mt-1">İmarlı arsa / tarım arazisi</div>
                </button>
              </div>
            )}

            {editItem && (
              <ItemForm
                initial={editItem}
                remaining={remaining}
                onCancel={() => setEditItem(null)}
                onSave={handleAddItem}
              />
            )}

            {items.length > 0 && !editItem && (
              <div className="space-y-2" data-testid="items-list">
                <div className="text-xs uppercase tracking-wider text-amber-300 font-bold px-1 flex items-center gap-2">
                  <Coins size={13} /> Portföyün ({items.length})
                </div>
                {items.map((it, i) => (
                  <ItemCard key={i} item={it} onRemove={() => handleRemove(i)} testid={`item-${i}`} />
                ))}
              </div>
            )}

            {error && <div className="bg-red-500/20 border border-red-400/40 text-red-100 rounded-xl p-3 text-sm flex items-start gap-2 animate-pulse" data-testid="portfolio-error"><AlertCircle size={15} className="shrink-0 mt-0.5" />{error}</div>}

            {items.length > 0 && !editItem && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-summit-navy rounded-xl py-4 text-base sm:text-lg font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xl shadow-amber-500/30"
                data-testid="finish-btn"
              >
                {submitting ? "Gönderiliyor…" : <><Target size={20} /> Yatırımımı Tamamla <ArrowRight size={20} /></>}
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Result */}
        {step === 3 && result && (
          <ResultScreen result={result} onReset={resetAll} />
        )}
      </div>
    </div>
  );
}

function WalletBar({ total, remaining, progress, over }) {
  return (
    <div className={`sticky top-2 z-30 mb-5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg border-2 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all ${over ? "border-red-400 animate-[shake_0.3s_ease-in-out]" : "border-amber-400/50"}`} data-testid="wallet-bar">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-md shadow-amber-500/40">
            <Wallet size={16} className="text-summit-navy" />
          </div>
          <span className="text-xs sm:text-sm uppercase tracking-wider font-bold text-white">Cüzdanım</span>
        </div>
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
          <div className={`w-2 h-2 rounded-full ${over ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-[10px] uppercase tracking-wider text-white/80 font-semibold">{progress}% kullanıldı</span>
        </div>
      </div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Kalan Bakiye</div>
          <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${over ? "text-red-300" : "text-amber-300"} drop-shadow-lg`} data-testid="wallet-remaining">
            {fmtTL(remaining)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Yatırıldı</div>
          <div className="text-base sm:text-lg font-bold text-white tabular-nums">{fmtTL(total)}</div>
        </div>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${over ? "bg-red-400" : "bg-gradient-to-r from-amber-500 via-amber-300 to-amber-400"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function GameInput({ icon: Icon, label, value, onChange, placeholder, type = "text", testid }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-bold text-gray-600 flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-amber-500" />} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-3 text-summit-navy text-sm font-medium focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.15)] transition-all"
        data-testid={testid}
      />
    </div>
  );
}

function ItemForm({ initial, remaining, onCancel, onSave }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const budgetRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    if (!f.city.trim() || !f.district.trim()) return setErr("İl ve ilçe zorunlu");
    const budget = parseBudget(f.budget);
    if (!budget || budget <= 0) return setErr("Geçerli bir bütçe girin");
    if (budget > remaining) return setErr(`Bütçen yetmiyor. Kalan: ${fmtTL(remaining)}`);
    onSave({ ...f, budget });
  };

  const isDaire = f.kind === "daire";
  const isArsa = f.kind === "arsa";
  const Icon = isDaire ? Building : Trees;
  const accent = isDaire ? "amber" : "emerald";
  const accentClasses = isDaire
    ? { border: "border-amber-400", bg: "from-amber-400 to-amber-600", shadow: "shadow-amber-500/30", ring: "focus:shadow-[0_0_0_4px_rgba(251,191,36,0.15)]", pill: "bg-amber-400 text-summit-navy" }
    : { border: "border-emerald-400", bg: "from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/30", ring: "focus:shadow-[0_0_0_4px_rgba(52,211,153,0.15)]", pill: "bg-emerald-400 text-summit-navy" };

  return (
    <form onSubmit={submit} className="bg-white text-summit-navy rounded-2xl p-5 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-4 relative" data-testid="item-form">
      <div className={`absolute top-0 left-6 right-6 h-1 bg-gradient-to-r ${accentClasses.bg} rounded-t-full`} />

      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentClasses.bg} flex items-center justify-center shadow-lg ${accentClasses.shadow}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">{isDaire ? "Daire Ekle" : "Arsa / Tarla Ekle"}</h3>
          <p className="text-xs text-gray-500">Detayları doldur, bütçeni belirle.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GameInput icon={MapPin} label="İl *" value={f.city} onChange={v => setF({...f, city: v})} placeholder="İstanbul" testid="f-city" />
        <GameInput icon={MapPin} label="İlçe *" value={f.district} onChange={v => setF({...f, district: v})} placeholder="Arnavutköy" testid="f-district" />
      </div>

      {isDaire && (
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-2 block font-bold text-gray-600">Daire Tipi *</label>
          <div className="grid grid-cols-4 gap-2">
            {DAIRE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setF({...f, daire_type: t})}
                className={`py-2.5 text-sm font-bold rounded-lg border-2 transition-all ${f.daire_type === t ? "bg-summit-navy text-white border-summit-navy shadow-lg" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy hover:bg-summit-paper"}`}
                data-testid={`f-daire-${t}`}
              >{t}</button>
            ))}
          </div>
        </div>
      )}

      {isArsa && (
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-2 block font-bold text-gray-600">Cinsi *</label>
          <div className="grid grid-cols-2 gap-2">
            {ARSA_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setF({...f, arsa_type: t.value})}
                className={`py-2.5 text-sm font-bold rounded-lg border-2 transition-all ${f.arsa_type === t.value ? "bg-summit-navy text-white border-summit-navy shadow-lg" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy hover:bg-summit-paper"}`}
                data-testid={`f-arsa-${t.value}`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-bold text-gray-600">
          {isDaire ? "Açıklama (opsiyonel)" : "İmar Açıklaması (opsiyonel)"}
        </label>
        <textarea
          value={f.description || ""}
          onChange={e => setF({...f, description: e.target.value})}
          placeholder={isDaire ? "Örn: Site içi, havuzlu, deniz manzaralı" : "Örn: 500m² villa imarlı, 3 kat konut imarlı, ticari imarlı"}
          rows={2}
          maxLength={300}
          className={`w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:${accentClasses.border.replace("border-","border-")} ${accentClasses.ring} transition-all resize-none`}
          data-testid="f-description"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-bold text-gray-600">Bu yatırıma ayıracağın bütçe (TL) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-summit-navy text-2xl font-bold pointer-events-none">₺</span>
          <input
            ref={budgetRef}
            type="text"
            inputMode="numeric"
            value={formatBudget(f.budget)}
            onChange={e => setF({...f, budget: parseBudget(e.target.value)})}
            placeholder={`Max ${fmtN(remaining)}`}
            className={`w-full bg-white border-2 border-amber-400 rounded-lg pl-10 pr-4 py-3.5 text-summit-navy text-xl font-black tabular-nums focus:outline-none focus:border-summit-navy ${accentClasses.ring} transition-all`}
            data-testid="f-budget"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500 self-center mr-1">Hızlı seç:</span>
          {[500000, 1000000, 2500000, 5000000, 10000000].filter(v => v <= remaining).map(v => (
            <button key={v} type="button" onClick={() => setF({...f, budget: v})} className={`text-[11px] ${f.budget === v ? "bg-summit-navy text-white border-summit-navy" : "bg-summit-paper hover:bg-amber-100 text-summit-navy border-gray-200"} border rounded-full px-3 py-1 font-bold transition-colors`}>
              {fmtTL(v)}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5 text-xs flex items-start gap-1.5" data-testid="item-form-error"><AlertCircle size={13} className="shrink-0 mt-0.5" />{err}</div>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 hover:text-summit-navy hover:border-gray-300 rounded-lg py-3 text-sm font-bold transition-colors" data-testid="f-cancel">
          İptal
        </button>
        <button type="submit" className={`flex-[2] bg-gradient-to-r ${accentClasses.bg} hover:shadow-xl text-white rounded-lg py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all`} data-testid="f-save">
          <Plus size={15} /> Portföye Ekle
        </button>
      </div>
    </form>
  );
}

function ItemCard({ item, onRemove, testid }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const accentColor = isDaire ? "amber" : "emerald";
  return (
    <div className={`bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/15 hover:border-${accentColor}-400/50 rounded-xl p-4 flex items-start gap-3 group transition-all`} data-testid={testid}>
      <div className={`w-11 h-11 rounded-lg bg-${accentColor}-400/20 border border-${accentColor}-400/40 flex items-center justify-center shrink-0`}>
        <Icon size={20} className={isDaire ? "text-amber-300" : "text-emerald-300"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white">
            {isDaire ? `Daire ${item.daire_type}` : (item.arsa_type === "tarla" ? "Tarla" : "Arsa")}
          </span>
          <span className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-white/80">
            <MapPin size={10} /> {item.city} / {item.district}
          </span>
        </div>
        {item.description && <div className="text-xs text-white/60 mt-1 line-clamp-2">{item.description}</div>}
        <div className={`${isDaire ? "text-amber-300" : "text-emerald-300"} font-bold text-lg tabular-nums mt-1 drop-shadow`}>{fmtTL(item.budget)}</div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-60 hover:opacity-100 text-red-300 hover:text-red-200 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
        title="Sil"
        data-testid={`${testid}-remove`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function ResultScreen({ result, onReset }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
      @keyframes popin{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {/* ignore */} };
  }, []);

  const shareText = encodeURIComponent(
    `Arsa Yatırım Zirvesi Yatırım Simülatörü'nde ${fmtTL(result.starting_budget)} bütçeyle ` +
    `${result.items.length} yatırım yaptım (${result.daire_count} daire · ${result.arsa_count} arsa). ` +
    `Sen de dene: https://arsayatirimzirvesi.com/yatirim-oyunu`
  );

  return (
    <div className="space-y-4" data-testid="result-screen">
      {/* Hero card */}
      <div className="relative bg-gradient-to-br from-amber-400/20 via-white/10 to-amber-600/10 backdrop-blur-md border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Sparkle decorations */}
        <div className="absolute top-4 left-6 text-amber-300 opacity-60 text-2xl" style={{animation:"popin 0.6s ease"}}>✨</div>
        <div className="absolute top-8 right-8 text-amber-200 opacity-50 text-xl" style={{animation:"popin 0.8s ease"}}>⭐</div>
        <div className="absolute bottom-6 left-10 text-amber-300 opacity-40 text-lg" style={{animation:"popin 1s ease"}}>✨</div>

        <div className="text-6xl sm:text-7xl mb-3" style={{animation:"popin 0.5s ease"}}>🎉</div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2 text-white">
          {result.name}, muhteşem portföy!
        </h2>
        <p className="text-white/80 text-sm sm:text-base mb-6">
          Toplam <strong className="text-amber-300">{fmtTL(result.total_spent)}</strong> yatırımla
          {" "}<strong className="text-white">{result.items.length} gayrimenkul</strong> seçtin.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat icon={Building} label="Daire" value={result.daire_count} color="amber" />
          <MiniStat icon={Trees} label="Arsa" value={result.arsa_count} color="emerald" />
          <MiniStat icon={Wallet} label="Kalan" value={fmtTL(result.remaining)} color="amber" small />
        </div>

        {result.badges?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6" data-testid="result-badges">
            {result.badges.map(b => (
              <div key={b.id} className="bg-gradient-to-r from-amber-400/25 to-amber-500/15 border border-amber-400/40 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1 text-amber-100" title={b.description}>
                {b.label}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-2">
            <Mail size={16} className="text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-white/90 leading-relaxed">
              <strong className="text-white">Uzman Değerlendirmesi</strong><br/>
              Portföyün, Arsa Yatırım Zirvesi uzmanları tarafından incelenecek.
              Etkinlikte sana özel yorumlar + gerçek pazar analizi sunacağız.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
            data-testid="result-share-wa"
          >
            <Share2 size={15} /> WhatsApp'ta Paylaş
          </a>
          <button
            onClick={onReset}
            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="result-reset"
          >
            <RefreshCw size={15} /> Tekrar Dene
          </button>
        </div>
      </div>

      {/* Portfolio breakdown */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
        <h3 className="font-heading font-bold mb-3 flex items-center gap-2 text-white">
          <TrendingUp size={18} className="text-amber-300" /> Portföy Dökümü
        </h3>
        <div className="space-y-2">
          {result.items.map((it, i) => {
            const Icon = it.kind === "daire" ? Building : Trees;
            const isDaire = it.kind === "daire";
            return (
              <div key={i} className={`bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3 text-sm hover:border-${isDaire ? "amber" : "emerald"}-400/30 transition-colors`}>
                <Icon size={18} className={isDaire ? "text-amber-300 shrink-0 mt-0.5" : "text-emerald-300 shrink-0 mt-0.5"} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">
                    {isDaire ? `Daire ${it.daire_type}` : (it.arsa_type === "tarla" ? "Tarla" : "Arsa")}
                    {" · "}{it.city} / {it.district}
                  </div>
                  {it.description && <div className="text-xs text-white/60 mt-0.5">{it.description}</div>}
                </div>
                <div className={`${isDaire ? "text-amber-300" : "text-emerald-300"} font-bold tabular-nums shrink-0`}>{fmtTL(it.budget)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA to register */}
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy rounded-2xl p-5 sm:p-6 text-center shadow-xl">
        <div className="font-heading font-bold text-lg sm:text-xl mb-1">Gerçekten yatırım yapmak ister misin?</div>
        <p className="text-sm opacity-85 mb-4">Arsa Yatırım Zirvesi 2026'da uzmanlarla birebir görüş.</p>
        <a href="/ziyaretci-kaydi" className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white rounded-xl px-6 py-3 text-sm font-bold transition-colors shadow-lg" data-testid="result-cta-register">
          Ücretsiz Etkinlik Kaydı <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color = "amber", small = false }) {
  const colorCls = color === "emerald"
    ? { border: "border-emerald-400/30", text: "text-emerald-300", iconBg: "bg-emerald-400/15" }
    : { border: "border-amber-400/30", text: "text-amber-300", iconBg: "bg-amber-400/15" };
  return (
    <div className={`bg-white/5 border ${colorCls.border} rounded-xl p-3 flex flex-col items-center gap-1`}>
      <div className={`w-8 h-8 rounded-lg ${colorCls.iconBg} flex items-center justify-center mb-0.5`}>
        <Icon size={14} className={colorCls.text} />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">{label}</div>
      <div className={`font-bold tabular-nums ${colorCls.text} drop-shadow ${small ? "text-xs sm:text-sm" : "text-2xl"}`}>
        {value}
      </div>
    </div>
  );
}
