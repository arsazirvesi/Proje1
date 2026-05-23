import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const EMPTY = {
  title: "", year: new Date().getFullYear(), venue: "", description: "",
  image_url: "", attendee_count: "", speakers_count: "",
  type: "zirve", date_label: "", topics: [], video_url: "", highlight_text: ""
};

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const imgRef = useRef();
  const auth = () => ({ withCredentials: true });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const { data } = await axios.get(`${API}/admin/events`, auth());
    setEvents(data);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setTopicInput(""); setModal(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      title: e.title || "", year: e.year, venue: e.venue || "", description: e.description || "",
      image_url: e.image_url || "", attendee_count: e.attendee_count || "", speakers_count: e.speakers_count || "",
      type: e.type || "zirve", date_label: e.date_label || "", topics: e.topics || [],
      video_url: e.video_url || "", highlight_text: e.highlight_text || ""
    });
    setTopicInput("");
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.year) return;
    const payload = {
      ...form,
      year: parseInt(form.year),
      attendee_count: form.attendee_count ? parseInt(form.attendee_count) : null,
      speakers_count: form.speakers_count ? parseInt(form.speakers_count) : null
    };
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/events/${editing.id}`, payload, auth());
        setMsg("Etkinlik güncellendi.");
      } else {
        await axios.post(`${API}/admin/events`, payload, auth());
        setMsg("Etkinlik eklendi.");
      }
      setModal(false);
      fetchEvents();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/events/${id}`, auth());
    fetchEvents();
    setMsg("Etkinlik silindi.");
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await axios.post(`${API}/admin/uploads/image`, fd, {
        withCredentials: true, headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(f => ({ ...f, image_url: r.data.url }));
    } catch (ex) {
      setMsg("Görsel yüklenemedi.");
    } finally { setUploading(false); }
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !form.topics.includes(t)) {
      setForm(f => ({ ...f, topics: [...f.topics, t] }));
    }
    setTopicInput("");
  };

  return (
    <div data-testid="event-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Arşiv Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Geçmiş zirveler ve seminerler — {events.length} etkinlik</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-event-btn">
          <Plus size={15} /> Yeni Etkinlik
        </button>
      </div>

      {msg && (
        <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">
          {msg}<button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map(ev => (
          <div key={ev.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden card-hover" data-testid={`event-admin-${ev.id}`}>
            {ev.image_url && <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${ev.image_url})` }} />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-summit-gold font-heading font-bold text-xl">{ev.year}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={ev.type === "seminer"
                      ? { background: "#1A264F", color: "#C9A961" }
                      : { background: "#C9A961", color: "#1A264F" }}>
                    {ev.type === "seminer" ? "Seminer" : "Zirve"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(ev)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={12} /></button>
                  <button onClick={() => handleDelete(ev.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={12} /></button>
                </div>
              </div>
              <h4 className="text-summit-navy text-sm font-medium">{ev.title}</h4>
              <p className="text-gray-500 text-xs mt-1">{ev.venue}</p>
              {ev.attendee_count && <p className="text-gray-500 text-xs mt-0.5">{ev.attendee_count}+ Katılımcı</p>}
              {(ev.topics || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {ev.topics.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(201,169,97,0.15)", color: "#8A6A20" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="col-span-3 text-center text-gray-500 py-10 text-sm">Etkinlik bulunamadı</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Etkinlik Düzenle" : "Yeni Etkinlik"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="label-xs">Etkinlik Tipi *</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {[["zirve","Zirve"],["seminer","Seminer"]].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v }))}
                      className="py-2.5 rounded-lg border-2 text-sm font-bold transition-all"
                      style={form.type===v
                        ? { borderColor:"#C9A961", background:"rgba(201,169,97,0.1)", color:"#1A264F" }
                        : { borderColor:"#e5e7eb", background:"#fff", color:"#6b7280" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Year */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label-xs">Etkinlik Adı *</label>
                  <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))}
                    placeholder="1. Arsa Yatırım Zirvesi" className="form-input w-full mt-1.5" />
                </div>
                <div>
                  <label className="label-xs">Yıl *</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({...f,year:e.target.value}))}
                    className="form-input w-full mt-1.5" />
                </div>
              </div>

              {/* Date label & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">Tarih Etiketi</label>
                  <input value={form.date_label} onChange={e => setForm(f => ({...f,date_label:e.target.value}))}
                    placeholder="21 Mayıs 2026" className="form-input w-full mt-1.5" />
                </div>
                <div>
                  <label className="label-xs">Mekan *</label>
                  <input value={form.venue} onChange={e => setForm(f => ({...f,venue:e.target.value}))}
                    placeholder="Hilton İstanbul Bosphorus" className="form-input w-full mt-1.5" />
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">Katılımcı Sayısı</label>
                  <input type="number" value={form.attendee_count} onChange={e => setForm(f => ({...f,attendee_count:e.target.value}))}
                    placeholder="500" className="form-input w-full mt-1.5" />
                </div>
                <div>
                  <label className="label-xs">Konuşmacı Sayısı</label>
                  <input type="number" value={form.speakers_count} onChange={e => setForm(f => ({...f,speakers_count:e.target.value}))}
                    placeholder="8" className="form-input w-full mt-1.5" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label-xs">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f,description:e.target.value}))}
                  rows={3} placeholder="Etkinlik hakkında..." className="form-input w-full mt-1.5 resize-none" />
              </div>

              {/* Highlight */}
              <div>
                <label className="label-xs">Öne Çıkan Alıntı / Vurgu</label>
                <textarea value={form.highlight_text} onChange={e => setForm(f => ({...f,highlight_text:e.target.value}))}
                  rows={2} placeholder="Dikkat çekici bir söz veya önemli bir an..." className="form-input w-full mt-1.5 resize-none" />
              </div>

              {/* Cover image */}
              <div>
                <label className="label-xs">Kapak Görseli</label>
                <div className="flex gap-2 mt-1.5">
                  <input value={form.image_url} onChange={e => setForm(f => ({...f,image_url:e.target.value}))}
                    placeholder="URL veya yükle" className="form-input flex-1" />
                  <button type="button" onClick={() => imgRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold text-white"
                    style={{ background: "#1A264F" }} disabled={uploading}>
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Yükle
                  </button>
                </div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e.target.files[0])} />
                {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover w-full" />}
              </div>

              {/* YouTube video */}
              <div>
                <label className="label-xs">Etkinlik Videosu (YouTube URL)</label>
                <input value={form.video_url} onChange={e => setForm(f => ({...f,video_url:e.target.value}))}
                  placeholder="https://www.youtube.com/watch?v=..." className="form-input w-full mt-1.5" />
              </div>

              {/* Topics */}
              <div>
                <label className="label-xs">Konu Başlıkları</label>
                <div className="flex gap-2 mt-1.5">
                  <input value={topicInput} onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTopic())}
                    placeholder="Konu ekle (Enter)" className="form-input flex-1" />
                  <button type="button" onClick={addTopic} className="px-3 py-2 rounded-md text-xs font-bold text-white" style={{ background: "#1A264F" }}>
                    Ekle
                  </button>
                </div>
                {form.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.topics.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "rgba(201,169,97,0.15)", color: "#8A6A20" }}>
                        {t}
                        <button onClick={() => setForm(f => ({ ...f, topics: f.topics.filter(x => x !== t) }))} className="ml-0.5 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
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
