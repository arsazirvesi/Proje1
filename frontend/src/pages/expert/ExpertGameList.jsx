import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp, Users, Building, Trees, Sparkles, LogOut, Search,
  MessageSquare, Briefcase, ChevronRight, RefreshCw,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const ARSA_LABEL = { ipat: "İPAT", tarla: "Tarla", arsa: "Arsa" };

export default function ExpertGameList() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState("all"); // all | daire | arsa
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/uzman/giris", { replace: true });
      else if (user.role !== "expert" && user.role !== "admin") navigate("/uzman/giris", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = async () => {
    setRefreshing(true);
    setErrorMsg("");
    try {
      const [e, s] = await Promise.all([
        axios.get(`${API}/expert/investment-game`, { withCredentials: true }),
        axios.get(`${API}/expert/investment-game/stats`, { withCredentials: true }),
      ]);
      setEntries(Array.isArray(e.data) ? e.data : []);
      setStats(s.data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || "Liste yüklenemedi";
      setErrorMsg(`Hata: ${status ? `[${status}] ` : ""}${detail}`);
      console.error("Expert list fetch failed:", err?.response?.data || err);
    }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "expert" || user.role === "admin")) {
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterKind !== "all") {
      list = list.filter(e => (e.items || []).some(it => it.kind === filterKind));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.profession || "").toLowerCase().includes(q) ||
        (e.items || []).some(it => (it.city || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [entries, filterKind, search]);

  const handleLogout = async () => {
    await logout();
    navigate("/uzman/giris", { replace: true });
  };

  if (authLoading || (loading && entries.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-summit-navy font-body bg-slate-50">
      {/* Top Bar — clean light corporate */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-summit-navy via-amber-400 to-summit-navy" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-summit-navy" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Arsa Yatırım · Uzman Paneli</div>
              <div className="font-heading text-sm sm:text-base font-bold text-summit-navy leading-tight truncate">Yatırım Simülatörü Değerlendirme</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-summit-navy text-[10px] font-bold">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-summit-navy truncate max-w-[120px]">{user?.name || user?.email}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{user?.role === "admin" ? "Admin" : "Uzman"}</div>
              </div>
            </div>
            <button onClick={load} title="Yenile" disabled={refreshing}
              className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:border-summit-navy/40 flex items-center justify-center text-summit-navy transition-colors disabled:opacity-50"
              data-testid="expert-refresh">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
              title="Çıkış"
              data-testid="expert-logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats — neutral white tiles */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5" data-testid="expert-stats">
            <StatTile icon={Users} label="Katılımcı" value={stats.total_players} accent="navy" />
            <StatTile icon={TrendingUp} label="Ort. Yatırım" value={fmtTL(stats.avg_spent)} accent="amber" small />
            <StatTile icon={Building} label="Daire Seçimi" value={stats.daire_count} accent="amber" />
            <StatTile icon={Trees} label="Arazi Seçimi" value={stats.arsa_count} accent="emerald" />
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim, meslek veya şehir ara..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-summit-navy text-sm placeholder-slate-400 focus:outline-none focus:border-summit-navy transition-colors"
              data-testid="expert-search"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { v: "all", l: "Tümü" },
              { v: "daire", l: "Daire", icon: Building },
              { v: "arsa", l: "Arazi", icon: Trees },
            ].map(o => {
              const I = o.icon;
              const active = filterKind === o.v;
              return (
                <button
                  key={o.v}
                  onClick={() => setFilterKind(o.v)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${active ? "bg-summit-navy text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-summit-navy/40 hover:text-summit-navy"}`}
                  data-testid={`filter-${o.v}`}
                >
                  {I && <I size={12} />}{o.l}
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-sm flex items-start gap-2" data-testid="expert-error-banner">
            <span className="font-bold">⚠</span>
            <span className="break-all">{errorMsg}</span>
          </div>
        )}

        {/* Grid of entry cards */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
            Henüz kayıt yok.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="expert-entries-grid">
            {filtered.map(e => (
              <EntryCard
                key={e.id}
                entry={e}
                onClick={() => navigate(`/uzman/yatirim-oyunu/${e.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ENTRY CARD =====================
function EntryCard({ entry, onClick }) {
  const daireCount = (entry.items || []).filter(i => i.kind === "daire").length;
  const arsaCount = (entry.items || []).filter(i => i.kind === "arsa").length;
  const commentCount = (entry.expert_comments || []).length;
  const dateLabel = entry.created_at ? new Date(entry.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }) : "";

  return (
    <button
      onClick={onClick}
      className="group relative bg-white border border-slate-200 hover:border-summit-navy/40 rounded-xl p-4 text-left transition-all overflow-hidden hover:shadow-md"
      data-testid={`expert-card-${entry.id}`}
    >
      {/* Subtle top accent line, only visible on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-summit-navy text-[11px] font-bold shrink-0">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-summit-navy text-sm truncate">{entry.name || "—"}</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                <Briefcase size={9} /> {entry.profession || "—"} · {entry.age} yaş
              </div>
            </div>
          </div>
        </div>
        {commentCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1 text-amber-700 text-[10px] font-bold shrink-0">
            <MessageSquare size={10} /> {commentCount}
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="flex items-end justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Yatırım</div>
          <div className="text-lg font-bold text-amber-600 tabular-nums leading-tight">{fmtTL(entry.total_spent)}</div>
          <div className="text-[10px] text-slate-400 tabular-nums">/ {fmtTL(entry.starting_budget)} bütçe</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{dateLabel}</div>
          <div className="flex gap-1.5 mt-1">
            {daireCount > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 text-[9px] inline-flex items-center gap-0.5"><Building size={9} /> {daireCount}</span>}
            {arsaCount > 0 && <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded px-1.5 py-0.5 text-[9px] inline-flex items-center gap-0.5"><Trees size={9} /> {arsaCount}</span>}
          </div>
        </div>
      </div>

      {/* Item preview (first 2) */}
      <div className="space-y-1.5">
        {(entry.items || []).slice(0, 2).map((it, i) => (
          <MiniItem key={i} item={it} />
        ))}
        {(entry.items || []).length > 2 && (
          <div className="text-[10px] text-slate-400 text-center pt-1">+ {entry.items.length - 2} yatırım daha</div>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Detay & yorumlar için tıkla</span>
        <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

function MiniItem({ item }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const label = isDaire ? `Daire ${item.daire_type || ""}` : (ARSA_LABEL[item.arsa_type] || "Arazi");
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
      <Icon size={12} className={isDaire ? "text-amber-600" : "text-emerald-600"} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-summit-navy truncate">
          <span className="font-semibold">{label}</span>
          <span className="text-slate-500"> · {item.city}/{item.district}</span>
        </div>
      </div>
      <div className={`text-[11px] font-bold tabular-nums ${isDaire ? "text-amber-600" : "text-emerald-600"}`}>{fmtTL(item.budget)}</div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent = "amber", small = false }) {
  const colors = accent === "emerald"
    ? { text: "text-emerald-600" }
    : accent === "navy"
    ? { text: "text-summit-navy" }
    : { text: "text-amber-600" };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
        <Icon size={11} className={colors.text} /> {label}
      </div>
      <div className={`font-bold tabular-nums text-summit-navy ${small ? "text-sm sm:text-base" : "text-xl sm:text-2xl"}`}>{value}</div>
    </div>
  );
}
