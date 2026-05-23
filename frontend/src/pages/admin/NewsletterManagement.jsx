import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Mail, Trash2, Search, Download, RefreshCw, Phone, Calendar } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const INTEREST_LABEL = { zirve: "Zirve", seminer: "Seminer", egitim: "Eğitim" };

export default function NewsletterManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/newsletter`, { withCredentials: true });
      setItems(data.items || []);
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(it =>
      (it.email || "").toLowerCase().includes(q) ||
      (it.name || "").toLowerCase().includes(q) ||
      (it.phone || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };
  const removeOne = async (id) => {
    if (!window.confirm("Bu aboneyi silmek istediğinize emin misiniz?")) return;
    await axios.delete(`${API}/admin/newsletter/${id}`, { withCredentials: true });
    await load();
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size} aboneyi silmek istediğinize emin misiniz?`)) return;
    await axios.post(`${API}/admin/newsletter/bulk-delete`, { ids: Array.from(selected) }, { withCredentials: true });
    setSelected(new Set());
    await load();
  };
  const exportCsv = () => {
    const rows = [["E-posta", "Ad", "Telefon", "İlgi Alanları", "Kaynak", "Tarih"]];
    filtered.forEach(it => {
      rows.push([it.email, it.name || "", it.phone || "", (it.interests || []).join("; "), it.source || "", it.created_at?.slice(0, 10) || ""]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bulten-aboneleri-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="admin-newsletter">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-summit-navy font-bold flex items-center gap-2">
            <Mail size={22} className="text-amber-500" />
            Bülten Aboneleri
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} kişi · /bulten formundan toplananlar</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="w-9 h-9 rounded-lg border border-gray-200 hover:border-summit-navy/40 flex items-center justify-center text-summit-navy">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={exportCsv} className="bg-white border border-gray-200 hover:border-summit-navy/40 text-summit-navy text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
            <Download size={12} /> CSV İndir
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="E-posta, ad veya telefon ara..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-summit-navy placeholder-gray-400 focus:outline-none focus:border-summit-navy"
            data-testid="newsletter-search" />
        </div>
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2.5 rounded-lg inline-flex items-center gap-1.5">
            <Trash2 size={12} /> Sil ({selected.size})
          </button>
        )}
      </div>

      {msg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{msg}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="accent-amber-500" data-testid="newsletter-select-all" />
              </th>
              <th className="text-left px-3 py-2.5 font-bold">E-posta</th>
              <th className="text-left px-3 py-2.5 font-bold">İletişim</th>
              <th className="text-left px-3 py-2.5 font-bold">İlgi Alanları</th>
              <th className="text-left px-3 py-2.5 font-bold">Kayıt</th>
              <th className="text-right px-3 py-2.5 font-bold">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-12 text-center text-gray-400 text-sm">Yükleniyor...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-gray-400 text-sm">Henüz abone yok</td></tr>
            )}
            {filtered.map(it => (
              <tr key={it.id} className="border-t border-gray-100 hover:bg-gray-50" data-testid={`newsletter-row-${it.id}`}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} className="accent-amber-500" />
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-summit-navy text-sm">{it.email}</div>
                  <div className="text-[10px] text-gray-400">{it.source || "site"}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-700">
                  {it.name && <div>{it.name}</div>}
                  {it.phone && <div className="text-gray-500 inline-flex items-center gap-1 mt-0.5"><Phone size={9} /> {it.phone}</div>}
                  {!it.name && !it.phone && <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(it.interests || []).map(i => (
                      <span key={i} className="bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 text-[10px] font-bold">{INTEREST_LABEL[i] || i}</span>
                    ))}
                    {(it.interests || []).length === 0 && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500 inline-flex items-center gap-1">
                  <Calendar size={10} /> {it.created_at?.slice(0, 10) || "—"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <a href={`mailto:${it.email}`} className="inline-flex items-center px-2 py-1 text-xs font-bold text-summit-navy hover:bg-gray-100 rounded">
                    <Mail size={11} className="mr-1" /> E-posta
                  </a>
                  <button onClick={() => removeOne(it.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
