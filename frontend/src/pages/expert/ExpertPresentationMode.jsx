import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, X, MapPin, Briefcase, Calendar,
  Maximize, TrendingUp, Wallet, Coins, ArrowRight,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const fmtN = (n) => Number(n || 0).toLocaleString("tr-TR");
const VADE_LABEL = (y) => (y < 1 ? `${Math.round(y * 12)} Ay` : `${y} Yıl`);
const ARSA_LABEL = { ipat: "İPAT", tarla: "Tarla", arsa: "Arsa" };

export default function ExpertPresentationMode() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/uzman/giris", { replace: true });
      else if (user.role !== "expert" && user.role !== "admin") navigate("/uzman/giris", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch entry
  useEffect(() => {
    if (!user || (user.role !== "expert" && user.role !== "admin")) return;
    axios.get(`${API}/expert/investment-game/${id}`, { withCredentials: true })
      .then(({ data }) => setEntry(data))
      .catch((e) => setError(e?.response?.data?.detail || "Kayıt yüklenemedi"))
      .finally(() => setLoading(false));
  }, [id, user]);

  const items = entry?.items || [];
  const total = items.length;

  const prev = useCallback(() => setIdx(i => (i > 0 ? i - 1 : total - 1)), [total]);
  const next = useCallback(() => setIdx(i => (i < total - 1 ? i + 1 : 0)), [total]);
  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    navigate("/uzman/yatirim-oyunu");
  }, [navigate]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, exit]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-summit-navy flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-summit-navy flex flex-col items-center justify-center text-white p-8 gap-4">
        <p className="text-2xl">{error || "Kayıt bulunamadı"}</p>
        <button onClick={() => navigate("/uzman/yatirim-oyunu")}
          className="bg-amber-400 text-summit-navy px-6 py-3 rounded-lg font-bold">
          Listeye Dön
        </button>
      </div>
    );
  }

  const item = items[idx];
  const isDaire = item?.kind === "daire";
  const labelTitle = isDaire ? `Daire ${item.daire_type || ""}` : (ARSA_LABEL[item?.arsa_type] || "Arazi");
  const dateLabel = entry.created_at ? new Date(entry.created_at).toLocaleDateString("tr-TR") : "";

  return (
    <div className="min-h-screen w-full bg-summit-navy text-white font-body overflow-hidden relative" data-testid="expert-presentation">
      {/* Background ornaments */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-sm font-bold">A</div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-bold">Arsa Yatırım · Sunum Modu</div>
            <div className="font-heading text-base sm:text-lg font-bold">Yatırım Simülatörü Değerlendirme</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={requestFullscreen}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold"
            data-testid="presentation-fullscreen">
            <Maximize size={13} /> Tam Ekran
          </button>
          <button onClick={exit}
            className="w-10 h-10 rounded-lg bg-white/[0.06] hover:bg-red-500/30 border border-white/10 hover:border-red-400/40 flex items-center justify-center"
            title="Çıkış (ESC)"
            data-testid="presentation-exit">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 px-8 lg:px-16 py-8 lg:py-10">
        {/* Participant header */}
        <div className="flex items-center gap-6 mb-8 lg:mb-10">
          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-4xl lg:text-6xl font-bold shadow-2xl shrink-0">
            {(entry.name || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase leading-none">{entry.name}</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-base sm:text-xl text-white/75">
              <span className="inline-flex items-center gap-2"><Briefcase size={18} /> {entry.profession || "—"}</span>
              <span className="text-white/30">·</span>
              <span>{entry.age} yaş</span>
              {dateLabel && (<>
                <span className="text-white/30">·</span>
                <span className="inline-flex items-center gap-2"><Calendar size={18} /> {dateLabel}</span>
              </>)}
            </div>
          </div>
        </div>

        {/* Budget tri-stat — XXL */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 lg:mb-10">
          <PresentStat icon={Wallet} label="Bütçe" value={fmtTL(entry.starting_budget)} color="text-white" />
          <PresentStat icon={TrendingUp} label="Toplam Yatırım" value={fmtTL(entry.total_spent)} color="text-amber-300" highlight />
          <PresentStat icon={Coins} label="Kalan" value={fmtTL(entry.remaining)} color="text-white/80" />
        </div>

        {/* Portfolio slide */}
        {item && (
          <div className="bg-white/[0.06] backdrop-blur-sm border border-white/15 rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
            {/* Slide counter */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-amber-400 text-summit-navy rounded-full px-4 py-1.5 text-sm font-bold tabular-nums shadow-lg">
              {idx + 1} / {total}
            </div>

            {/* Title + Price */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 lg:mb-8">
              <div>
                <div className="text-[11px] sm:text-sm uppercase tracking-[0.3em] text-amber-300 font-bold">Portföy Kalemi</div>
                <div className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 tracking-tight">{labelTitle}</div>
              </div>
              <div className={`text-3xl sm:text-4xl lg:text-6xl font-bold tabular-nums ${isDaire ? "text-amber-300" : "text-emerald-300"}`}>
                {fmtTL(item.budget)}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 mb-6 lg:mb-8 text-xl sm:text-2xl lg:text-3xl">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300/80 font-bold mb-1">Konum</div>
                <div className="font-semibold leading-tight truncate">
                  {item.city} <span className="text-white/50">/</span> {item.district}
                  {item.neighborhood && <span className="text-white/60"> · {item.neighborhood}</span>}
                </div>
              </div>
            </div>

            {/* Labeled info — big */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {!isDaire && item.area_m2 != null && item.area_m2 !== "" && (
                <PresentInfo label="Girilen m²" value={`${fmtN(item.area_m2)} m²`} />
              )}
              {!isDaire && item.vade_years != null && (
                <PresentInfo label="Girilen Vade" value={VADE_LABEL(item.vade_years)} />
              )}
              {!isDaire && item.ownership && (
                <PresentInfo label="Mülkiyet" value={item.ownership === "hisseli" ? "Hisseli" : "Müstakil"} />
              )}
              {!isDaire && item.arsa_type && (
                <PresentInfo label="Arazi Tipi" value={ARSA_LABEL[item.arsa_type] || item.arsa_type} />
              )}
              {isDaire && item.daire_type && (
                <PresentInfo label="Daire Tipi" value={item.daire_type} />
              )}
            </div>

            {/* Participant note */}
            {item.description && (
              <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-white/10">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300/80 font-bold mb-2">Katılımcı Notu</div>
                <div className="text-lg sm:text-xl lg:text-2xl italic text-white/90 leading-relaxed">"{item.description}"</div>
              </div>
            )}
          </div>
        )}

        {!item && (
          <div className="text-center py-20 text-white/60 text-xl">Bu katılımcının portföyü boş.</div>
        )}
      </div>

      {/* Bottom navigation */}
      {total > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-summit-navy/85 backdrop-blur-md border-t border-white/10 px-8 py-4 flex items-center justify-between">
          <button onClick={prev}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-sm sm:text-base font-bold"
            data-testid="presentation-prev">
            <ChevronLeft size={20} /> Önceki
          </button>
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-10 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"}`}
                aria-label={`Slayt ${i + 1}`}
              />
            ))}
          </div>
          <button onClick={next}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-summit-navy text-sm sm:text-base font-bold"
            data-testid="presentation-next">
            Sonraki <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="fixed bottom-24 right-6 z-10 hidden lg:flex items-center gap-2 text-white/40 text-xs">
        <kbd className="px-2 py-1 rounded bg-white/10 border border-white/15">←</kbd>
        <kbd className="px-2 py-1 rounded bg-white/10 border border-white/15">→</kbd>
        <span>ile gez ·</span>
        <kbd className="px-2 py-1 rounded bg-white/10 border border-white/15">ESC</kbd>
        <span>ile çık</span>
      </div>
    </div>
  );
}

// === Sub-components ===
function PresentStat({ icon: Icon, label, value, color, highlight }) {
  return (
    <div className={`rounded-2xl p-5 sm:p-6 lg:p-7 border ${
      highlight
        ? "bg-amber-400/15 border-amber-400/40"
        : "bg-white/[0.06] border-white/15"
    }`}>
      <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-white/60 font-bold mb-2">
        <Icon size={14} className={color} /> {label}
      </div>
      <div className={`font-bold tabular-nums tracking-tight text-2xl sm:text-4xl lg:text-5xl ${color}`}>{value}</div>
    </div>
  );
}

function PresentInfo({ label, value }) {
  return (
    <div className="bg-white/[0.05] border border-white/15 rounded-xl px-4 py-3 sm:py-4">
      <div className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300/80 font-bold">{label}</div>
      <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 tabular-nums truncate">{value}</div>
    </div>
  );
}
