import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp, Building, Trees, MapPin, Sparkles, LogOut,
  MessageSquare, Send, Trash2, Clock, Ruler, Layers, Home, Briefcase,
  Calendar, ShieldCheck, Maximize, ArrowLeft, ArrowRight,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const fmtN = (n) => Number(n || 0).toLocaleString("tr-TR");
const VADE_LABEL = (y) => (y < 1 ? `${Math.round(y * 12)} ay` : `${y} yıl`);
const ARSA_LABEL = { ipat: "İPAT", tarla: "Tarla", arsa: "Arsa" };

export default function ExpertGameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Where to go on "Back" — preserve which list user came from
  const backTo = location.state?.from || "/uzman/yatirim-oyunu";

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/uzman/giris", { replace: true });
      else if (user.role !== "expert" && user.role !== "admin") navigate("/uzman/giris", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = async () => {
    setErrorMsg("");
    try {
      // The list endpoint returns full entries — fetch all and pick one (keeps logic in single endpoint)
      const { data } = await axios.get(`${API}/expert/investment-game`, { withCredentials: true });
      const found = (Array.isArray(data) ? data : []).find(d => d.id === id);
      if (!found) setErrorMsg("Kayıt bulunamadı.");
      else setEntry(found);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || "Yüklenemedi";
      setErrorMsg(`Hata: ${status ? `[${status}] ` : ""}${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "expert" || user.role === "admin")) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const handleLogout = async () => {
    await logout();
    navigate("/uzman/giris", { replace: true });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-summit-navy flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-summit-navy flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md backdrop-blur-sm">
          <p className="text-white/80 text-sm mb-4">{errorMsg || "Kayıt bulunamadı."}</p>
          <Link to={backTo} className="inline-flex items-center gap-2 text-amber-400 hover:underline text-sm font-semibold">
            <ArrowLeft size={14} /> Listeye Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-body relative bg-summit-navy" data-testid="expert-detail-page">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-summit-navy via-summit-navy-dark to-[#0f1a3a]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Bar */}
      <header className="relative bg-summit-navy-dark/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
            data-testid="back-to-list"
          >
            <ArrowLeft size={14} /> Listeye Dön
          </button>
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-summit-navy" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">Arsa Yatırım · Uzman Paneli</div>
              <div className="font-heading text-sm font-bold text-white truncate">Portföy Detayı</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-400/50 flex items-center justify-center text-white/80 hover:text-red-300 transition-colors"
            title="Çıkış"
            data-testid="expert-logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header card */}
        <div className="bg-white border border-white/10 rounded-xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-summit-navy text-lg font-bold shrink-0">
              {(entry.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-xl sm:text-2xl text-summit-navy font-bold tracking-tight truncate">{entry.name}</h1>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {entry.profession}</span>
                <span className="text-slate-300">·</span>
                <span>{entry.age} yaş</span>
                {entry.created_at && (<>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1"><Calendar size={11} />{new Date(entry.created_at).toLocaleDateString("tr-TR")}</span>
                </>)}
              </div>
            </div>
          </div>
        </div>

        {/* Presentation Mode */}
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

        {/* Budget summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-3 gap-3 sm:gap-4 shadow-sm">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Bütçe</div>
            <div className="text-base sm:text-xl font-bold text-summit-navy tabular-nums tracking-tight">{fmtTL(entry.starting_budget)}</div>
          </div>
          <div className="border-l border-r border-slate-200 px-2 sm:px-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Yatırım</div>
            <div className="text-base sm:text-xl font-bold text-amber-600 tabular-nums tracking-tight">{fmtTL(entry.total_spent)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Kalan</div>
            <div className="text-base sm:text-xl font-bold text-slate-700 tabular-nums tracking-tight">{fmtTL(entry.remaining)}</div>
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
        <CommentsBlock
          entry={entry}
          currentUser={user}
          onEntryUpdate={(updated) => setEntry(updated)}
        />

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed">
          <strong className="text-summit-navy">Gizlilik:</strong> Katılımcının telefon/e-posta bilgileri sadece admin panelinden görüntülenebilir. Bu sayfada sadece portföy ve demografik veriler yer alır.
        </div>
      </div>
    </div>
  );
}

function CommentsBlock({ entry, currentUser, onEntryUpdate }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const refreshEntry = async () => {
    const { data } = await axios.get(`${API}/expert/investment-game`, { withCredentials: true });
    const updated = (Array.isArray(data) ? data : []).find(d => d.id === entry.id);
    if (updated) onEntryUpdate(updated);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 2) { setErr("Yorum çok kısa"); return; }
    setSubmitting(true); setErr("");
    try {
      await axios.post(`${API}/expert/investment-game/${entry.id}/comments`,
        { comment: comment.trim() },
        { withCredentials: true });
      await refreshEntry();
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
      await refreshEntry();
    } catch (e) {
      alert(e?.response?.data?.detail || "Silinemedi");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={15} className="text-amber-600" />
        <h3 className="font-heading text-summit-navy text-sm sm:text-base font-bold uppercase tracking-wider">Uzman Yorumları ({(entry.expert_comments || []).length})</h3>
      </div>
      <div className="space-y-2">
        {(entry.expert_comments || []).length === 0 && (
          <p className="text-slate-400 text-xs italic text-center py-4 bg-white border border-slate-200 rounded-lg">Henüz yorum yok.</p>
        )}
        {(entry.expert_comments || []).map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`comment-${c.id}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-summit-navy text-[11px] font-bold shrink-0">
                  {(c.author_name || c.author_email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-summit-navy truncate">{c.author_name}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={8} />
                    {c.author_role === "admin" ? "Admin" : "Uzman"}
                    <span className="text-slate-300">·</span>
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
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
          </div>
        ))}
      </div>

      {/* Add comment */}
      <form onSubmit={submit} className="mt-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Bu portföy hakkında uzman yorumunuzu yazın..."
          rows={3}
          maxLength={4000}
          className="w-full bg-transparent text-sm text-summit-navy placeholder-slate-400 focus:outline-none resize-none"
          data-testid="comment-textarea"
        />
        {err && <div className="text-red-600 text-xs mb-2">{err}</div>}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">{comment.length} / 4000</span>
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="bg-summit-navy hover:bg-summit-navy-dark text-white rounded-lg px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            data-testid="comment-submit"
          >
            <Send size={12} /> {submitting ? "Gönderiliyor..." : "Yorum Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailItem({ item }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const label = isDaire ? `Daire ${item.daire_type || ""}` : (ARSA_LABEL[item.arsa_type] || "Arazi");

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <div className={`px-3 py-3 border-r border-slate-200 flex items-center justify-center min-w-[64px] ${isDaire ? "bg-amber-50/60" : "bg-emerald-50/60"}`}>
          <div className={`w-10 h-10 rounded-lg ${isDaire ? "bg-amber-100 border-amber-200" : "bg-emerald-100 border-emerald-200"} border flex items-center justify-center`}>
            <Icon size={18} className={isDaire ? "text-amber-600" : "text-emerald-600"} />
          </div>
        </div>
        <div className="flex-1 px-3.5 py-3 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-summit-navy text-base sm:text-lg truncate">{label}</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1 truncate flex items-center gap-1.5">
                <MapPin size={11} className="shrink-0 text-amber-600" />
                <span><span className="text-slate-400">Konum:</span> <span className="font-semibold text-summit-navy">{item.city} / {item.district}</span>{item.neighborhood ? <span className="text-slate-500"> · {item.neighborhood}</span> : null}</span>
              </div>
            </div>
            <div className={`font-bold text-base sm:text-xl tabular-nums shrink-0 ${isDaire ? "text-amber-600" : "text-emerald-600"}`}>{fmtTL(item.budget)}</div>
          </div>

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

          {isDaire && item.daire_type && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
              <InfoChip icon={Home} label="Daire Tipi" value={item.daire_type} />
            </div>
          )}

          {item.description && (
            <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Katılımcı Notu</div>
              <div className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">"{item.description}"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <Icon size={11} className="text-summit-navy" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold truncate">{label}</div>
        <div className="text-xs font-bold text-summit-navy truncate tabular-nums">{value}</div>
      </div>
    </div>
  );
}
