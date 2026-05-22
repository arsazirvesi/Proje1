import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Layers, Clock, Smartphone } from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import ImageUrlInput from "../../components/ImageUrlInput";

const empty = {
  title: "",
  subtitle: "",
  image_url: "",
  image_url_mobile: "",
  cta_text: "",
  cta_url: "",
  is_active: true,
  order: 0,
  display_mode: "slider",
  start_at: "",
  end_at: "",
  delay_seconds: 2,
  pages: [],
};

const PAGE_OPTIONS = [
  { v: "home", l: "Ana Sayfa" },
  { v: "program", l: "Program" },
  { v: "speakers", l: "Konuşmacılar" },
  { v: "fair", l: "Fuar" },
  { v: "blog", l: "Blog" },
  { v: "game", l: "Yatırım Simülatörü" },
];

const DISPLAY_OPTIONS = [
  { v: "slider", l: "Slider (Sayfa içi)" },
  { v: "modal", l: "Modal Popup (Üste açılır)" },
];

// Convert datetime-local input value <-> ISO UTC string
const localToIso = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
};
const isoToLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // YYYY-MM-DDTHH:MM (local)
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    const { data } = await axios.get(`${API}/admin/banners`, { withCredentials: true });
    setBanners(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url || "",
      image_url_mobile: b.image_url_mobile || "",
      cta_text: b.cta_text || "",
      cta_url: b.cta_url || "",
      is_active: b.is_active ?? true,
      order: b.order ?? 0,
      display_mode: b.display_mode || "slider",
      start_at: isoToLocal(b.start_at),
      end_at: isoToLocal(b.end_at),
      delay_seconds: b.delay_seconds ?? 2,
      pages: Array.isArray(b.pages) ? b.pages : [],
    });
    setModal(true);
  };

  const togglePage = (v) => {
    setForm((f) => ({
      ...f,
      pages: f.pages.includes(v) ? f.pages.filter((p) => p !== v) : [...f.pages, v],
    }));
  };

  const handleSave = async () => {
    if (!form.title && !form.image_url) {
      setMsg("Hata: Başlık veya görsel zorunlu.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      start_at: form.start_at ? localToIso(form.start_at) : null,
      end_at: form.end_at ? localToIso(form.end_at) : null,
    };
    try {
      if (editing) {
        await axios.put(`${API}/admin/banners/${editing.id}`, payload, { withCredentials: true });
        setMsg("Banner güncellendi.");
      } else {
        await axios.post(`${API}/admin/banners`, payload, { withCredentials: true });
        setMsg("Banner eklendi.");
      }
      setModal(false);
      fetchBanners();
    } catch (e) {
      setMsg(`Hata: ${e?.response?.data?.detail || e?.message || "Kaydedilemedi"}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/banners/${id}`, { withCredentials: true });
    fetchBanners();
    setMsg("Banner silindi.");
  };

  const isLive = (b) => {
    if (!b.is_active) return false;
    const now = new Date();
    if (b.start_at && new Date(b.start_at) > now) return false;
    if (b.end_at && new Date(b.end_at) < now) return false;
    return true;
  };

  return (
    <div data-testid="banner-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Manşet / Banner Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{banners.length} manşet · slider veya popup modal olarak çalışır</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-banner-btn">
          <Plus size={15} /> Yeni Manşet
        </button>
      </div>

      {msg && (
        <div className={`${msg.startsWith("Hata") ? "bg-red-50 border-red-300 text-red-700" : "bg-summit-gold/10 border-summit-gold/30 text-summit-gold"} border rounded-lg p-3 text-sm mb-5 flex items-center justify-between`}>
          <span>{msg}</span>
          <button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {banners.map((b) => {
          const live = isLive(b);
          return (
            <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 card-hover" data-testid={`banner-row-${b.id}`}>
              {b.image_url ? (
                <div className="w-24 h-16 rounded-lg bg-cover bg-center shrink-0 border border-gray-200" style={{ backgroundImage: `url(${b.image_url})` }} />
              ) : (
                <div className="w-24 h-16 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
                  <ImageIcon size={20} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-summit-navy font-semibold text-sm">{b.title || "(başlıksız)"}</h4>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${b.display_mode === "modal" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {b.display_mode === "modal" ? "🎯 Popup" : "Slider"}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${live ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {live ? "● Yayında" : (b.is_active ? "Zaman dışı" : "Pasif")}
                  </span>
                </div>
                {b.subtitle && <p className="text-gray-500 text-xs mt-1">{b.subtitle}</p>}
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1.5 flex-wrap">
                  {b.start_at && <span>📅 Başla: {new Date(b.start_at).toLocaleString("tr-TR")}</span>}
                  {b.end_at && <span>⏳ Bitir: {new Date(b.end_at).toLocaleString("tr-TR")}</span>}
                  {b.pages?.length > 0 && <span>📄 {b.pages.join(", ")}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(b)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
        {banners.length === 0 && <p className="text-center text-gray-500 py-10 text-sm">Henüz manşet eklenmemiş.</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Manşet Düzenle" : "Yeni Manşet"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Başlık</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="md:col-span-2">
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Alt Başlık / Açıklama</label>
                <input type="text" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>

              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <ImageIcon size={12} /> Web Görsel URL
                </label>
                <ImageUrlInput
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  testIdPrefix="banner-web"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Smartphone size={12} /> Mobil Görsel URL (opsiyonel)
                </label>
                <ImageUrlInput
                  value={form.image_url_mobile}
                  onChange={(url) => setForm({ ...form, image_url_mobile: url })}
                  testIdPrefix="banner-mobile"
                />
              </div>

              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Buton Metni</label>
                <input type="text" placeholder="ör. Hemen Dene" value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Buton Hedef URL</label>
                <input type="text" placeholder="/yatirim-oyunu" value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>

              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Layers size={12} /> Görünüm Modu
                </label>
                <select value={form.display_mode} onChange={e => setForm({ ...form, display_mode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50">
                  {DISPLAY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>

              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Clock size={12} /> Başlangıç Zamanı (opsiyonel)
                </label>
                <input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Clock size={12} /> Bitiş Zamanı (opsiyonel)
                </label>
                <input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>

              {form.display_mode === "modal" && (
                <div className="md:col-span-2">
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                    Popup Gecikme (sn) — Sayfa açıldıktan kaç saniye sonra çıksın?
                  </label>
                  <input type="number" min="0" max="60" value={form.delay_seconds}
                    onChange={e => setForm({ ...form, delay_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                  Hangi Sayfalarda Görünsün? <span className="text-gray-400 normal-case">(hiçbiri seçilmezse: tüm sayfalar)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS.map(o => {
                    const active = form.pages.includes(o.v);
                    return (
                      <button key={o.v} type="button" onClick={() => togglePage(o.v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${active ? "bg-summit-navy text-white border-summit-navy" : "bg-white text-gray-600 border-gray-200 hover:border-summit-navy/40"}`}>
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-summit-gold" />
                  <span className="text-gray-700 text-sm font-medium">Aktif (manşet yayında olsun)</span>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-banner-btn">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
