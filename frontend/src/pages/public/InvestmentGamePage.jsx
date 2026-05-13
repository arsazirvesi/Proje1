import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  Wallet, MapPin, Plus, Trash2, TrendingUp, Share2, ArrowRight, ArrowLeft,
  Sparkles, RefreshCw, AlertCircle, Building, Trees, Mail, User, Phone,
  Briefcase, Calendar as CalendarIcon, Target, Award, BadgeCheck, Coins,
  Ruler, Home, Users as UsersIcon, Clock, Layers, Search, Check, X as XIcon,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import KvkkConsent from "../../components/KvkkConsent";

const BUDGET_PRESETS = [
  { mode: "1m", value: 1_000_000, label: "1 Milyon TL", tag: "Yeni başlayan" },
  { mode: "3m", value: 3_000_000, label: "3 Milyon TL", tag: "Konforlu giriş" },
  { mode: "5m", value: 5_000_000, label: "5 Milyon TL", tag: "Orta ölçek" },
  { mode: "10m", value: 10_000_000, label: "10 Milyon TL", tag: "Geniş portföy" },
];

const DAIRE_TYPES = ["1+1", "2+1", "3+1", "5+1"];
const ARSA_TYPES = [
  { value: "arsa", label: "Arsa", desc: "İmarlı arsa" },
  { value: "tarla", label: "Tarla", desc: "Tarım arazisi" },
  { value: "ipat", label: "İPAT", desc: "İmar Planına Alınmış Tarla" },
];
const OWNERSHIP_TYPES = [
  { value: "mustakil", label: "Müstakil", desc: "Tek tapulu" },
  { value: "hisseli", label: "Hisseli", desc: "Paylı tapulu" },
];

