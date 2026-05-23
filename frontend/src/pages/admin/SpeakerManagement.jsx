import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Star } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const empty = { name: "", title: "", bio: "", image_url: "", order: 0, is_featured: false, social_linkedin: "", social_instagram: "", social_twitter: "", is_founder: false, founder_role: "", summit_years: "", extended_bio: "", show_in_family: true };

export default function SpeakerManagement() {
  const [speakers, setSpeakers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchSpeakers(); }, []);

  const fetchSpeakers = async () => {
    const { data } = await axios.get(`${API}/admin/speakers`, { withCredentials: true });
    setSpeakers(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name, title: s.title, bio: s.bio, image_url: s.image_url || "", order: s.order,
      is_featured: s.is_featured,
      social_linkedin: s.social_linkedin || "", social_instagram: s.social_instagram || "", social_twitter: s.social_twitter || "",
      is_founder: !!s.is_founder, founder_role: s.founder_role || "",
      summit_years: Array.isArray(s.summit_years) ? s.summit_years.join(", ") : (s.summit_years || ""),
      extended_bio: s.extended_bio || "",
      show_in_family: s.show_in_family !== false,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        summit_years: String(form.summit_years || "")
          .split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n) && n > 1900),
      };
      if (editing) {
        await axios.put(`${API}/admin/speakers/${editing.id}`, payload, { withCredentials: true });
        setMsg("Konuşmacı güncellendi.");
      } else {
        await axios.post(`${API}/admin/speakers`, payload, { withCredentials: true });
        setMsg("Konuşmacı eklendi.");
      }
      setModal(false);
      fetchSpeakers();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/speakers/${id}`, { withCredentials: true });
    fetchSpeakers();
    setMsg("Konuşmacı silindi.");
  };

  return (
    <div data-testid="speaker-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Konuşmacı Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{speakers.length} konuşmacı</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-speaker-btn">
          <Plus size={15} /> Yeni Konuşmacı
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {speakers.map(s => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden card-hover" data-testid={`speaker-card-admin-${s.id}`}>
            {s.image_url && (
              <div className="h-40 bg-cover bg-top" style={{ backgroundImage: `url(${s.image_url})` }} />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-summit-navy font-heading text-base">{s.name}</h4>
                    {s.is_featured && <Star size={13} className="text-summit-gold fill-summit-gold" />}
                  </div>
                  <p className="text-summit-gold text-xs mt-0.5">{s.title}</p>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-3 line-clamp-2 leading-relaxed">{s.bio}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-summit-gold/10 text-summit-gold rounded-lg text-xs hover:bg-summit-gold/20">
                  <Pencil size={12} /> Düzenle
                </button>
                <button onClick={() => handleDelete(s.id)} className="flex items-center justify-center px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20" data-testid={`delete-speaker-${s.id}`}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Konuşmacı Düzenle" : "Yeni Konuşmacı"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>
            <div className="space-y-4">
              {[["name","Ad Soyad *","text"], ["title","Unvan *","text"], ["image_url","Fotoğraf URL","url"], ["social_linkedin","LinkedIn URL","url"], ["social_instagram","Instagram URL","url"], ["social_twitter","Twitter / X URL","url"]].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">{label}</label>
                  <input type={type} placeholder={label} value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Biyografi</label>
                <textarea placeholder="Konuşmacı hakkında..." rows={4} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)||0})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} className="w-4 h-4 accent-summit-gold" />
                <span className="text-gray-600 text-sm">Öne Çıkan Konuşmacı (Zirve Sahibi)</span>
              </label>

              {/* Zirve Ailesi fields */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">👑 Zirve Ailesi Sayfası</div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_founder} onChange={e => setForm({...form, is_founder: e.target.checked})} className="w-4 h-4 accent-amber-500" data-testid="speaker-is-founder" />
                  <span className="text-gray-700 text-sm">Kurucu — Sayfa başında büyük kart ile gösterilir</span>
                </label>
                {form.is_founder && (
                  <div>
                    <label className="text-gray-500 text-[11px] uppercase tracking-wider mb-1 block">Kurucu Unvanı</label>
                    <input value={form.founder_role} onChange={e => setForm({...form, founder_role: e.target.value})}
                      placeholder="Zirve ve Platform Kurucusu"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-amber-400" data-testid="speaker-founder-role" />
                  </div>
                )}
                <div>
                  <label className="text-gray-500 text-[11px] uppercase tracking-wider mb-1 block">Katıldığı Zirve Yılları (virgülle ayır)</label>
                  <input value={form.summit_years} onChange={e => setForm({...form, summit_years: e.target.value})}
                    placeholder="2024, 2025, 2026"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-amber-400" data-testid="speaker-summit-years" />
                </div>
                <div>
                  <label className="text-gray-500 text-[11px] uppercase tracking-wider mb-1 block">Detaylı Biyografi (modal'da gösterilir)</label>
                  <textarea rows={4} value={form.extended_bio} onChange={e => setForm({...form, extended_bio: e.target.value})}
                    placeholder="Konuşmacının kariyer detayları, başarıları, projeleri..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-amber-400 resize-none" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.show_in_family} onChange={e => setForm({...form, show_in_family: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                  <span className="text-gray-700 text-sm">Zirve Ailesi sayfasında göster</span>
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-speaker-btn">
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
