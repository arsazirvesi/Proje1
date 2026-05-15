import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp, Users, Building, Trees, MapPin, Sparkles, LogOut, Search,
  MessageSquare, Send, Trash2, Clock, Ruler, Layers, Home, Briefcase,
  Calendar, ShieldCheck, ChevronDown, RefreshCw, X,
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
      <div className="min-h-screen bg-gradient-to-br from-summit-navy to-[#0F1833] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-summit-paper via-white to-summit-paper text-summit-navy font-body">
      {/* Decorative — subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[500px] h-[500px] bg-summit-navy/[0.04] rounded-full blur-3xl" />
      </div>

      {/* Top Bar — light corporate */}
      <header className="relative bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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
            <div className="hidden sm:flex items-center gap-2 bg-summit-paper border border-gray-200 rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-summit-navy text-[10px] font-bold">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-summit-navy truncate max-w-[120px]">{user?.name || user?.email}</div>
                <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold">{user?.role === "admin" ? "Admin" : "Uzman"}</div>
              </div>
            </div>
            <button onClick={load} title="Yenile" disabled={refreshing}
              className="w-9 h-9 rounded-lg bg-white border border-gray-200 hover:border-summit-navy/40 hover:bg-summit-paper flex items-center justify-center text-summit-navy transition-colors disabled:opacity-50"
              data-testid="expert-refresh">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors"
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
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy transition-colors shadow-sm"
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
                  className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${active ? "bg-summit-navy text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-summit-navy/40 hover:text-summit-navy"}`}
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
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
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
      className="group relative bg-gradient-to-br from-white/[0.09] to-white/[0.03] hover:from-white/[0.13] hover:to-white/[0.06] backdrop-blur-sm border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 text-left transition-all overflow-hidden"
      data-testid={`expert-card-${entry.id}`}
    >
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-400/8 rounded-full blur-2xl group-hover:bg-amber-400/15 transition-all" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-summit-navy text-[11px] font-bold shrink-0">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-sm truncate">{entry.name || "—"}</div>
              <div className="text-[10px] text-white/55 flex items-center gap-1.5 truncate">
                <Briefcase size={9} /> {entry.profession || "—"} · {entry.age} yaş
              </div>
            </div>
          </div>
        </div>
        {commentCount > 0 && (
          <div className="bg-amber-400/15 border border-amber-400/30 rounded-full px-2 py-0.5 flex items-center gap-1 text-amber-200 text-[10px] font-bold shrink-0">
            <MessageSquare size={10} /> {commentCount}
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="flex items-end justify-between gap-2 mb-3 pb-3 border-b border-white/10">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Yatırım</div>
          <div className="text-lg font-bold text-amber-300 tabular-nums leading-tight">{fmtTL(entry.total_spent)}</div>
          <div className="text-[10px] text-white/40 tabular-nums">/ {fmtTL(entry.starting_budget)} bütçe</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold">{dateLabel}</div>
          <div className="flex gap-1.5 mt-1">
            {daireCount > 0 && <span className="bg-amber-400/15 border border-amber-400/25 text-amber-200 rounded px-1.5 py-0.5 text-[9px] inline-flex items-center gap-0.5"><Building size={9} /> {daireCount}</span>}
            {arsaCount > 0 && <span className="bg-emerald-400/15 border border-emerald-400/25 text-emerald-200 rounded px-1.5 py-0.5 text-[9px] inline-flex items-center gap-0.5"><Trees size={9} /> {arsaCount}</span>}
          </div>
        </div>
      </div>

      {/* Item preview (first 2) */}
      <div className="space-y-1.5">
        {(entry.items || []).slice(0, 2).map((it, i) => (
          <MiniItem key={i} item={it} />
        ))}
        {(entry.items || []).length > 2 && (
          <div className="text-[10px] text-white/40 text-center pt-1">+ {entry.items.length - 2} yatırım daha</div>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/45">
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
    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5">
      <Icon size={12} className={isDaire ? "text-amber-300" : "text-emerald-300"} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white truncate">
          <span className="font-semibold">{label}</span>
          <span className="text-white/50"> · {item.city}/{item.district}</span>
        </div>
      </div>
      <div className={`text-[11px] font-bold tabular-nums ${isDaire ? "text-amber-300" : "text-emerald-300"}`}>{fmtTL(item.budget)}</div>
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative ml-auto h-full w-full max-w-2xl bg-summit-navy border-l border-white/10 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-summit-navy/95 backdrop-blur-md border-b border-white/10 px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-summit-navy text-sm font-bold shrink-0">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-heading text-base sm:text-lg text-white font-bold truncate">{entry.name}</div>
              <div className="text-[11px] text-white/60 truncate">
                <Briefcase size={9} className="inline mr-1" />
                {entry.profession} · {entry.age} yaş
                {entry.created_at && <> · <Calendar size={9} className="inline mx-1" />{new Date(entry.created_at).toLocaleDateString("tr-TR")}</>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/80" data-testid="expert-detail-close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* Budget summary */}
          <div className="bg-gradient-to-br from-amber-400/15 to-amber-500/5 border border-amber-400/30 rounded-2xl p-4 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Bütçe</div>
              <div className="text-lg font-bold text-white tabular-nums">{fmtTL(entry.starting_budget)}</div>
            </div>
            <div className="border-l border-r border-white/10 px-3">
              <div className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Yatırım</div>
              <div className="text-lg font-bold text-amber-300 tabular-nums">{fmtTL(entry.total_spent)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Kalan</div>
              <div className="text-lg font-bold text-white/80 tabular-nums">{fmtTL(entry.remaining)}</div>
            </div>
          </div>

          {/* Badges */}
          {(entry.badges || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(entry.badges || []).map(b => (
                <span key={b.id} className="bg-amber-400/15 border border-amber-400/30 text-amber-100 rounded-full px-2.5 py-1 text-[10px] font-bold" title={b.description}>
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Portfolio Items */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-amber-300" />
              <h3 className="font-heading text-white text-sm font-bold uppercase tracking-wider">Portföy ({entry.items?.length || 0})</h3>
            </div>
            <div className="space-y-2">
              {(entry.items || []).map((it, i) => <DetailItem key={i} item={it} />)}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-amber-300" />
              <h3 className="font-heading text-white text-sm font-bold uppercase tracking-wider">Uzman Yorumları ({(entry.expert_comments || []).length})</h3>
            </div>
            <div className="space-y-2">
              {(entry.expert_comments || []).length === 0 && (
                <p className="text-white/40 text-xs italic text-center py-3 bg-white/[0.03] border border-white/5 rounded-lg">Henüz yorum yok.</p>
              )}
              {(entry.expert_comments || []).map(c => (
                <div key={c.id} className="bg-white/[0.06] border border-white/10 rounded-xl p-3" data-testid={`comment-${c.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-summit-navy text-[10px] font-bold shrink-0">
                        {(c.author_name || c.author_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{c.author_name}</div>
                        <div className="text-[9px] text-white/45 uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck size={8} />
                          {c.author_role === "admin" ? "Admin" : "Uzman"}
                          <span className="text-white/30">·</span>
                          <Clock size={8} /> {new Date(c.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    {(currentUser?.role === "admin" || c.author_email === currentUser?.email) && (
                      <button onClick={() => deleteComment(c.id)} className="text-red-300/70 hover:text-red-300 p-1 rounded hover:bg-red-500/15" title="Sil" data-testid={`delete-comment-${c.id}`}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <form onSubmit={submit} className="mt-3 bg-white/[0.05] border border-white/10 rounded-xl p-3">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Bu portföy hakkında uzman yorumunuzu yazın..."
                rows={3}
                maxLength={4000}
                className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none resize-none"
                data-testid="comment-textarea"
              />
              {err && <div className="text-red-300 text-xs mb-2">{err}</div>}
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/40">{comment.length} / 4000</span>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-summit-navy rounded-lg px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  data-testid="comment-submit"
                >
                  <Send size={12} /> {submitting ? "Gönderiliyor..." : "Yorum Gönder"}
                </button>
              </div>
            </form>
          </div>

          {/* Privacy note */}
          <div className="bg-white/[0.04] border border-white/10 rounded-lg p-3 text-[11px] text-white/55 leading-relaxed">
            <strong className="text-white/70">Gizlilik:</strong> Katılımcının telefon/e-posta bilgileri sadece admin panelinden görüntülenebilir. Bu panelde sadece portföy ve demografik veriler yer alır.
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
  const accent = isDaire ? "amber" : "emerald";

  return (
    <div className={`group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-${accent}-400/30 rounded-xl transition-all`}>
      <div className="flex items-stretch">
        <div className="px-3 py-3 border-r border-dashed border-white/10 flex flex-col items-center justify-center min-w-[60px]">
          <div className={`w-8 h-8 rounded-lg ${isDaire ? "bg-amber-400/15 border-amber-400/30" : "bg-emerald-400/15 border-emerald-400/30"} border flex items-center justify-center mb-1`}>
            <Icon size={14} className={isDaire ? "text-amber-300" : "text-emerald-300"} />
          </div>
        </div>
        <div className="flex-1 px-3 py-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-sm truncate">{label}</div>
              <div className="text-[11px] text-white/65 mt-0.5 truncate flex items-center gap-1">
                <MapPin size={9} /> {item.city} / {item.district}{item.neighborhood ? ` · ${item.neighborhood}` : ""}
              </div>
              {!isDaire && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.area_m2 && <Chip icon={Ruler} text={`${fmtN(item.area_m2)} m²`} />}
                  {item.vade_years && <Chip icon={Clock} text={VADE_LABEL(item.vade_years)} />}
                  {item.ownership && <Chip icon={Layers} text={item.ownership === "hisseli" ? "Hisseli" : "Müstakil"} />}
                </div>
              )}
              {item.description && (
                <div className="text-[11px] text-white/45 mt-1.5 italic line-clamp-2">"{item.description}"</div>
              )}
            </div>
            <div className={`font-bold text-base tabular-nums shrink-0 ${isDaire ? "text-amber-300" : "text-emerald-300"}`}>{fmtTL(item.budget)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, text }) {
  return (
    <span className="bg-white/[0.07] border border-white/10 text-white/75 rounded px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1">
      <Icon size={9} /> {text}
    </span>
  );
}

function StatTile({ icon: Icon, label, value, accent = "amber", small = false }) {
  const colors = accent === "emerald"
    ? { bg: "from-emerald-400/15 to-emerald-500/5", border: "border-emerald-400/30", text: "text-emerald-300" }
    : { bg: "from-amber-400/15 to-amber-500/5", border: "border-amber-400/30", text: "text-amber-300" };
  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/60 font-bold mb-1">
        <Icon size={11} className={colors.text} /> {label}
      </div>
      <div className={`font-bold tabular-nums text-white ${small ? "text-sm sm:text-base" : "text-xl sm:text-2xl"}`}>{value}</div>
    </div>
  );
}
