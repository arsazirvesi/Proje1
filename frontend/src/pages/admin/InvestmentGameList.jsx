import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Gamepad2, Users, TrendingUp, Building, Trees, Download, Trash2,
  ChevronDown, ChevronUp, MapPin, RefreshCw, Link as LinkIcon, Copy, Check
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const fmtTL = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;

export default function InvestmentGameList() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

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
      || (e.profession || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5" data-testid="admin-game-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Gamepad2 size={26} /> Yatırım Dene — Oyun Kayıtları
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ziyaretçilerin 10.000.000 TL sanal bütçeyle yaptığı yatırım seçimleri.
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
          <StatTile icon={Trees} label="Arsa Seçimi" value={stats.arsa_count} tone="gold" />
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
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Arsa Cinsi</div>
            <div className="space-y-1">
              {stats.top_arsa_types.map(t => (
                <div key={t.type} className="flex justify-between text-summit-navy capitalize"><span>{t.type}</span><strong>{t.count}</strong></div>
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
        placeholder="İsim, telefon veya meslek ara…"
        className="w-full sm:w-80 bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
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
            <p className="text-gray-400 text-xs mt-1">Üstteki "Oyun Linkini Kopyala" ile linki ziyaretçilere paylaşın.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-summit-paper border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold"></th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Tarih</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Ad Soyad</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Telefon</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Yaş</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Meslek</th>
                  <th className="text-right px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Yatırım</th>
                  <th className="text-right px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Kalan</th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">#</th>
                  <th className="text-right px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const open = expanded === e.id;
                  return (
                    <React.Fragment key={e.id}>
                      <tr className="border-b border-gray-100 hover:bg-summit-paper/60 cursor-pointer" onClick={() => setExpanded(open ? null : e.id)} data-testid={`row-${e.id}`}>
                        <td className="px-3 py-2.5 text-gray-400">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(e.created_at).toLocaleString("tr-TR")}</td>
                        <td className="px-3 py-2.5 font-semibold text-summit-navy">{e.name}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{e.phone}</td>
                        <td className="px-3 py-2.5 text-gray-700">{e.age}</td>
                        <td className="px-3 py-2.5 text-gray-700 max-w-[160px] truncate">{e.profession}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-summit-navy tabular-nums whitespace-nowrap">{fmtTL(e.total_spent)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap">{fmtTL(e.remaining)}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">
                          {(e.items || []).length} öğe
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id, e.name); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                            data-testid={`delete-${e.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-summit-paper/40">
                          <td colSpan={10} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(e.items || []).map((it, i) => {
                                const Icon = it.kind === "daire" ? Building : Trees;
                                return (
                                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2 text-sm">
                                    <Icon size={18} className="text-summit-gold shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-summit-navy">
                                        {it.kind === "daire" ? `Daire ${it.daire_type || ""}` : ((it.arsa_type === "tarla") ? "Tarla" : "Arsa")}
                                        {" · "}{it.city} / {it.district}
                                      </div>
                                      {it.description && <div className="text-xs text-gray-600 mt-0.5">{it.description}</div>}
                                    </div>
                                    <div className="text-summit-navy font-bold tabular-nums text-sm shrink-0">{fmtTL(it.budget)}</div>
                                  </div>
                                );
                              })}
                            </div>
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