// Vade slider snap points (in years): 0.5 = 6 ay
const VADE_POINTS = [0.5, 1, 2, 3, 5, 7, 10];
const VADE_LABEL = (y) => (y < 1 ? `${Math.round(y * 12)} ay` : `${y} yıl`);

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const fmtN = (n) => Number(n || 0).toLocaleString("tr-TR");
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
  const [step, setStep] = useState(1); // 1=identity, 2=budget, 3=portfolio, 4=result
  const [identity, setIdentity] = useState({ name: "", phone: "", email: "", age: "", profession: "" });
  const [kvkk, setKvkk] = useState(false);
  const [budgetMode, setBudgetMode] = useState(null); // null | "1m"|"3m"|"5m"|"10m"|"free"
  const [freeBudget, setFreeBudget] = useState(0);
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState({}); // {İl: [İlçe, ...]}

  // Fetch TR locations once at mount
  useEffect(() => {
    axios.get(`${API}/locations`).then(r => setLocations(r.data || {})).catch(() => {});
  }, []);

  const startingBudget = budgetMode === "free"
    ? freeBudget
    : (BUDGET_PRESETS.find(p => p.mode === budgetMode)?.value || 0);
  const totalSpent = items.reduce((s, it) => s + Number(it.budget || 0), 0);
  const remaining = startingBudget - totalSpent;
  const progressPct = startingBudget > 0 ? Math.min(100, Math.round((totalSpent / startingBudget) * 100)) : 0;

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

  const confirmBudget = () => {
    setError("");
    if (!budgetMode) return setError("Lütfen bir bütçe seçin");
    if (budgetMode === "free" && (!freeBudget || freeBudget < 50000)) {
      return setError("Serbest bütçe için en az 50.000 TL girin");
    }
    setStep(3);
  };

  const handleAddItem = (item) => {
    const newTotal = items.reduce((s, it) => s + Number(it.budget || 0), 0) + Number(item.budget);
    if (newTotal > startingBudget) {
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
    if (items.length === 0) { setError("En az bir yatırım eklemelisin"); return; }
    setSubmitting(true); setError("");
    try {
      const { data } = await axios.post(`${API}/investment-game/submit`, {
        name: identity.name.trim(),
        phone: identity.phone.trim(),
        email: identity.email.trim(),
        age: Number(identity.age),
        profession: identity.profession.trim(),
        budget_mode: budgetMode,
        total_budget: budgetMode === "free" ? freeBudget : undefined,
        items,
      });
      setResult(data);
      setStep(4);
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
    setBudgetMode(null); setFreeBudget(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-summit-navy via-[#1A264F] to-[#0F1833] text-white font-body" data-testid="game-page">
      {/* Decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        {/* Header — compact on mobile after step 1 to give wallet bar room */}
        <div className={`text-center ${step >= 3 ? "mb-3 sm:mb-6" : "mb-6 sm:mb-10"}`}>
          <div className="inline-flex items-center gap-1.5 bg-amber-400/15 backdrop-blur-sm border border-amber-400/40 rounded-full px-3 py-1 mb-3 sm:mb-5">
            <Sparkles size={12} className="text-amber-300" />
            <span className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-amber-100">Arsa Yatırım · Simülatör</span>
          </div>
          {step < 3 && (
            <>
              <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 text-white">
                Bütçeni Belirle,<br/>
                <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">Portföyünü Tasarla</span>
              </h1>
              <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto">
                Kendi seviyenize uygun bütçeyle gerçekçi bir gayrimenkul portföyü oluşturun.
                Uzmanlarımız etkinlikte sana özel analiz e-postası gönderecek.
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 sm:mt-5 text-[11px] sm:text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={12} className="text-amber-300" /> Ücretsiz</span>
                <span className="w-1 h-1 bg-white/30 rounded-full" />
                <span className="inline-flex items-center gap-1.5"><Target size={12} className="text-amber-300" /> 3 dakika</span>
                <span className="w-1 h-1 bg-white/30 rounded-full" />
                <span className="inline-flex items-center gap-1.5"><Award size={12} className="text-amber-300" /> Uzman cevabı</span>
              </div>
            </>
          )}
          {step === 3 && (
            <h2 className="font-heading text-lg sm:text-2xl font-bold text-white">Portföyünü Oluştur</h2>
          )}

          {/* Step indicator */}
          {step < 4 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-10 bg-amber-300" : s < step ? "w-6 bg-amber-300/60" : "w-6 bg-white/15"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky wallet bar (step 3 & 4) */}
        {step >= 3 && startingBudget > 0 && (
          <WalletBar total={totalSpent} remaining={remaining} progress={progressPct} over={totalSpent > startingBudget} starting={startingBudget} />
        )}

        {/* STEP 1 — Identity */}
        {step === 1 && (
          <IdentityForm
            identity={identity}
            setIdentity={setIdentity}
            kvkk={kvkk}
            setKvkk={setKvkk}
            error={error}
            onSubmit={goPortfolio}
          />
        )}

        {/* STEP 2 — Budget Selection */}
        {step === 2 && (
          <BudgetStep
            budgetMode={budgetMode}
            setBudgetMode={setBudgetMode}
            freeBudget={freeBudget}
            setFreeBudget={setFreeBudget}
            error={error}
            onBack={() => setStep(1)}
            onNext={confirmBudget}
          />
        )}

        {/* STEP 3 — Portfolio */}
        {step === 3 && (
          <div className="space-y-4" data-testid="game-portfolio">
            {!editItem && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setEditItem({ kind: "daire", daire_type: "2+1", city: "", district: "", neighborhood: "", budget: "", description: "" })}
                  className="group relative bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 hover:border-amber-400 rounded-xl p-3 sm:p-4 text-left transition-all overflow-hidden"
                  data-testid="add-daire-btn"
                >
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
                  <Building size={22} className="text-amber-300 mb-1.5" />
                  <div className="font-heading font-bold text-base sm:text-lg leading-tight">+ Daire</div>
                  <div className="text-[10px] sm:text-xs text-white/55 mt-0.5 leading-tight">1+1 · 2+1 · 3+1 · 5+1</div>
                </button>
                <button
                  onClick={() => setEditItem({
                    kind: "arsa", arsa_type: "arsa", city: "", district: "", neighborhood: "",
                    area_m2: "", vade_years: 3, ownership: "mustakil", budget: "", description: "",
                  })}
                  className="group relative bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 hover:border-emerald-400 rounded-xl p-3 sm:p-4 text-left transition-all overflow-hidden"
                  data-testid="add-arsa-btn"
                >
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all" />
                  <Trees size={22} className="text-emerald-300 mb-1.5" />
                  <div className="font-heading font-bold text-base sm:text-lg leading-tight">+ Arsa / Tarla / İPAT</div>
                  <div className="text-[10px] sm:text-xs text-white/55 mt-0.5 leading-tight">m² · Vade · Müstakil/Hisseli</div>
                </button>
              </div>
            )}

            {editItem && (
              <ItemForm
                initial={editItem}
                remaining={remaining}
                locations={locations}
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

            {!editItem && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl py-3 px-4 text-sm font-bold inline-flex items-center justify-center gap-2"
                  data-testid="back-budget-btn"
                >
                  <ArrowLeft size={15} /> Bütçeyi Değiştir
                </button>
                {items.length > 0 && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-summit-navy rounded-xl py-3 text-base sm:text-lg font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xl shadow-amber-500/30"
                    data-testid="finish-btn"
                  >
                    {submitting ? "Gönderiliyor…" : <><Target size={20} /> Yatırımımı Tamamla <ArrowRight size={20} /></>}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Result */}
        {step === 4 && result && (
          <ResultScreen result={result} onReset={resetAll} />
        )}
      </div>
    </div>
  );
}

// ===================== IDENTITY FORM (Step 1) =====================
function IdentityForm({ identity, setIdentity, kvkk, setKvkk, error, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="bg-white text-summit-navy rounded-2xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative" data-testid="game-identity-form">
      <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 rounded-t-full" />
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
          <User size={22} className="text-white" />
        </div>
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-summit-navy">Önce Seni Tanıyalım</h2>
          <p className="text-gray-500 text-sm mt-0.5">Uzman geri bildirimi için iletişim bilgileri.</p>
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
        Devam Et — Bütçe Seç <ArrowRight size={18} />
      </button>
    </form>
  );
}

// ===================== BUDGET STEP (Step 2) =====================
function BudgetStep({ budgetMode, setBudgetMode, freeBudget, setFreeBudget, error, onBack, onNext }) {
  return (
    <div className="bg-white text-summit-navy rounded-2xl p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative" data-testid="budget-step">
      <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-t-full" />
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
          <Wallet size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-heading text-lg sm:text-2xl font-bold text-summit-navy leading-tight">Bütçeni Belirle</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Hangi seviyede deneyim yapmak istersin?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3" data-testid="budget-presets">
        {BUDGET_PRESETS.map(p => {
          const active = budgetMode === p.mode;
          return (
            <button
              key={p.mode}
              type="button"
              onClick={() => setBudgetMode(p.mode)}
              className={`relative text-left p-3 sm:p-4 rounded-xl border transition-all overflow-hidden ${active ? "border-amber-400 bg-gradient-to-br from-amber-50 to-white shadow-[0_8px_20px_-8px_rgba(251,191,36,0.5)]" : "border-gray-200 hover:border-amber-300"}`}
              data-testid={`budget-${p.mode}`}
            >
              {/* Ticket notch */}
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-summit-navy rounded-full" />
              <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">{p.tag}</div>
              <div className="font-heading text-base sm:text-xl font-black text-summit-navy mt-0.5 leading-tight">{p.label}</div>
              <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 tabular-nums">{fmtTL(p.value)}</div>
              {active && <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"><Check size={11} className="text-white" /></div>}
            </button>
          );
        })}
      </div>

      {/* Serbest bütçe */}
      <button
        type="button"
        onClick={() => setBudgetMode("free")}
        className={`mt-2.5 sm:mt-3 w-full text-left p-3 sm:p-4 rounded-xl border transition-all ${budgetMode === "free" ? "border-summit-navy bg-summit-navy/5 shadow-md" : "border-dashed border-gray-300 hover:border-summit-navy hover:bg-summit-paper/60"}`}
        data-testid="budget-free"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Serbest</div>
            <div className="font-heading text-sm sm:text-base font-bold text-summit-navy leading-tight">Kendi bütçemi gireyim</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Min 50.000 TL · Max 10 Milyar TL</div>
          </div>
          <Sparkles size={18} className={budgetMode === "free" ? "text-amber-500" : "text-gray-300"} />
        </div>
      </button>

      {budgetMode === "free" && (
        <div className="mt-3 bg-summit-paper rounded-xl border border-summit-navy/10 p-3 sm:p-4" data-testid="free-budget-input">
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-bold text-gray-600">Bütçe Tutarı (TL) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-summit-navy text-xl font-bold pointer-events-none">₺</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatBudget(freeBudget)}
              onChange={e => setFreeBudget(parseBudget(e.target.value))}
              placeholder="Örn: 7.500.000"
              className="w-full bg-white border-2 border-amber-400 rounded-lg pl-9 pr-4 py-3 text-summit-navy text-lg sm:text-xl font-black tabular-nums focus:outline-none focus:border-summit-navy"
              data-testid="free-budget-value"
            />
          </div>
        </div>
      )}

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5 text-xs flex items-start gap-2" data-testid="budget-error"><AlertCircle size={13} className="shrink-0 mt-0.5" />{error}</div>}

      <div className="flex gap-2 mt-5">
        <button type="button" onClick={onBack} className="bg-white border border-gray-200 text-gray-600 hover:text-summit-navy hover:border-gray-300 rounded-xl py-3 px-3 sm:px-4 text-sm font-bold inline-flex items-center gap-1.5" data-testid="budget-back">
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Geri</span>
        </button>
        <button type="button" onClick={onNext} className="flex-1 bg-gradient-to-r from-summit-navy to-summit-navy-dark hover:shadow-xl text-white rounded-xl py-3 text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2" data-testid="budget-next">
          Devam Et <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ===================== WALLET BAR — Mini Ticket Style =====================
function WalletBar({ total, remaining, progress, over, starting }) {
  return (
    <div className={`sticky top-2 z-30 mb-4 relative transition-all`} data-testid="wallet-bar">
      {/* Ticket side notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-summit-navy rounded-full border border-amber-400/40 -ml-1.5 z-10" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-summit-navy rounded-full border border-amber-400/40 -mr-1.5 z-10" />

      <div className={`bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg border rounded-xl px-4 py-3 shadow-lg ${over ? "border-red-400 animate-[shake_0.3s_ease-in-out]" : "border-amber-400/40"}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Left: wallet icon + remaining */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <Wallet size={16} className="text-summit-navy" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-white/55 font-bold leading-none">Kalan Bakiye</div>
              <div className={`text-lg sm:text-2xl font-bold tabular-nums leading-tight ${over ? "text-red-300" : "text-amber-300"}`} data-testid="wallet-remaining">
                {fmtTL(remaining)}
              </div>
            </div>
          </div>
          {/* Right: progress chip */}
          <div className="text-right shrink-0">
            <div className="text-[9px] uppercase tracking-wider text-white/55 font-bold leading-none">Yatırıldı</div>
            <div className="text-xs sm:text-sm font-bold text-white tabular-nums leading-tight">{fmtTL(total)}</div>
            <div className="text-[9px] text-white/40 mt-0.5 tabular-nums">/ {fmtTL(starting)}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${over ? "bg-red-400" : "bg-gradient-to-r from-amber-500 via-amber-300 to-amber-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ===================== GENERIC INPUT =====================
function GameInput({ icon: Icon, label, value, onChange, placeholder, type = "text", testid }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider mb-1.5 font-bold text-gray-600 flex items-center gap-1.5">
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

// ===================== COMBOBOX (Searchable Dropdown) =====================
function Combobox({ icon: Icon, label, value, options, onChange, placeholder, emptyText, disabled, testid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // TR-aware lowercase for searching
  const trLower = (s) => String(s || "")
    .replaceAll("İ", "i").replaceAll("I", "ı")
    .toLowerCase();
  const q = trLower(query);
  const filtered = useMemo(() => {
    if (!q) return options;
    return (options || []).filter(o => trLower(o).includes(q));
  }, [options, q]);

  const pick = (v) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="text-[10px] uppercase tracking-wider mb-1.5 font-bold text-gray-600 flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-amber-500" />} {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`w-full bg-white border-2 rounded-lg px-3 py-3 text-sm font-medium text-left flex items-center justify-between gap-2 transition-all ${disabled ? "border-gray-100 text-gray-300 cursor-not-allowed" : open ? "border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]" : "border-gray-200 text-summit-navy hover:border-gray-300"}`}
        data-testid={testid}
      >
        <span className={value ? "" : "text-gray-400 font-normal"}>{value || placeholder}</span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && !disabled && (
        <div className="absolute z-40 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden" data-testid={`${testid}-popover`}>
          <div className="px-2 py-2 border-b border-gray-100 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ara..."
              className="flex-1 bg-transparent outline-none text-sm text-summit-navy placeholder-gray-400"
              data-testid={`${testid}-search`}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                <XIcon size={13} />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">{emptyText || "Sonuç yok"}</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o + i}
                  type="button"
                  onClick={() => pick(o)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors ${value === o ? "bg-amber-50 text-summit-navy font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                  data-testid={`${testid}-opt-${o}`}
                >
                  <span>{o}</span>
                  {value === o && <Check size={13} className="text-amber-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== ITEM FORM =====================
function ItemForm({ initial, remaining, locations, onCancel, onSave }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const budgetRef = useRef(null);

  const provinces = useMemo(() => Object.keys(locations || {}), [locations]);
  const districts = useMemo(() => (f.city && locations?.[f.city]) || [], [f.city, locations]);

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    if (!f.city.trim() || !f.district.trim()) return setErr("İl ve ilçe zorunlu");
    const budget = parseBudget(f.budget);
    if (!budget || budget <= 0) return setErr("Geçerli bir bütçe girin");
    if (budget > remaining) return setErr(`Bütçen yetmiyor. Kalan: ${fmtTL(remaining)}`);
    const payload = { ...f, budget };
    if (f.kind === "arsa") {
      if (f.area_m2 !== "" && f.area_m2 !== null && f.area_m2 !== undefined) {
        payload.area_m2 = Number(f.area_m2) || null;
      } else {
        payload.area_m2 = null;
      }
      payload.vade_years = Number(f.vade_years) || 3;
    }
    onSave(payload);
  };

  const isDaire = f.kind === "daire";
  const isArsa = f.kind === "arsa";
  const Icon = isDaire ? Building : Trees;
  const accentClasses = isDaire
    ? { border: "border-amber-400", bg: "from-amber-400 to-amber-600", shadow: "shadow-amber-500/30" }
    : { border: "border-emerald-400", bg: "from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/30" };

  return (
    <form onSubmit={submit} className="bg-white text-summit-navy rounded-2xl p-4 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-3 sm:space-y-4 relative" data-testid="item-form">
      <div className={`absolute top-0 left-6 right-6 h-1 bg-gradient-to-r ${accentClasses.bg} rounded-t-full`} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${accentClasses.bg} flex items-center justify-center shadow-lg ${accentClasses.shadow}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-base sm:text-lg font-bold leading-tight">{isDaire ? "Daire Ekle" : "Arazi Ekle"}</h3>
          <p className="text-[11px] sm:text-xs text-gray-500 leading-tight">Detayları doldur, bütçeni belirle.</p>
        </div>
      </div>

      {/* IL / İLÇE — searchable comboboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Combobox
          icon={MapPin}
          label="İl *"
          value={f.city}
          options={provinces}
          onChange={v => setF({...f, city: v, district: ""})}
          placeholder={provinces.length ? "İl seçin / yazın" : "Yükleniyor..."}
          emptyText="Eşleşen il yok"
          testid="f-city"
        />
        <Combobox
          icon={MapPin}
          label="İlçe *"
          value={f.district}
          options={districts}
          onChange={v => setF({...f, district: v})}
          placeholder={f.city ? (districts.length ? "İlçe seçin / yazın" : "Yükleniyor...") : "Önce il seçin"}
          emptyText={f.city ? "Eşleşen ilçe yok" : "Önce il seçin"}
          disabled={!f.city}
          testid="f-district"
        />
      </div>

      {/* Mahalle — typeable input (50K mahalle veritabanı yok, serbest yazma) */}
      <GameInput icon={Home} label="Mahalle" value={f.neighborhood || ""} onChange={v => setF({...f, neighborhood: v})} placeholder="Örn: Hadımköy Mh." testid="f-neighborhood" />

      {isDaire && (
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-2 block font-bold text-gray-600">Daire Tipi *</label>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {DAIRE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setF({...f, daire_type: t})}
                className={`py-2 sm:py-2.5 text-sm font-bold rounded-lg border transition-all ${f.daire_type === t ? "bg-summit-navy text-white border-summit-navy shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy hover:bg-summit-paper"}`}
                data-testid={`f-daire-${t}`}
              >{t}</button>
            ))}
          </div>
        </div>
      )}

      {isArsa && (
        <>
          {/* Arsa cinsi — chip style */}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-2 font-bold text-gray-600 flex items-center gap-1.5"><Layers size={11} className="text-emerald-500" /> Arazi Tipi *</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {ARSA_TYPES.map(t => {
                const active = f.arsa_type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setF({...f, arsa_type: t.value})}
                    className={`relative py-2 sm:py-2.5 px-1 text-center rounded-lg border transition-all ${active ? "bg-summit-navy text-white border-summit-navy shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy hover:bg-summit-paper"}`}
                    data-testid={`f-arsa-${t.value}`}
                  >
                    <div className="text-sm font-bold leading-tight">{t.label}</div>
                    <div className={`text-[9px] mt-0.5 leading-tight ${active ? "text-white/65" : "text-gray-400"}`}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* m² */}
          <GameInput icon={Ruler} label="Alan (m²)" value={f.area_m2 || ""} onChange={v => setF({...f, area_m2: v.replace(/\D/g, "")})} placeholder="Örn: 2500" testid="f-area-m2" type="text" />

          {/* Vade Slider */}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-2 font-bold text-gray-600 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5"><Clock size={11} className="text-emerald-500" /> Yatırım Vadesi</span>
              <span className="text-summit-navy font-black text-sm sm:text-base tabular-nums bg-amber-100 px-2 py-0.5 rounded-md">{VADE_LABEL(Number(f.vade_years) || 3)}</span>
            </label>
            <div className="px-1">
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={Number(f.vade_years) || 3}
                onChange={e => setF({...f, vade_years: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-summit-navy"
                style={{
                  background: `linear-gradient(to right, #0F1833 0%, #0F1833 ${((Number(f.vade_years) || 3) - 0.5) / 9.5 * 100}%, #E5E7EB ${((Number(f.vade_years) || 3) - 0.5) / 9.5 * 100}%, #E5E7EB 100%)`,
                }}
                data-testid="f-vade-slider"
              />
              <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-500 mt-1.5">
                {VADE_POINTS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setF({...f, vade_years: y})}
                    className={`px-1 py-0.5 rounded transition-colors ${Math.abs((Number(f.vade_years) || 3) - y) < 0.01 ? "bg-summit-navy text-white font-bold" : "hover:bg-gray-100 text-gray-500"}`}
                    data-testid={`f-vade-${y}`}
                  >
                    {VADE_LABEL(y)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hisseli / Müstakil — compact */}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-2 font-bold text-gray-600 flex items-center gap-1.5"><UsersIcon size={11} className="text-emerald-500" /> Mülkiyet Tipi *</label>
            <div className="grid grid-cols-2 gap-2">
              {OWNERSHIP_TYPES.map(o => {
                const active = f.ownership === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setF({...f, ownership: o.value})}
                    className={`py-2 sm:py-2.5 px-3 text-center rounded-lg border transition-all flex items-center justify-center gap-2 ${active ? "bg-summit-navy text-white border-summit-navy shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy hover:bg-summit-paper"}`}
                    data-testid={`f-ownership-${o.value}`}
                  >
                    <span className="text-sm font-bold">{o.label}</span>
                    <span className={`text-[9px] hidden sm:inline ${active ? "text-white/65" : "text-gray-400"}`}>· {o.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-bold text-gray-600">
          {isDaire ? "Açıklama (opsiyonel)" : "İmar / Notlar (opsiyonel)"}
        </label>
        <textarea
          value={f.description || ""}
          onChange={e => setF({...f, description: e.target.value})}
          placeholder={isDaire ? "Örn: Site içi, havuzlu, deniz manzaralı" : "Örn: Yol cepheli, elektrik mevcut, köşe parsel"}
          rows={2}
          maxLength={300}
          className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.15)] transition-all resize-none"
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
            className="w-full bg-white border-2 border-amber-400 rounded-lg pl-10 pr-4 py-3.5 text-summit-navy text-xl font-black tabular-nums focus:outline-none focus:border-summit-navy"
            data-testid="f-budget"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500 self-center mr-1">Hızlı seç:</span>
          {[100000, 500000, 1000000, 2500000, 5000000].filter(v => v <= remaining).map(v => (
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

// ===================== ITEM CARD — Mini Ticket =====================
function ItemCard({ item, onRemove, testid }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const landTypeLabel = (item.arsa_type === "tarla") ? "Tarla" : (item.arsa_type === "ipat") ? "İPAT" : "Arsa";
  const accentText = isDaire ? "text-amber-300" : "text-emerald-300";
  const accentBg = isDaire ? "bg-amber-400/15 border-amber-400/30" : "bg-emerald-400/15 border-emerald-400/30";

  return (
    <div className={`group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-sm border border-white/10 hover:border-white/25 rounded-xl transition-all`} data-testid={testid}>
      {/* Side notches (ticket cut) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-summit-navy rounded-full border border-white/15 -ml-1.25 z-10" style={{marginLeft:"-5px"}} />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-summit-navy rounded-full border border-white/15 -mr-1.25 z-10" style={{marginRight:"-5px"}} />

      <div className="flex items-stretch">
        {/* Left stub — icon + budget */}
        <div className="px-3 py-3 border-r border-dashed border-white/15 flex flex-col items-center justify-center min-w-[70px]">
          <div className={`w-8 h-8 rounded-lg ${accentBg} border flex items-center justify-center mb-1`}>
            <Icon size={15} className={accentText} />
          </div>
          <div className="text-[8px] uppercase tracking-wider text-white/40 font-semibold">{isDaire ? "Daire" : landTypeLabel}</div>
        </div>

        {/* Main body */}
        <div className="flex-1 px-3 py-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-[13px] truncate leading-tight">
                {isDaire ? `Daire ${item.daire_type || ""}` : landTypeLabel}
                <span className="text-white/40 mx-1">·</span>
                <span className="text-white/85">{item.city} / {item.district}</span>
              </div>
              {item.neighborhood && (
                <div className="text-[11px] text-white/55 mt-0.5 truncate">📍 {item.neighborhood}</div>
              )}
              {!isDaire && (item.area_m2 || item.vade_years || item.ownership) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.area_m2 && <span className="bg-white/[0.06] border border-white/10 text-white/75 rounded px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1"><Ruler size={9} /> {fmtN(item.area_m2)} m²</span>}
                  {item.vade_years && <span className="bg-white/[0.06] border border-white/10 text-white/75 rounded px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1"><Clock size={9} /> {VADE_LABEL(item.vade_years)}</span>}
                  {item.ownership && <span className="bg-white/[0.06] border border-white/10 text-white/75 rounded px-1.5 py-0.5 text-[10px]">{item.ownership === "hisseli" ? "Hisseli" : "Müstakil"}</span>}
                </div>
              )}
              {item.description && <div className="text-[11px] text-white/45 mt-1.5 line-clamp-1 italic">{item.description}</div>}
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="opacity-50 group-hover:opacity-100 text-red-300 hover:text-red-200 p-1.5 rounded-md hover:bg-red-500/15 transition-all shrink-0"
                title="Sil"
                data-testid={`${testid}-remove`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className={`${accentText} font-bold text-base sm:text-lg tabular-nums mt-1.5 drop-shadow`}>{fmtTL(item.budget)}</div>
        </div>
      </div>
    </div>
  );
}

// ===================== RESULT =====================
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
    `${result.items.length} yatırım yaptım (${result.daire_count} daire · ${result.arsa_count} arazi). ` +
    `Sen de dene: https://arsayatirimzirvesi.com/yatirim-oyunu`
  );

  return (
    <div className="space-y-4" data-testid="result-screen">
      <div className="relative bg-gradient-to-br from-amber-400/20 via-white/10 to-amber-600/10 backdrop-blur-md border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        <div className="absolute top-4 left-6 text-amber-300 opacity-60 text-2xl" style={{animation:"popin 0.6s ease"}}>✨</div>
        <div className="absolute top-8 right-8 text-amber-200 opacity-50 text-xl" style={{animation:"popin 0.8s ease"}}>⭐</div>

        <div className="text-6xl sm:text-7xl mb-3" style={{animation:"popin 0.5s ease"}}>🎉</div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2 text-white">
          {result.name}, muhteşem portföy!
        </h2>
        <p className="text-white/80 text-sm sm:text-base mb-6">
          <strong className="text-amber-300">{fmtTL(result.starting_budget)}</strong> bütçeden{" "}
          <strong className="text-amber-300">{fmtTL(result.total_spent)}</strong> ile{" "}
          <strong className="text-white">{result.items.length} yatırım</strong> yaptın.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat icon={Building} label="Daire" value={result.daire_count} color="amber" />
          <MiniStat icon={Trees} label="Arazi" value={result.arsa_count} color="emerald" />
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
              <strong className="text-white">Uzman Cevabı E-postanıza Gelecek</strong><br/>
              Portföyünü Arsa Yatırım Zirvesi uzmanları inceleyip e-posta ile sana özel yorum gönderecek.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
            data-testid="result-share-wa">
            <Share2 size={15} /> WhatsApp'ta Paylaş
          </a>
          <button onClick={onReset}
            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="result-reset">
            <RefreshCw size={15} /> Tekrar Dene
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
        <h3 className="font-heading font-bold mb-3 flex items-center gap-2 text-white">
          <TrendingUp size={18} className="text-amber-300" /> Portföy Dökümü
        </h3>
        <div className="space-y-2">
          {result.items.map((it, i) => <ItemCard key={i} item={it} onRemove={null} testid={`r-item-${i}`} />)}
        </div>
      </div>

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
