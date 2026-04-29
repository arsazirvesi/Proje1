import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Image } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const empty = { title: "", subtitle: "", image_url: "", cta_text: "", cta_url: "", is_active: true, order: 0 };

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
  const openEdit = (b) => { setEditing(b); setForm({ title: b.title, subtitle: b.subtitle || "", image_url: b.image_url || "", cta_text: b.cta_text || "", cta_url: b.cta_url || "", is_active: b.is_active, order: b.order }); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/banners/${editing.id}`, form, { withCredentials: true });
        setMsg("Banner güncellendi.");
      } else {
        await axios.post(`${API}/admin/banners`, form, { withCredentials: true });
        setMsg("Banner eklendi.");
      }
      setModal(false);
      fetchBanners();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/banners/${id}`, { withCredentials: true });
    fetchBanners();
    setMsg("Banner silindi.");
  };

  return (
    <div data-testid="banner-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Banner Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{banners.length} banner</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-banner-btn">
          <Plus size={15} /> Yeni Banner
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 gap-4">
        {banners.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 card-hover" data-testid={`banner-row-${b.id}`}>
            {b.image_url ? (
              <div className="w-20 h-14 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${b.image_url})` }} />
            ) : (
              <div className="w-20 h-14 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <Image size={20} className="text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-summit-navy font-medium text-sm">{b.title}</h4>
              {b.subtitle && <p className="text-gray-500 text-xs mt-0.5">{b.subtitle}</p>}
              <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${b.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                {b.is_active ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(b)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={13} /></button>
              <button onClick={() => handleDelete(b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="text-center text-gray-500 py-10 text-sm">Henüz banner eklenmemiş.</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Banner Düzenle" : "Yeni Banner"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>
            <div className="space-y-4">
              {[["title","Başlık *","text"], ["subtitle","Alt Başlık","text"], ["image_url","Görsel URL","url"], ["cta_text","Buton Metni","text"], ["cta_url","Buton URL","url"]].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">{label}</label>
                  <input type={type} placeholder={label} value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)||0})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 accent-summit-gold" />
                <span className="text-gray-600 text-sm">Aktif</span>
              </label>
              <div className="flex gap-3 justify-end mt-2">
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
