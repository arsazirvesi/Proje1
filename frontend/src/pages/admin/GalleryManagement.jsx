import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Film, Youtube, Eye, EyeOff, Upload, Loader2 } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const EMPTY = { title: "", description: "", type: "image", media_url: "", youtube_url: "", thumbnail_url: "", year: new Date().getFullYear(), tags: [], order: 0, is_active: true };

function extractYtId(url) {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function GalleryManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef();
  const vidRef = useRef();
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/gallery`, authHeader());
      setItems(r.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm({ ...EMPTY }); setEditId(null); setErr(""); };

  const startEdit = (item) => {
    setForm({ ...EMPTY, ...item });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.type) return setErr("Tip seçiniz.");
    if (form.type !== "youtube" && !form.media_url) return setErr("Medya URL gerekli.");
    if (form.type === "youtube" && !form.youtube_url) return setErr("YouTube URL gerekli.");
    setSaving(true); setErr("");
    try {
      if (editId) {
        await axios.put(`${API}/admin/gallery/${editId}`, form, authHeader());
      } else {
        await axios.post(`${API}/admin/gallery`, form, authHeader());
      }
      await load();
      reset();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Kayıt hatası");
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Bu öğeyi silmek istiyor musunuz?")) return;
    await axios.delete(`${API}/admin/gallery/${id}`, authHeader());
    await load();
  };

  const toggleActive = async (item) => {
    await axios.put(`${API}/admin/gallery/${item.id}`, { ...item, is_active: !item.is_active }, authHeader());
    await load();
  };

  const uploadFile = async (file, type) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const endpoint = type === "video" ? "/admin/uploads/video" : "/admin/uploads/image";
      const r = await axios.post(`${API}${endpoint}`, fd, { ...authHeader(), headers: { ...authHeader().headers, "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, media_url: r.data.url }));
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Yükleme hatası");
    } finally { setUploading(false); }
  };

  const ytThumb = form.type === "youtube" && form.youtube_url
    ? (() => { const id = extractYtId(form.youtube_url); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null; })()
    : null;

  const previewSrc = form.thumbnail_url || (form.type === "image" ? form.media_url : null) || ytThumb;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-summit-navy">Galeri Yönetimi</h2>
          <p className="text-xs text-gray-500 mt-0.5">Fotoğraf, video ve YouTube içerikleri yönetin.</p>
        </div>
        {editId && <button onClick={reset} className="text-xs text-gray-500 flex items-center gap-1 hover:text-summit-navy"><X size={14}/> İptal</button>}
      </div>

      {/* Form */}
      <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4" data-testid="gallery-form">
        <h3 className="font-bold text-summit-navy text-sm">{editId ? "Düzenle" : "Yeni Ekle"}</h3>

        {/* Type Selector */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">İçerik Tipi *</label>
          <div className="grid grid-cols-3 gap-2">
            {[["image", ImageIcon, "Fotoğraf"], ["video", Film, "Video"], ["youtube", Youtube, "YouTube"]].map(([v, Icon, l]) => (
              <button key={v} type="button"
                onClick={() => setForm(f => ({ ...f, type: v, media_url: "", youtube_url: "" }))}
                className="flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-xs font-bold transition-all"
                style={form.type === v
                  ? { borderColor: "#C9A961", background: "rgba(201,169,97,0.1)", color: "#1A264F" }
                  : { borderColor: "#e5e7eb", background: "#fff", color: "#6b7280" }}
                data-testid={`gallery-type-${v}`}>
                <Icon size={20} />
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Başlık</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="form-input w-full" placeholder="Başlık (opsiyonel)" data-testid="gallery-title" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Yıl</label>
            <input type="number" value={form.year || ""} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) || null }))}
              className="form-input w-full" placeholder="2026" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Açıklama</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} className="form-input w-full resize-none" placeholder="Kısa açıklama (opsiyonel)" />
        </div>

        {/* Media input based on type */}
        {form.type === "image" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fotoğraf</label>
            <div className="flex gap-2">
              <input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                className="form-input flex-1" placeholder="URL yapıştır veya yükle" data-testid="gallery-media-url" />
              <button type="button" onClick={() => imgRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold text-white transition-colors"
                style={{ background: "#1A264F" }} disabled={uploading} data-testid="gallery-upload-img">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Yükle
              </button>
            </div>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => uploadFile(e.target.files[0], "image")} />
          </div>
        )}

        {form.type === "video" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Video</label>
            <div className="flex gap-2">
              <input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                className="form-input flex-1" placeholder="URL yapıştır veya yükle" data-testid="gallery-media-url" />
              <button type="button" onClick={() => vidRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold text-white transition-colors"
                style={{ background: "#1A264F" }} disabled={uploading} data-testid="gallery-upload-vid">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Yükle
              </button>
            </div>
            <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={e => uploadFile(e.target.files[0], "video")} />
            <p className="text-[10px] text-gray-400 mt-1">MP4, WEBM, MOV destekleniyor. Maks 300 MB.</p>
          </div>
        )}

        {form.type === "youtube" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">YouTube URL *</label>
            <input value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              className="form-input w-full" placeholder="https://www.youtube.com/watch?v=..." data-testid="gallery-youtube-url" />
            {ytThumb && (
              <div className="mt-2 rounded-md overflow-hidden w-40">
                <img src={ytThumb} alt="YouTube önizleme" className="w-full h-auto" />
              </div>
            )}
          </div>
        )}

        {/* Thumbnail override */}
        {form.type !== "youtube" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Küçük Resim (opsiyonel)</label>
            <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
              className="form-input w-full" placeholder="Thumbnail URL (boş bırakılırsa otomatik)" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sıra</label>
            <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
              className="form-input w-full" />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-summit-navy" />
              <span className="text-sm font-medium text-gray-700">Aktif / Görünür</span>
            </label>
          </div>
        </div>

        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{err}</div>}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold text-white disabled:opacity-60 transition-colors"
            style={{ background: "#1A264F" }} data-testid="gallery-save-btn">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {editId ? "Güncelle" : "Ekle"}
          </button>
          {editId && <button type="button" onClick={reset} className="px-4 py-2.5 rounded-md text-sm font-bold border border-gray-200 text-gray-600">İptal</button>}
        </div>
      </form>

      {/* Items List */}
      <div>
        <h3 className="font-bold text-summit-navy text-sm mb-3">Mevcut Öğeler ({items.length})</h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Henüz galeri öğesi yok.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => {
              const thumb = item.thumbnail_url || (item.type === "image" ? item.media_url : null);
              const Icon = item.type === "video" ? Film : item.type === "youtube" ? Youtube : ImageIcon;
              return (
                <div key={item.id} className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-all ${!item.is_active ? "opacity-50" : ""}`} data-testid={`gallery-item-${item.id}`}>
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-gray-100">
                    {thumb ? (
                      <img src={thumb} alt={item.title || ""} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "#1A264F" }}>
                        <Icon size={28} className="text-white/30" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: item.type === "youtube" ? "#dc2626" : "#1A264F", color: item.type === "youtube" ? "#fff" : "#C9A961" }}>
                      <Icon size={9} /> {item.type}
                    </span>
                    {item.year && (
                      <span className="absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(201,169,97,0.9)", color: "#1A264F" }}>
                        {item.year}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-bold text-summit-navy truncate">{item.title || "(Başlıksız)"}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                    <div className="flex items-center gap-1.5 mt-3">
                      <button onClick={() => startEdit(item)} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold border border-gray-200 text-gray-600 hover:border-summit-navy hover:text-summit-navy transition-colors" data-testid={`gallery-edit-${item.id}`}>
                        <Edit2 size={12} /> Düzenle
                      </button>
                      <button onClick={() => toggleActive(item)} className="w-8 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-summit-navy transition-colors" title={item.is_active ? "Gizle" : "Göster"}>
                        {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button onClick={() => del(item.id)} className="w-8 h-7 flex items-center justify-center rounded border border-red-100 text-red-400 hover:text-red-600 hover:border-red-300 transition-colors" data-testid={`gallery-delete-${item.id}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
