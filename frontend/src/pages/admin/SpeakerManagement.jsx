import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Star } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const empty = { name: "", title: "", bio: "", image_url: "", order: 0, is_featured: false, social_linkedin: "" };

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
    setForm({ name: s.name, title: s.title, bio: s.bio, image_url: s.image_url || "", order: s.order, is_featured: s.is_featured, social_linkedin: s.social_linkedin || "" });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) return;
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/speakers/${editing.id}`, form, { withCredentials: true });
        setMsg("Konuşmacı güncellendi.");
      } else {
        await axios.post(`${API}/admin/speakers`, form, { withCredentials: true });
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
          <h1 className="font-heading text-white text-2xl sm:text-3xl">Konuşmacı Yönetimi</h1>
          <p className="text-summit-text-muted text-sm mt-1">{speakers.length} konuşmacı</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-speaker-btn">
          <Plus size={15} /> Yeni Konuşmacı
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {speakers.map(s => (
          <div key={s.id} className="bg-summit-paper border border-white/8 rounded-xl overflow-hidden card-hover" data-testid={`speaker-card-admin-${s.id}`}>
            {s.image_url && (
              <div className="h-40 bg-cover bg-top" style={{ backgroundImage: `url(${s.image_url})` }} />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-heading text-base">{s.name}</h4>
                    {s.is_featured && <Star size={13} className="text-summit-gold fill-summit-gold" />}
                  </div>
                  <p className="text-summit-gold text-xs mt-0.5">{s.title}</p>
                </div>
              </div>
              <p className="text-summit-text-muted text-xs mt-3 line-clamp-2 leading-relaxed">{s.bio}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-summit-paper border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-white text-lg">{editing ? "Konuşmacı Düzenle" : "Yeni Konuşmacı"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-summit-text-muted hover:text-white" /></button>
            </div>
            <div className="space-y-4">
              {[["name","Ad Soyad *","text"], ["title","Unvan *","text"], ["image_url","Fotoğraf URL","url"], ["social_linkedin","LinkedIn URL","url"]].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">{label}</label>
                  <input type={type} placeholder={label} value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              ))}
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Biyografi</label>
                <textarea placeholder="Konuşmacı hakkında..." rows={4} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)||0})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} className="w-4 h-4 accent-summit-gold" />
                <span className="text-summit-text-secondary text-sm">Öne Çıkan Konuşmacı (Zirve Sahibi)</span>
              </label>
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
