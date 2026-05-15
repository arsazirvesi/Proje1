import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp, Users, Building, Trees, MapPin, Sparkles, LogOut, Search,
  MessageSquare, Send, Trash2, Clock, Ruler, Layers, Home, Briefcase,
  Calendar, ShieldCheck, ChevronDown, RefreshCw, X, Maximize, ArrowRight,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const fmtN = (n) => Number(n || 0).toLocaleString("tr-TR");
const VADE_LABEL = (y) => (y < 1 ? `${Math.round(y * 12)} ay` : `${y} yıl`);
const ARSA_LABEL = { ipat: "İPAT", tarla: "Tarla", arsa: "Arsa" };

export default function ExpertGameList() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState("all"); // all | daire | arsa
  const [refreshing, setRefreshing] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/uzman/giris", { replace: true });
      else if (user.role !== "expert" && user.role !== "admin") navigate("/uzman/giris", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = async () => {
    setRefreshing(true);
    try {
      const [e, s] = await Promise.all([
        axios.get(`${API}/expert/investment-game`, { withCredentials: true }),
        axios.get(`${API}/expert/investment-game/stats`, { withCredentials: true }),
      ]);
      setEntries(e.data);
      setStats(s.data);
    } catch {/* ignore */}
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
      <div className="min-h-screen bg-summit-paper flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-summit-navy font-body relative bg-[#F4F2EC]">
      {/* Layered background — corporate but with character */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Soft warm gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F4F2EC] via-[#FAF8F2] to-[#EFEAE0]" />
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(circle, #1E2C5B 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Decorative gradient orbs */}
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-amber-300/25 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-[420px] h-[420px] bg-summit-navy/[0.06] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[460px] h-[460px] bg-amber-400/15 rounded-full blur-3xl" />
        {/* Diagonal accent line */}
        <div className="absolute inset-x-0 top-[55%] h-px bg-gradient-to-r from-transparent via-summit-navy/10 to-transparent" />
      </div>

      {/* Top Bar — light corporate */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-40 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-summit-navy via-amber-400 to-summit-navy" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={18} className="text-summit-navy" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Arsa Yatırım · Uzman Paneli</div>
              <div className="font-heading text-sm sm:text-base font-bold text-summit-navy leading-tight truncate">Yatırım Simülatörü Değerlendirme</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-[10px] font-bold">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-summit-navy truncate max-w-[120px]">{user?.name || user?.email}</div>
                <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold">{user?.role === "admin" ? "Admin" : "Uzman"}</div>
              </div>
            </div>
            <button onClick={load} title="Yenile" disabled={refreshing}
              className="w-9 h-9 rounded-lg bg-white border border-gray-200 hover:border-summit-navy/40 hover:bg-summit-paper flex items-center justify-center text-summit-navy transition-colors disabled:opacity-50 shadow-sm"
              data-testid="expert-refresh">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors shadow-sm"
              title="Çıkış"
              data-testid="expert-logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5" data-testid="expert-stats">
            <StatTile icon={Users} label="Katılımcı" value={stats.total_players} accent="amber" />
            <StatTile icon={TrendingUp} label="Ort. Yatırım" value={fmtTL(stats.avg_spent)} accent="amber" small />
            <StatTile icon={Building} label="Daire Seçimi" value={stats.daire_count} accent="amber" />
            <StatTile icon={Trees} label="Arazi Seçimi" value={stats.arsa_count} accent="emerald" />
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim, meslek veya şehir ara..."
              className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy transition-colors shadow-sm"
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
                  className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${active ? "bg-summit-navy text-white shadow-sm" : "bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-600 hover:border-summit-navy/40 hover:text-summit-navy"}`}
                  data-testid={`filter-${o.v}`}
                >
                  {I && <I size={12} />}{o.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid of entry cards */}
        {filtered.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
            Henüz kayıt yok.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="expert-entries-grid">
            {filtered.map(e => (
              <EntryCard
                key={e.id}
                entry={e}
                onClick={() => setSelected(e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <EntryDetail
          entry={selected}
          currentUser={user}
          onClose={() => setSelected(null)}
          onCommentAdded={(updated) => {
            setEntries(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelected(updated);
          }}
        />
      )}
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
      className="group relative bg-white hover:bg-white border border-gray-200 hover:border-summit-navy/40 rounded-2xl p-4 text-left transition-all overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5"
      data-testid={`expert-card-${entry.id}`}
    >
      {/* Top corporate stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-summit-navy/0 via-amber-400/70 to-summit-navy/0 opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-200/35 rounded-full blur-2xl group-hover:bg-amber-300/50 transition-all" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-[11px] font-bold shrink-0">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-summit-navy text-sm truncate">{entry.name || "—"}</div>
              <div className="text-[10px] text-gray-500 flex items-center gap-1.5 truncate">
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
      <div className="flex items-end justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Yatırım</div>
          <div className="text-lg font-bold text-amber-600 tabular-nums leading-tight">{fmtTL(entry.total_spent)}</div>
          <div className="text-[10px] text-gray-400 tabular-nums">/ {fmtTL(entry.starting_budget)} bütçe</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{dateLabel}</div>
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
          <div className="text-[10px] text-gray-400 text-center pt-1">+ {entry.items.length - 2} yatırım daha</div>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
        <span>Detay & yorumlar için tıkla</span>
        <ChevronDown size={11} className="-rotate-90" />
      </div>
    </button>
  );
}

function MiniItem({ item }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const label = isDaire ? `Daire ${item.daire_type || ""}` : (ARSA_LABEL[item.arsa_type] || "Arazi");
  return (
    <div className="flex items-center gap-2 bg-summit-paper border border-gray-200 rounded-lg px-2 py-1.5">
      <Icon size={12} className={isDaire ? "text-amber-600" : "text-emerald-600"} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-summit-navy truncate">
          <span className="font-semibold">{label}</span>
          <span className="text-gray-500"> · {item.city}/{item.district}</span>
        </div>
      </div>
      <div className={`text-[11px] font-bold tabular-nums ${isDaire ? "text-amber-600" : "text-emerald-600"}`}>{fmtTL(item.budget)}</div>
    </div>
  );
}

// ===================== ENTRY DETAIL DRAWER =====================
function EntryDetail({ entry, currentUser, onClose, onCommentAdded }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 2) { setErr("Yorum çok kısa"); return; }
    setSubmitting(true); setErr("");
    try {
      await axios.post(`${API}/expert/investment-game/${entry.id}/comments`,
        { comment: comment.trim() },
        { withCredentials: true });
      // Refresh entire list to get updated entry
      const { data } = await axios.get(`${API}/expert/investment-game`, { withCredentials: true });
      const updated = data.find(d => d.id === entry.id) || entry;
      onCommentAdded(updated);
      setComment("");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Yorum eklenemedi");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Bu yorumu silmek istiyor musunuz?")) return;
    try {
      await axios.delete(`${API}/expert/investment-game/${entry.id}/comments/${commentId}`,
        { withCredentials: true });
      const { data } = await axios.get(`${API}/expert/investment-game`, { withCredentials: true });
      const updated = data.find(d => d.id === entry.id) || entry;
      onCommentAdded(updated);
    } catch (e) {
      alert(e?.response?.data?.detail || "Silinemedi");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="expert-detail">
      <div className="absolute inset-0 bg-summit-navy/40 backdrop-blur-sm" />
      <div className="relative ml-auto h-full w-full max-w-3xl bg-white border-l border-gray-200 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-summit-navy via-amber-400 to-summit-navy" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-base font-bold shrink-0 shadow-sm">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-heading text-lg sm:text-xl text-summit-navy font-bold truncate tracking-tight">{entry.name}</div>
              <div className="text-xs text-gray-500 truncate flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {entry.profession}</span>
                <span className="text-gray-300">·</span>
                <span>{entry.age} yaş</span>
                {entry.created_at && (<>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1"><Calendar size={11} />{new Date(entry.created_at).toLocaleDateString("tr-TR")}</span>
                </>)}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg bg-summit-paper hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-summit-navy shrink-0" data-testid="expert-detail-close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* Presentation Mode Button — for stage use */}
          <a
            href={`/uzman/sunum/${entry.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between bg-summit-navy hover:bg-summit-navy-dark text-white rounded-xl px-4 py-3 transition-colors group"
            data-testid="open-presentation-mode"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center text-summit-navy shrink-0">
                <Maximize size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">Sahne / Sunum Modu</div>
                <div className="text-[11px] text-white/70 mt-0.5">Yeni sekmede tam ekran projeksiyon görünümü</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-amber-300 shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Budget summary — balanced scale */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 rounded-2xl p-4 sm:p-5 grid grid-cols-3 gap-3 sm:gap-4 shadow-sm">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Bütçe</div>
              <div className="text-base sm:text-xl font-bold text-summit-navy tabular-nums tracking-tight">{fmtTL(entry.starting_budget)}</div>
            </div>
            <div className="border-l border-r border-amber-200/70 px-2 sm:px-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Yatırım</div>
              <div className="text-base sm:text-xl font-bold text-amber-600 tabular-nums tracking-tight">{fmtTL(entry.total_spent)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Kalan</div>
              <div className="text-base sm:text-xl font-bold text-gray-700 tabular-nums tracking-tight">{fmtTL(entry.remaining)}</div>
            </div>
          </div>

          {/* Badges */}
          {(entry.badges || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(entry.badges || []).map(b => (
                <span key={b.id} className="bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 text-[10px] font-bold" title={b.description}>
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Portfolio Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-amber-600" />
              <h3 className="font-heading text-summit-navy text-sm sm:text-base font-bold uppercase tracking-wider">Portföy ({entry.items?.length || 0})</h3>
            </div>
            <div className="space-y-2.5">
              {(entry.items || []).map((it, i) => <DetailItem key={i} item={it} />)}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={15} className="text-amber-600" />
              <h3 className="font-heading text-summit-navy text-sm sm:text-base font-bold uppercase tracking-wider">Uzman Yorumları ({(entry.expert_comments || []).length})</h3>
            </div>
            <div className="space-y-2">
              {(entry.expert_comments || []).length === 0 && (
                <p className="text-gray-400 text-xs italic text-center py-4 bg-summit-paper border border-gray-200 rounded-lg">Henüz yorum yok.</p>
              )}
              {(entry.expert_comments || []).map(c => (
                <div key={c.id} className="bg-summit-paper border border-gray-200 rounded-xl p-3" data-testid={`comment-${c.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-[11px] font-bold shrink-0">
                        {(c.author_name || c.author_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-summit-navy truncate">{c.author_name}</div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck size={8} />
                          {c.author_role === "admin" ? "Admin" : "Uzman"}
                          <span className="text-gray-300">·</span>
                          <Clock size={8} /> {new Date(c.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    {(currentUser?.role === "admin" || c.author_email === currentUser?.email) && (
                      <button onClick={() => deleteComment(c.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Sil" data-testid={`delete-comment-${c.id}`}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <form onSubmit={submit} className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Bu portföy hakkında uzman yorumunuzu yazın..."
                rows={3}
                maxLength={4000}
                className="w-full bg-transparent text-sm text-summit-navy placeholder-gray-400 focus:outline-none resize-none"
                data-testid="comment-textarea"
              />
              {err && <div className="text-red-600 text-xs mb-2">{err}</div>}
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">{comment.length} / 4000</span>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="bg-gradient-to-r from-summit-navy to-summit-navy-dark hover:shadow-md text-white rounded-lg px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  data-testid="comment-submit"
                >
                  <Send size={12} /> {submitting ? "Gönderiliyor..." : "Yorum Gönder"}
                </button>
              </div>
            </form>
          </div>

          {/* Privacy note */}
          <div className="bg-summit-paper border border-gray-200 rounded-lg p-3 text-[11px] text-gray-600 leading-relaxed">
            <strong className="text-summit-navy">Gizlilik:</strong> Katılımcının telefon/e-posta bilgileri sadece admin panelinden görüntülenebilir. Bu panelde sadece portföy ve demografik veriler yer alır.
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ item }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const label = isDaire ? `Daire ${item.daire_type || ""}` : (ARSA_LABEL[item.arsa_type] || "Arazi");

  return (
    <div className="group relative bg-white border border-gray-200 hover:border-summit-navy/30 rounded-xl transition-all shadow-sm hover:shadow-md overflow-hidden">
      <div className="flex items-stretch">
        <div className={`px-3 py-3 border-r border-dashed border-gray-200 flex flex-col items-center justify-center min-w-[70px] ${isDaire ? "bg-amber-50/40" : "bg-emerald-50/40"}`}>
          <div className={`w-10 h-10 rounded-xl ${isDaire ? "bg-amber-100 border-amber-200" : "bg-emerald-100 border-emerald-200"} border flex items-center justify-center`}>
            <Icon size={18} className={isDaire ? "text-amber-600" : "text-emerald-600"} />
          </div>
        </div>
        <div className="flex-1 px-3.5 py-3 min-w-0">
          {/* Top row: Title + Price */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-summit-navy text-base sm:text-lg truncate">{label}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1 truncate flex items-center gap-1.5">
                <MapPin size={11} className="shrink-0 text-amber-600" />
                <span><span className="text-gray-400">Konum:</span> <span className="font-semibold text-summit-navy">{item.city} / {item.district}</span>{item.neighborhood ? <span className="text-gray-500"> · {item.neighborhood}</span> : null}</span>
              </div>
            </div>
            <div className={`font-bold text-base sm:text-xl tabular-nums shrink-0 ${isDaire ? "text-amber-600" : "text-emerald-600"}`}>{fmtTL(item.budget)}</div>
          </div>

          {/* Labeled info grid — for arsa/tarla */}
          {!isDaire && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
              {item.area_m2 != null && item.area_m2 !== "" && (
                <InfoChip icon={Ruler} label="Girilen m²" value={`${fmtN(item.area_m2)} m²`} />
              )}
              {item.vade_years != null && (
                <InfoChip icon={Clock} label="Belirlenen Vade" value={VADE_LABEL(item.vade_years)} />
              )}
              {item.ownership && (
                <InfoChip icon={Layers} label="Mülkiyet" value={item.ownership === "hisseli" ? "Hisseli" : "Müstakil"} />
              )}
              {item.arsa_type && (
                <InfoChip icon={Trees} label="Arazi Tipi" value={ARSA_LABEL[item.arsa_type] || item.arsa_type} />
              )}
            </div>
          )}

          {/* Daire specific */}
          {isDaire && item.daire_type && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
              <InfoChip icon={Home} label="Daire Tipi" value={item.daire_type} />
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="mt-3 pt-2.5 border-t border-dashed border-gray-200">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Katılımcı Notu</div>
              <div className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">"{item.description}"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="bg-summit-paper border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">
        <Icon size={11} className="text-summit-navy" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold truncate">{label}</div>
        <div className="text-xs font-bold text-summit-navy truncate tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, text }) {
  return (
    <span className="bg-summit-paper border border-gray-200 text-gray-700 rounded-md px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1">
      <Icon size={11} /> {text}
    </span>
  );
}

function StatTile({ icon: Icon, label, value, accent = "amber", small = false }) {
  const colors = accent === "emerald"
    ? { bg: "from-emerald-50 to-emerald-100/40", border: "border-emerald-200", text: "text-emerald-600" }
    : { bg: "from-amber-50 to-amber-100/40", border: "border-amber-200", text: "text-amber-600" };
  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-3 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">
        <Icon size={11} className={colors.text} /> {label}
      </div>
      <div className={`font-bold tabular-nums text-summit-navy ${small ? "text-sm sm:text-base" : "text-xl sm:text-2xl"}`}>{value}</div>
    </div>
  );
}
