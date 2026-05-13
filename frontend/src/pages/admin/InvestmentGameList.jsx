import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Gamepad2, Users, TrendingUp, Building, Trees, Download, Trash2,
  ChevronDown, ChevronUp, MapPin, RefreshCw, Link as LinkIcon, Copy, Check,
  Mail, Send, Clock, Ruler, Home, AlertCircle, Wallet,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
const VADE_LABEL = (y) => (y < 1 ? `${Math.round(y * 12)} ay` : `${y} yıl`);
const ARSA_LABEL = { ipat: "İPAT", tarla: "Tarla", arsa: "Arsa" };

export default function InvestmentGameList() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [replyFor, setReplyFor] = useState(null); // entry to reply to

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        axios.get(`${API}/admin/investment-game`, { withCredentials: true }),
        axios.get(`${API}/admin/investment-game/stats`, { withCredentials: true }),
      ]);
      setEntries(e.data);
      setStats(s.data);
    } catch {/* ignore */}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} kişisinin oyun kaydını silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API}/admin/investment-game/${id}`, { withCredentials: true });
      await load();
    } catch {/* ignore */}
  };

  const downloadCsv = () => {
    window.open(`${API}/admin/investment-game/export`, "_blank");
  };

  const gameUrl = (typeof window !== "undefined") ? `${window.location.origin}/yatirim-oyunu` : "";
  const copyLink = () => {
    try {
      navigator.clipboard.writeText(gameUrl);
    } catch {
      const ta = document.createElement("textarea"); ta.value = gameUrl;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.name || "").toLowerCase().includes(q)
      || (e.phone || "").includes(q)
      || (e.email || "").toLowerCase().includes(q)
      || (e.profession || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5" data-testid="admin-game-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Gamepad2 size={26} /> Yatırım Simülatörü — Kayıtlar
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ziyaretçilerin seçtiği bütçe ile oluşturdukları gayrimenkul portföyleri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyLink} className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-summit-paper text-summit-navy rounded-md px-3 py-2 text-xs font-semibold" data-testid="copy-game-link">
            {copied ? <><Check size={13} className="text-green-600" /> Kopyalandı</> : <><LinkIcon size={13} /> Oyun Linkini Kopyala</>}
          </button>
          <button onClick={load} className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-summit-paper text-summit-navy rounded-md px-3 py-2 text-xs font-semibold" data-testid="refresh-btn">
            <RefreshCw size={13} /> Yenile
          </button>
          <button onClick={downloadCsv} className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-3 py-2 text-xs font-semibold" data-testid="export-btn">
            <Download size={13} /> Excel/CSV İndir
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="game-stats">
          <StatTile icon={Users} label="Oynayan" value={stats.total_players} />
          <StatTile icon={TrendingUp} label="Ortalama Yatırım" value={fmtTL(stats.avg_spent)} small />
          <StatTile icon={Building} label="Daire Seçimi" value={stats.daire_count} tone="navy" />
          <StatTile icon={Trees} label="Arazi Seçimi" value={stats.arsa_count} tone="gold" />
          <StatTile icon={MapPin} label="Popüler İl" value={stats.top_cities?.[0]?.city || "—"} sub={stats.top_cities?.[0] ? `${stats.top_cities[0].count} seçim` : ""} small />
        </div>
      )}

      {/* Sub-stats */}
      {stats && (stats.top_cities?.length > 0 || stats.top_daire_types?.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Top Şehirler</div>
            <div className="space-y-1">
              {stats.top_cities.map(c => (
                <div key={c.city} className="flex justify-between text-summit-navy"><span>{c.city}</span><strong>{c.count}</strong></div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Daire Tipleri</div>
            <div className="space-y-1">
              {stats.top_daire_types.map(t => (
                <div key={t.type} className="flex justify-between text-summit-navy"><span>{t.type}</span><strong>{t.count}</strong></div>
              ))}
              {stats.top_daire_types.length === 0 && <div className="text-gray-400 italic text-xs">Henüz yok</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Arazi Cinsi</div>
            <div className="space-y-1">
              {stats.top_arsa_types.map(t => (
                <div key={t.type} className="flex justify-between text-summit-navy"><span>{ARSA_LABEL[t.type] || (t.type || "?").toString()}</span><strong>{t.count}</strong></div>
              ))}
              {stats.top_arsa_types.length === 0 && <div className="text-gray-400 italic text-xs">Henüz yok</div>}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="İsim, telefon, e-posta veya meslek ara…"
        className="w-full sm:w-96 bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
        data-testid="search-input"
      />

      {/* LIST */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Gamepad2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Henüz oyun kaydı yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-summit-paper border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold"></th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Tarih</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Ad Soyad</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">İletişim</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Yaş / Meslek</th>
                  <th className="text-right px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Bütçe</th>
                  <th className="text-right px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Yatırım</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">#</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Cevap</th>
                  <th className="text-right px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const open = expanded === e.id;
                  const replyCount = (e.replies || []).length;
                  return (
                    <React.Fragment key={e.id}>
                      <tr className="border-b border-gray-100 hover:bg-summit-paper/60 cursor-pointer" onClick={() => setExpanded(open ? null : e.id)} data-testid={`row-${e.id}`}>
                        <td className="px-3 py-2.5 text-gray-400">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(e.created_at).toLocaleString("tr-TR")}</td>
                        <td className="px-3 py-2.5 font-semibold text-summit-navy">{e.name}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          <div>{e.phone}</div>
                          {e.email && <div className="text-[11px] text-gray-500">{e.email}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          <div>{e.age}</div>
                          <div className="text-[11px] text-gray-500">{e.profession}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">{fmtTL(e.starting_budget)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-summit-navy tabular-nums whitespace-nowrap">{fmtTL(e.total_spent)}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">{(e.items || []).length}</td>
                        <td className="px-3 py-2.5">
                          {replyCount > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                              <Check size={11} /> {replyCount}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {e.email && (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); setReplyFor(e); }}
                                className="p-1.5 text-summit-navy hover:bg-summit-navy/10 rounded transition-colors"
                                title="Cevap Gönder"
                                data-testid={`reply-${e.id}`}
                              >
                                <Mail size={14} />
                              </button>
                            )}
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id, e.name); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Sil"
                              data-testid={`delete-${e.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-summit-paper/40">
                          <td colSpan={10} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                              {(e.items || []).map((it, i) => <ItemDetailCard key={i} item={it} />)}
                            </div>

                            {/* Replies log */}
                            {replyCount > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Gönderilen Cevaplar</div>
                                <div className="space-y-2">
                                  {(e.replies || []).map((r, i) => (
                                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <strong className="text-summit-navy text-xs">{r.subject}</strong>
                                        <span className="text-[10px] text-gray-500">{new Date(r.sent_at).toLocaleString("tr-TR")}</span>
                                      </div>
                                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{r.message}</pre>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyFor && (
        <ReplyModal entry={replyFor} onClose={() => setReplyFor(null)} onSent={async () => { setReplyFor(null); await load(); }} />
      )}
    </div>
  );
}

function ItemDetailCard({ item }) {
  const isDaire = item.kind === "daire";
  const Icon = isDaire ? Building : Trees;
  const landLabel = isDaire ? null : (ARSA_LABEL[item.arsa_type] || "Arazi");
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2 text-sm">
      <Icon size={18} className="text-summit-gold shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-summit-navy">
          {isDaire ? `Daire ${item.daire_type || ""}` : landLabel}
          {" · "}{item.city} / {item.district}{item.neighborhood ? ` · ${item.neighborhood}` : ""}
        </div>
        <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-600">
          {item.area_m2 && <span className="bg-gray-100 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5"><Ruler size={9} />{item.area_m2} m²</span>}
          {item.vade_years && <span className="bg-gray-100 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5"><Clock size={9} />{VADE_LABEL(item.vade_years)}</span>}
          {item.ownership && <span className="bg-gray-100 rounded px-1.5 py-0.5">{item.ownership === "hisseli" ? "Hisseli" : "Müstakil"}</span>}
        </div>
        {item.description && <div className="text-xs text-gray-600 mt-1">{item.description}</div>}
      </div>
      <div className="text-summit-navy font-bold tabular-nums text-sm shrink-0">{fmtTL(item.budget)}</div>
    </div>
  );
}

// ===================== REPLY MODAL =====================
function ReplyModal({ entry, onClose, onSent }) {
  const [subject, setSubject] = useState(`Yatırım Simülatörü Değerlendirmesi · ${entry.name}`);
  const [message, setMessage] = useState(
    `Merhaba ${entry.name},\n\nArsa Yatırım Zirvesi 2026 Yatırım Simülatörü'nde oluşturduğunuz portföyü inceledik.\n\n[Buraya kişiselleştirilmiş yorumunuzu yazın]\n\nSize özel detaylı analiz için 21 Mayıs'taki etkinliğimizde uzmanlarımızla birebir görüşebilirsiniz.\n\nSaygılarımızla,\nArsa Yatırım Zirvesi Ekibi`
  );
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!subject.trim() || !message.trim()) { setErr("Konu ve mesaj boş olamaz"); return; }
    setSending(true); setErr("");
    try {
      await axios.post(`${API}/admin/investment-game/${entry.id}/reply`,
        { subject: subject.trim(), message: message.trim() },
        { withCredentials: true });
      onSent?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="reply-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-summit-navy text-lg font-bold flex items-center gap-2">
              <Mail size={18} /> E-posta Cevabı Gönder
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Alıcı: <strong className="text-summit-navy">{entry.email}</strong> ({entry.name})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-summit-navy text-2xl leading-none" data-testid="reply-close">×</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Portfolio summary */}
          <div className="bg-summit-paper rounded-lg p-3 mb-4 text-xs">
            <div className="font-semibold text-summit-navy mb-1">Portföy Özeti</div>
            <div className="text-gray-600">
              Bütçe: <strong>{fmtTL(entry.starting_budget)}</strong> · Yatırım: <strong>{fmtTL(entry.total_spent)}</strong> · Öğe sayısı: <strong>{(entry.items || []).length}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block font-bold text-gray-600">Konu *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="reply-subject"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block font-bold text-gray-600">Mesaj *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={12}
                className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy resize-y font-sans"
                data-testid="reply-message"
              />
              <p className="text-[10px] text-gray-500 mt-1">Satır sonları korunur. HTML mailde butonlu şablon olarak gönderilir.</p>
            </div>
            {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5 text-xs flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" />{err}</div>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-md" data-testid="reply-cancel">İptal</button>
          <button onClick={send} disabled={sending} className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60" data-testid="reply-send">
            <Send size={14} /> {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, tone = "default", small = false }) {
  const toneClass = {
    default: "border-gray-200",
    navy: "border-summit-navy/30 bg-summit-navy/5",
    gold: "border-summit-gold/40 bg-summit-gold/5",
  }[tone];
  return (
    <div className={`bg-white border ${toneClass} rounded-xl p-4`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
        <Icon size={12} /> {label}
      </div>
      <div className={`font-bold text-summit-navy tabular-nums ${small ? "text-base" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
