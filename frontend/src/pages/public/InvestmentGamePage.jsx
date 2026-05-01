import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Wallet, MapPin, Plus, Trash2, TrendingUp, Share2, ArrowRight,
  Sparkles, RefreshCw, AlertCircle, Building, Trees
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const STARTING_BUDGET = 10_000_000;
const DAIRE_TYPES = ["1+1", "2+1", "3+1", "5+1"];
const ARSA_TYPES = [
  { value: "tarla", label: "Tarla" },
  { value: "arsa", label: "Arsa" },
];

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;

export default function InvestmentGamePage() {
  const [step, setStep] = useState(1); // 1=identity, 2=portfolio, 3=result
  const [identity, setIdentity] = useState({ name: "", phone: "", age: "", profession: "" });
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null); // { kind, ... }
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalSpent = items.reduce((s, it) => s + Number(it.budget || 0), 0);
  const remaining = STARTING_BUDGET - totalSpent;
  const progressPct = Math.min(100, Math.round((totalSpent / STARTING_BUDGET) * 100));

  const goPortfolio = (e) => {
    e?.preventDefault();
    setError("");
    const { name, phone, age, profession } = identity;
    if (!name.trim() || name.trim().length < 2) return setError("İsim girin (en az 2 karakter)");
    if (!phone.trim() || phone.trim().length < 6) return setError("Geçerli bir telefon girin");
    if (!age || Number(age) < 10 || Number(age) > 120) return setError("Yaş 10-120 arasında olmalı");
    if (!profession.trim() || profession.trim().length < 2) return setError("Mesleğinizi yazın");
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
    setIdentity({ name: "", phone: "", age: "", profession: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-summit-navy via-summit-navy-dark to-summit-navy-dark text-white font-body" data-testid="game-page">
      {/* Decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-summit-gold-light/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[500px] h-[500px] bg-summit-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        {/* Header brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles size={14} className="text-summit-gold-light" />
            <span className="text-xs tracking-wider uppercase font-semibold">Arsa Yatırım Zirvesi · Mini Oyun</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold mb-2">Yatırım Dene</h1>
          <p className="text-white/70 text-sm sm:text-base max-w-lg mx-auto">
            10 milyon TL'niz var. Aklınızdaki gayrimenkul yatırımını simüle edin, portföyünüzü oluşturun.
          </p>
        </div>

        {/* Sticky wallet bar (only in step 2 & 3) */}
        {step >= 2 && (
          <WalletBar total={totalSpent} remaining={remaining} progress={progressPct} over={totalSpent > STARTING_BUDGET} />
        )}

        {/* STEP 1 — Identity */}
        {step === 1 && (
          <form onSubmit={goPortfolio} className="bg-white/95 text-summit-navy rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm" data-testid="game-identity-form">
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-1">Önce seni tanıyalım</h2>
            <p className="text-gray-500 text-sm mb-6">Gerçek hayatta bu kararı alırken kim olacaktın?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GameInput label="Ad Soyad *" value={identity.name} onChange={v => setIdentity({...identity, name: v})} placeholder="Ali Veli" testid="in-name" />
              <GameInput label="Telefon *" value={identity.phone} onChange={v => setIdentity({...identity, phone: v})} placeholder="0555 000 00 00" testid="in-phone" type="tel" />
              <GameInput label="Yaş *" value={identity.age} onChange={v => setIdentity({...identity, age: v})} placeholder="35" testid="in-age" type="number" />
              <GameInput label="Meslek *" value={identity.profession} onChange={v => setIdentity({...identity, profession: v})} placeholder="Mühendis" testid="in-profession" />
            </div>

            {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2" data-testid="form-error"><AlertCircle size={15} className="shrink-0 mt-0.5" />{error}</div>}

            <button type="submit" className="mt-6 w-full bg-summit-navy hover:bg-summit-navy-dark text-white rounded-xl py-3.5 text-base font-bold inline-flex items-center justify-center gap-2 transition-colors" data-testid="game-next-btn">
              Yatırıma Başla <ArrowRight size={18} />
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              📌 Bu oyundaki bilgiler yalnızca etkinlik organizasyonu amacıyla saklanır.
            </p>
          </form>
        )}

        {/* STEP 2 — Portfolio */}
        {step === 2 && (
          <div className="space-y-4" data-testid="game-portfolio">
            {/* Add buttons */}
            {!editItem && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditItem({ kind: "daire", daire_type: "2+1", city: "", district: "", budget: "", description: "" })}
                  className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-summit-gold-light rounded-2xl p-5 text-left transition-all"
                  data-testid="add-daire-btn"
                >
                  <Building size={28} className="text-summit-gold-light mb-2" />
                  <div className="font-bold text-lg">+ Daire Ekle</div>
                  <div className="text-xs text-white/60 mt-0.5">1+1 · 2+1 · 3+1 · 5+1</div>
                </button>
                <button
                  onClick={() => setEditItem({ kind: "arsa", arsa_type: "arsa", city: "", district: "", budget: "", description: "" })}
                  className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-summit-gold-light rounded-2xl p-5 text-left transition-all"
                  data-testid="add-arsa-btn"
                >
                  <Trees size={28} className="text-summit-gold-light mb-2" />
                  <div className="font-bold text-lg">+ Arsa / Tarla Ekle</div>
                  <div className="text-xs text-white/60 mt-0.5">İmarlı arsa / tarım arazisi</div>
                </button>
              </div>
            )}

            {/* Edit form */}
            {editItem && (
              <ItemForm
                initial={editItem}
                remaining={remaining}
                onCancel={() => setEditItem(null)}
                onSave={handleAddItem}
              />
            )}

            {/* Items list */}
            {items.length > 0 && (
              <div className="space-y-2" data-testid="items-list">
                <div className="text-xs uppercase tracking-wider text-white/60 font-semibold px-1">
                  Portföyün ({items.length})
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
                className="w-full bg-summit-gold-light hover:bg-summit-gold text-summit-navy rounded-xl py-4 text-lg font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xl"
                data-testid="finish-btn"
              >
                {submitting ? "Gönderiliyor…" : <>🎯 Yatırımımı Tamamla <ArrowRight size={20} /></>}
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
    <div className={`sticky top-2 z-30 mb-4 bg-white/10 backdrop-blur-md border rounded-2xl p-4 shadow-xl transition-all ${over ? "border-red-400 animate-[shake_0.3s_ease-in-out]" : "border-summit-gold-light/40"}`} data-testid="wallet-bar">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-summit-gold-light" />
          <span className="text-xs uppercase tracking-wider font-bold text-white/70">Cüzdan</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-white/60">{progress}% kullanıldı</div>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Kalan</div>
          <div className={`text-xl sm:text-2xl font-bold tabular-nums ${over ? "text-red-300" : "text-summit-gold-light"}`} data-testid="wallet-remaining">{fmtTL(remaining)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/50">Yatırıldı</div>
          <div className="text-base font-semibold tabular-nums">{fmtTL(total)}</div>
        </div>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${over ? "bg-red-400" : "bg-gradient-to-r from-summit-gold to-summit-gold-light"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function GameInput({ label, value, onChange, placeholder, type = "text", testid }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-semibold text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy transition-colors"
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
    const budget = Number(f.budget);
    if (!budget || budget <= 0) return setErr("Geçerli bir bütçe girin");
    if (budget > remaining) return setErr(`Bütçen yetmiyor. Kalan: ${fmtTL(remaining)}`);
    onSave({ ...f, budget });
  };

  const isDaire = f.kind === "daire";
  const isArsa = f.kind === "arsa";

  return (
    <form onSubmit={submit} className="bg-white text-summit-navy rounded-2xl p-5 shadow-2xl space-y-3" data-testid="item-form">
      <div className="flex items-center gap-2 mb-2">
        {isDaire ? <Building size={22} className="text-summit-gold" /> : <Trees size={22} className="text-summit-gold" />}
        <h3 className="font-heading text-lg font-bold">{isDaire ? "Daire Ekle" : "Arsa / Tarla Ekle"}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GameInput label="İl *" value={f.city} onChange={v => setF({...f, city: v})} placeholder="İstanbul" testid="f-city" />
        <GameInput label="İlçe *" value={f.district} onChange={v => setF({...f, district: v})} placeholder="Arnavutköy" testid="f-district" />
      </div>

      {isDaire && (
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-semibold text-gray-600">Daire Tipi *</label>
          <div className="grid grid-cols-4 gap-2">
            {DAIRE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setF({...f, daire_type: t})}
                className={`py-2 text-sm font-bold rounded-md border-2 transition-colors ${f.daire_type === t ? "bg-summit-navy text-white border-summit-navy" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy"}`}
                data-testid={`f-daire-${t}`}
              >{t}</button>
            ))}
          </div>
        </div>
      )}

      {isArsa && (
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-semibold text-gray-600">Cinsi *</label>
          <div className="grid grid-cols-2 gap-2">
            {ARSA_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setF({...f, arsa_type: t.value})}
                className={`py-2 text-sm font-bold rounded-md border-2 transition-colors ${f.arsa_type === t.value ? "bg-summit-navy text-white border-summit-navy" : "bg-white border-gray-200 text-gray-600 hover:border-summit-navy"}`}
                data-testid={`f-arsa-${t.value}`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-semibold text-gray-600">
          {isDaire ? "Açıklama (opsiyonel)" : "İmar Açıklaması (opsiyonel)"}
        </label>
        <textarea
          value={f.description || ""}
          onChange={e => setF({...f, description: e.target.value})}
          placeholder={isDaire ? "Örn: Site içi, havuzlu, deniz manzaralı" : "Örn: 500m² villa imarlı, 3 kat konut imarı, ticari imarlı"}
          rows={2}
          maxLength={300}
          className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy resize-none"
          data-testid="f-description"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1.5 block font-semibold text-gray-600">Bu yatırıma ayıracağın bütçe (TL) *</label>
        <input
          ref={budgetRef}
          type="number"
          inputMode="numeric"
          value={f.budget}
          onChange={e => setF({...f, budget: e.target.value})}
          placeholder={`Max ${fmtTL(remaining)}`}
          className="w-full bg-white border-2 border-summit-gold/40 rounded-md px-4 py-3 text-summit-navy text-lg font-bold tabular-nums focus:outline-none focus:border-summit-navy"
          data-testid="f-budget"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {[500000, 1000000, 2500000, 5000000].filter(v => v <= remaining).map(v => (
            <button key={v} type="button" onClick={() => setF({...f, budget: v})} className="text-[11px] bg-summit-paper hover:bg-summit-gold/20 border border-gray-200 text-summit-navy rounded-full px-3 py-1 font-semibold">
              {fmtTL(v)}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2 text-xs flex items-start gap-1.5" data-testid="item-form-error"><AlertCircle size={13} className="shrink-0 mt-0.5" />{err}</div>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-white border border-gray-200 text-gray-600 hover:text-summit-navy rounded-md py-2.5 text-sm font-semibold" data-testid="f-cancel">
          İptal
        </button>
        <button type="submit" className="flex-[2] bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2" data-testid="f-save">
          <Plus size={15} /> Portföye Ekle
        </button>
      </div>
    </form>
  );
}

function ItemCard({ item, onRemove, testid }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex items-start gap-3 group hover:border-summit-gold-light/50 transition-colors" data-testid={testid}>
      <div className="w-10 h-10 rounded-lg bg-summit-gold-light/20 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-summit-gold-light" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">
            {isDaire ? `Daire ${item.daire_type}` : (item.arsa_type === "tarla" ? "Tarla" : "Arsa")}
          </span>
          <span className="text-xs bg-white/10 rounded px-2 py-0.5 flex items-center gap-1">
            <MapPin size={10} /> {item.city} / {item.district}
          </span>
        </div>
        {item.description && <div className="text-xs text-white/60 mt-1 line-clamp-2">{item.description}</div>}
        <div className="text-summit-gold-light font-bold text-lg tabular-nums mt-1">{fmtTL(item.budget)}</div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-60 hover:opacity-100 text-red-300 hover:text-red-200 p-1.5 rounded hover:bg-red-500/20 transition-colors"
        title="Sil"
        data-testid={`${testid}-remove`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function ResultScreen({ result, onReset }) {
  // Confetti on mount
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {/* ignore */} };
  }, []);

  const shareText = encodeURIComponent(
    `Arsa Yatırım Zirvesi mini oyununda ${fmtTL(result.starting_budget)} bütçeyle ` +
    `${result.items.length} yatırım yaptım (${result.daire_count} daire · ${result.arsa_count} arsa). ` +
    `Sen de dene: https://arsayatirimzirvesi.com/yatirim-oyunu`
  );

  return (
    <div className="space-y-4" data-testid="result-screen">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-summit-gold/20 via-white/10 to-summit-gold-light/10 backdrop-blur-sm border-2 border-summit-gold-light/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2">{result.name}, muhteşem portföy!</h2>
        <p className="text-white/80 text-sm sm:text-base mb-6">
          Toplam <strong className="text-summit-gold-light">{fmtTL(result.total_spent)}</strong> yatırımla
          {" "}<strong>{result.items.length} gayrimenkul</strong> seçtin.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="Daire" value={result.daire_count} />
          <MiniStat label="Arsa" value={result.arsa_count} />
          <MiniStat label="Kalan" value={fmtTL(result.remaining)} small />
        </div>

        {result.badges?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6" data-testid="result-badges">
            {result.badges.map(b => (
              <div key={b.id} className="bg-white/15 border border-white/30 rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1" title={b.description}>
                {b.label}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="result-share-wa"
          >
            <Share2 size={15} /> WhatsApp'ta Paylaş
          </a>
          <button
            onClick={onReset}
            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="result-reset"
          >
            <RefreshCw size={15} /> Tekrar Oyna
          </button>
        </div>
      </div>

      {/* Portfolio breakdown */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-summit-gold-light" /> Portföy Dökümü
        </h3>
        <div className="space-y-2">
          {result.items.map((it, i) => {
            const Icon = it.kind === "daire" ? Building : Trees;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3 text-sm">
                <Icon size={18} className="text-summit-gold-light shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {it.kind === "daire" ? `Daire ${it.daire_type}` : (it.arsa_type === "tarla" ? "Tarla" : "Arsa")}
                    {" · "}{it.city} / {it.district}
                  </div>
                  {it.description && <div className="text-xs text-white/60 mt-0.5">{it.description}</div>}
                </div>
                <div className="text-summit-gold-light font-bold tabular-nums shrink-0">{fmtTL(it.budget)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA to register */}
      <div className="bg-summit-gold-light text-summit-navy rounded-2xl p-5 text-center">
        <div className="font-heading font-bold text-lg mb-1">Gerçekten yatırım yapmak ister misin?</div>
        <p className="text-sm opacity-80 mb-3">Arsa Yatırım Zirvesi 2026'da uzmanlarla birebir görüş.</p>
        <a href="/ziyaretci-kaydi" className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white rounded-xl px-5 py-2.5 text-sm font-bold transition-colors" data-testid="result-cta-register">
          Ücretsiz Kayıt Ol <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

function MiniStat({ label, value, small = false }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</div>
      <div className={`text-summit-gold-light font-bold tabular-nums mt-0.5 ${small ? "text-xs sm:text-sm" : "text-2xl"}`}>
        {value}
      </div>
    </div>
  );
}
