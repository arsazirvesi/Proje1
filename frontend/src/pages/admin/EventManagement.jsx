import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const empty = { title: "", year: new Date().getFullYear(), venue: "", description: "", image_url: "", attendee_count: "", speakers_count: "" };

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const { data } = await axios.get(`${API}/admin/events`, { withCredentials: true });
    setEvents(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({ title: e.title, year: e.year, venue: e.venue, description: e.description || "", image_url: e.image_url || "", attendee_count: e.attendee_count || "", speakers_count: e.speakers_count || "" });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.year) return;
    const payload = { ...form, year: parseInt(form.year), attendee_count: form.attendee_count ? parseInt(form.attendee_count) : null, speakers_count: form.speakers_count ? parseInt(form.speakers_count) : null };
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/events/${editing.id}`, payload, { withCredentials: true });
        setMsg("Etkinlik güncellendi.");
      } else {
        await axios.post(`${API}/admin/events`, payload, { withCredentials: true });
        setMsg("Etkinlik eklendi.");
      }
      setModal(false);
      fetchEvents();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/events/${id}`, { withCredentials: true });
    fetchEvents();
    setMsg("Etkinlik silindi.");
  };

  return (
    <div data-testid="event-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-white text-2xl sm:text-3xl">Geçmiş Etkinlikler</h1>
          <p className="text-summit-text-muted text-sm mt-1">{events.length} etkinlik</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-event-btn">
          <Plus size={15} /> Yeni Etkinlik
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map(ev => (
          <div key={ev.id} className="bg-summit-paper border border-white/8 rounded-xl overflow-hidden card-hover" data-testid={`event-admin-${ev.id}`}>
            {ev.image_url && <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${ev.image_url})` }} />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-summit-gold font-heading font-bold text-xl">{ev.year}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(ev)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={12} /></button>
                  <button onClick={() => handleDelete(ev.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={12} /></button>
                </div>
              </div>
              <h4 className="text-white text-sm font-medium">{ev.title}</h4>
              <p className="text-summit-text-muted text-xs mt-1">{ev.venue}</p>
              {ev.attendee_count && <p className="text-summit-text-muted text-xs mt-0.5">{ev.attendee_count}+ Katılımcı</p>}
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="col-span-3 text-center text-summit-text-muted py-10 text-sm">Etkinlik bulunamadı</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-summit-paper border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-white text-lg">{editing ? "Etkinlik Düzenle" : "Yeni Etkinlik"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-summit-text-muted hover:text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Etkinlik Adı *</label>
                <input type="text" placeholder="1. Arsa Yatırım Zirvesi" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Yıl *</label>
                  <input type="number" placeholder="2024" value={form.year} onChange={e => setForm({...form, year: e.target.value})}
                    className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
                <div>
                  <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Katılımcı Sayısı</label>
                  <input type="number" placeholder="500" value={form.attendee_count} onChange={e => setForm({...form, attendee_count: e.target.value})}
                    className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Mekan *</label>
                <input type="text" placeholder="Hilton İstanbul Bosphorus" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Açıklama</label>
                <textarea placeholder="Etkinlik hakkında..." rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Görsel URL</label>
                <input type="url" placeholder="https://..." value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-event-btn">
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
