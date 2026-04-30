import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Save, X, Eye, EyeOff, Upload } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function HeroSlidesManagement() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ image_url: "", title: "", order: 0, is_active: true, opacity: 45 });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Lütfen bir görsel dosyası seçin (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Dosya 10 MB'dan büyük olamaz.");
      return;
    }
    setUploading(true);
    setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/admin/uploads/image`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(p => ({ ...p, image_url: data.url }));
      setMsg("Görsel yüklendi. Şimdi başlık ekleyip Kaydet'e basın.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Yükleme başarısız");
    }
    setUploading(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/hero-slides`, { withCredentials: true });
      setSlides(data);
    } catch {
      setErr("Yüklenemedi");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!form.image_url.trim()) {
      setErr("Görsel URL gerekli");
      return;
    }
    try {
      if (editing) {
        await axios.put(`${API}/admin/hero-slides/${editing.id}`, form, { withCredentials: true });
        setMsg("Slide güncellendi");
      } else {
        await axios.post(`${API}/admin/hero-slides`, form, { withCredentials: true });
        setMsg("Slide eklendi");
      }
      setForm({ image_url: "", title: "", order: 0, is_active: true, opacity: 45 });
      setShowAdd(false);
      setEditing(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Kaydedilemedi");
    }
  };

  const handleDelete = async (slide) => {
    if (!window.confirm(`Bu slide silinsin mi?\n${slide.title || slide.image_url.slice(0, 50)}`)) return;
    try {
      await axios.delete(`${API}/admin/hero-slides/${slide.id}`, { withCredentials: true });
      setMsg("Slide silindi");
      load();
    } catch {
      setErr("Silinemedi");
    }
  };

  const handleEdit = (slide) => {
    setEditing(slide);
    setForm({
      image_url: slide.image_url,
      title: slide.title || "",
      order: slide.order || 0,
      is_active: slide.is_active !== false,
      opacity: typeof slide.opacity === "number" ? slide.opacity : 45,
    });
    setShowAdd(true);
  };

  const handleToggle = async (slide) => {
    try {
      await axios.put(
        `${API}/admin/hero-slides/${slide.id}`,
        { ...slide, is_active: !slide.is_active },
        { withCredentials: true }
      );
      load();
    } catch {
      setErr("Güncellenemedi");
    }
  };

  const moveItem = async (slide, dir) => {
    const sorted = [...slides].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex(s => s.id === slide.id);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[idx], b = sorted[target];
    try {
      await Promise.all([
        axios.put(`${API}/admin/hero-slides/${a.id}`, { ...a, order: b.order || 0 }, { withCredentials: true }),
        axios.put(`${API}/admin/hero-slides/${b.id}`, { ...b, order: a.order || 0 }, { withCredentials: true }),
      ]);
      load();
    } catch {
      setErr("Sıra güncellenemedi");
    }
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditing(null);
    setForm({ image_url: "", title: "", order: 0, is_active: true, opacity: 45 });
  };

  return (
    <div className="max-w-5xl mx-auto" data-testid="admin-hero-slides-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-summit-navy">Ana Sayfa Banner Fotoğrafları</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ana sayfada hero bölümünün arka planında dönüşüm halinde gösterilecek fotoğraflar. Şeffaf olarak görünür.
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-summit-navy text-white text-sm font-medium rounded-lg hover:bg-summit-navy/90 transition-colors"
            data-testid="add-slide-btn"
          >
            <Plus size={15} /> Yeni Slide Ekle
          </button>
        )}
      </div>

      {msg && <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{msg}</div>}
      {err && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6" data-testid="slide-form">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-summit-navy">
              {editing ? "Slide Düzenle" : "Yeni Slide"}
            </h2>
            <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Görsel *</label>

              {form.image_url ? (
                <div className="relative">
                  <div
                    className="w-full h-44 bg-cover bg-center rounded-lg border border-gray-200"
                    style={{ backgroundImage: `url(${form.image_url})` }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="bg-white/95 hover:bg-white text-summit-navy text-xs font-medium px-3 py-1.5 rounded shadow border border-gray-200"
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, image_url: "" }))}
                      className="bg-white/95 hover:bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded shadow border border-gray-200"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  className={`w-full h-44 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    uploading ? "bg-gray-50 opacity-70" : "bg-gray-50 hover:border-summit-navy hover:bg-summit-navy/5"
                  }`}
                  data-testid="slide-upload-zone"
                >
                  {uploading ? (
                    <>
                      <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-summit-navy text-sm font-medium">Yükleniyor...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={28} className="text-gray-400 mb-2" />
                      <p className="text-summit-navy text-sm font-medium">Görsel yüklemek için tıkla</p>
                      <p className="text-gray-400 text-xs mt-1">veya buraya sürükle bırak</p>
                      <p className="text-gray-400 text-[0.65rem] mt-2">JPG / PNG / WEBP — Max 10 MB</p>
                    </>
                  )}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                data-testid="slide-file-input"
              />

              <p className="text-xs text-gray-400 mt-2">
                Önerilen boyut: 1920×1080 px (yatay). Görsel sunucunuza yüklenir, harici bir hizmete gerek yoktur.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Başlık (opsiyonel)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Örn: Zirveden Kareler"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Sıralama</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm(p => ({ ...p, order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Şeffaflık (Opacity): <span className="text-summit-navy font-bold">%{form.opacity}</span>
                <span className="text-gray-400 font-normal ml-2">
                  ({form.opacity < 25 ? "Çok şeffaf" : form.opacity < 50 ? "Şeffaf" : form.opacity < 75 ? "Yarı net" : "Net"})
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.opacity}
                onChange={(e) => setForm(p => ({ ...p, opacity: parseInt(e.target.value, 10) }))}
                className="w-full accent-summit-navy"
                data-testid="slide-opacity-slider"
              />
              <div className="flex justify-between text-[0.65rem] text-gray-400 mt-1">
                <span>0% (görünmez)</span>
                <span>50%</span>
                <span>100% (tam net)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Önerilen: 35-55%. Çok yüksek değerlerde başlık metni okunmayabilir.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-summit-navy"
                />
                Aktif (sitede görünsün)
              </label>
            </div>
          </div>

          {form.image_url && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Önizleme (sitede şu şekilde görünecek):</p>
              <div className="relative w-full h-48 rounded-lg border border-gray-200 overflow-hidden bg-summit-paper">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${form.image_url})`, opacity: (form.opacity || 0) / 100 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/35 to-white/55" />
                <div className="relative z-10 p-5 h-full flex flex-col justify-center">
                  <p className="text-xs uppercase tracking-widest text-summit-navy/70 font-semibold">21 Mayıs 2026</p>
                  <h3 className="font-heading text-summit-navy text-2xl font-bold leading-tight mt-1">
                    Arsa Yatırım <span className="text-summit-gold">Zirvesi</span>
                  </h3>
                  <p className="text-gray-600 text-xs mt-2">Hilton İstanbul Bosphorus</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 bg-summit-navy text-white text-sm font-medium rounded-lg hover:bg-summit-navy/90"
              data-testid="save-slide-btn"
            >
              <Save size={14} /> {editing ? "Güncelle" : "Ekle"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-5 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Yükleniyor...</div>
      ) : slides.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <ImageIcon size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Henüz slide eklenmemiş.</p>
          <p className="text-xs text-gray-400 mt-1">Yukarıdaki "Yeni Slide Ekle" butonu ile başlayın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((s, i, arr) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col"
                data-testid={`slide-card-${s.id}`}
              >
                <div
                  className="w-full h-44 bg-cover bg-center bg-gray-100 relative"
                  style={{ backgroundImage: `url(${s.image_url})` }}
                >
                  {!s.is_active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold uppercase tracking-widest">Pasif</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 bg-white/90 text-summit-navy text-xs font-bold px-2 py-1 rounded">
                    #{s.order ?? 0}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-medium text-summit-navy text-sm">{s.title || "(başlıksız)"}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate" title={s.image_url}>{s.image_url}</p>

                  <div className="flex gap-1 mt-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => moveItem(s, "up")}
                      disabled={i === 0}
                      className="p-1.5 border border-gray-200 rounded text-gray-500 hover:text-summit-navy hover:border-summit-navy disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Yukarı"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(s, "down")}
                      disabled={i === arr.length - 1}
                      className="p-1.5 border border-gray-200 rounded text-gray-500 hover:text-summit-navy hover:border-summit-navy disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Aşağı"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(s)}
                      className="p-1.5 border border-gray-200 rounded text-gray-500 hover:text-summit-navy hover:border-summit-navy"
                      title={s.is_active ? "Pasifleştir" : "Aktifleştir"}
                    >
                      {s.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(s)}
                      className="ml-auto px-2.5 py-1.5 text-xs border border-gray-200 rounded text-gray-600 hover:text-summit-navy hover:border-summit-navy"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="p-1.5 border border-red-200 rounded text-red-500 hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
