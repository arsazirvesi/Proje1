import React, { useEffect, useState } from "react";
import axios from "axios";
import { Save, RefreshCw, Plus, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function FairManagement() {
  const [form, setForm] = useState({
    fair_name: "", subtitle: "", dates: "", location: "", hall_name: "",
    description: "", total_stands: 0, total_size_range: "",
    floor_plan_url: "", floor_plan_image_url: "",
    gallery: [], stand_types: [], highlights: [],
    cta_text: "Stant Başvurusu Yap", cta_url: "/fuar-stant-kaydi",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(null); // null | "floor_plan" | `gallery-${i}`

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/fair`, { withCredentials: true });
      setForm({
        fair_name: data.fair_name || "",
        subtitle: data.subtitle || "",
        dates: data.dates || "",
        location: data.location || "",
        hall_name: data.hall_name || "",
        description: data.description || "",
        total_stands: data.total_stands || 0,
        total_size_range: data.total_size_range || "",
        floor_plan_url: data.floor_plan_url || "",
        floor_plan_image_url: data.floor_plan_image_url || "",
        gallery: data.gallery || [],
        stand_types: data.stand_types || [],
        highlights: data.highlights || [],
        cta_text: data.cta_text || "Stant Başvurusu Yap",
        cta_url: data.cta_url || "/fuar-stant-kaydi",
      });
    } catch {
      setErr("Yüklenemedi");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(""); setErr("");
    try {
      await axios.put(`${API}/admin/fair`, form, { withCredentials: true });
      setMsg("Fuar ayarları kaydedildi.");
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Kaydedilemedi");
    }
    setSaving(false);
  };

  // Gallery helpers
  const addGalleryItem = () => set("gallery", [...form.gallery, ""]);
  const setGalleryItem = (i, v) => set("gallery", form.gallery.map((x, idx) => idx === i ? v : x));
  const removeGalleryItem = (i) => set("gallery", form.gallery.filter((_, idx) => idx !== i));

  // Upload image (returns public URL or null on failure)
  const uploadImage = async (file, slotKey) => {
    if (!file) return null;
    if (!file.type.startsWith("image/")) {
      setErr("Lütfen bir görsel dosyası seçin (JPG, PNG, WEBP).");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Dosya 10 MB'dan büyük olamaz.");
      return null;
    }
    setUploading(slotKey);
    setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/admin/uploads/image`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploading(null);
      return data.url;
    } catch (e) {
      setErr(e?.response?.data?.detail || "Yükleme başarısız");
      setUploading(null);
      return null;
    }
  };

  const onFloorPlanImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be re-selected
    const url = await uploadImage(file, "floor_plan");
    if (url) {
      set("floor_plan_image_url", url);
      setMsg("Kroki görseli yüklendi. Aşağıdan Kaydet'e basmayı unutmayın.");
    }
  };

  const onGalleryUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const slotKey = idx === null ? "gallery-new" : `gallery-${idx}`;
    const url = await uploadImage(file, slotKey);
    if (url) {
      if (idx === null) {
        // append
        set("gallery", [...form.gallery, url]);
      } else {
        setGalleryItem(idx, url);
      }
      setMsg("Görsel yüklendi. Aşağıdan Kaydet'e basmayı unutmayın.");
    }
  };

  // Stand type helpers
  const addStandType = () => set("stand_types", [...form.stand_types, { name: "", size: "", count: 0, features: "" }]);
  const setStandType = (i, k, v) => set("stand_types", form.stand_types.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const removeStandType = (i) => set("stand_types", form.stand_types.filter((_, idx) => idx !== i));

  // Highlight helpers
  const addHighlight = () => set("highlights", [...form.highlights, ""]);
  const setHighlight = (i, v) => set("highlights", form.highlights.map((x, idx) => idx === i ? v : x));
  const removeHighlight = (i) => set("highlights", form.highlights.filter((_, idx) => idx !== i));

  if (loading) return <div className="text-sm text-gray-500">Yükleniyor...</div>;

  return (
    <div className="max-w-5xl mx-auto" data-testid="admin-fair-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-summit-navy">Fuar Alanı Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            /fuar-alani sayfasının içeriği. Kroki (PDF), galeri fotoğrafları, stand tipleri ve açıklamalar.
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-summit-navy text-sm border border-gray-200 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      {msg && <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{msg}</div>}
      {err && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

      <form onSubmit={submit} className="space-y-6">
        {/* BASIC INFO */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-summit-navy mb-4 pb-3 border-b border-gray-100">Temel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fuar Adı" value={form.fair_name} onChange={v => set("fair_name", v)} placeholder="8. Gayrimenkul Proje Yatırım Fuarı" />
            <Field label="Alt Başlık" value={form.subtitle} onChange={v => set("subtitle", v)} />
            <Field label="Tarihler" value={form.dates} onChange={v => set("dates", v)} placeholder="20-21 Mayıs 2026" />
            <Field label="Konum" value={form.location} onChange={v => set("location", v)} />
            <Field label="Salon Adı" value={form.hall_name} onChange={v => set("hall_name", v)} placeholder="Connie I-II, A-B-C" />
            <Field label="Toplam Stand Sayısı" type="number" value={form.total_stands} onChange={v => set("total_stands", parseInt(v, 10) || 0)} />
            <Field label="Boyut Aralığı" value={form.total_size_range} onChange={v => set("total_size_range", v)} placeholder="9-27 m²" />
            <Field label="Açıklama" textarea value={form.description} onChange={v => set("description", v)} />
          </div>
        </div>

        {/* KROKI */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-summit-navy mb-4 pb-3 border-b border-gray-100">Kroki (Yerleşim Planı)</h2>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Kroki PDF URL" value={form.floor_plan_url} onChange={v => set("floor_plan_url", v)} placeholder="https://.../stand-plan.pdf" help="PDF formatında kroki. Sitede indirilebilir buton olarak gösterilir." />

            {/* Floor plan image — upload OR URL */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Kroki Görseli (PNG / JPG)</label>
              <p className="text-xs text-gray-400 mb-2">
                Bu görsel /fuar-alani sayfasında doğrudan gösterilir. Tarayıcılar PDF iframe'lerini engellediği için <strong>görsel yüklemek</strong> en güvenilir yöntemdir.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-start">
                {/* Preview */}
                <div className="w-full sm:w-40 h-28 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                  {form.floor_plan_image_url ? (
                    <img
                      src={form.floor_plan_image_url.startsWith("http") ? form.floor_plan_image_url : `${API.replace(/\/api$/, "")}${form.floor_plan_image_url}`}
                      alt="Kroki önizleme"
                      className="w-full h-full object-contain"
                      data-testid="floor-plan-preview"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon size={26} className="mx-auto mb-1" />
                      <span className="text-[10px]">Henüz görsel yok</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg cursor-pointer transition-colors ${uploading === "floor_plan" ? "border-gray-200 text-gray-400 bg-gray-50" : "border-summit-navy text-summit-navy hover:bg-summit-navy hover:text-white"}`} data-testid="upload-floor-plan-label">
                    <Upload size={14} />
                    {uploading === "floor_plan" ? "Yükleniyor..." : "Görsel Yükle"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={onFloorPlanImageUpload}
                      disabled={uploading === "floor_plan"}
                      className="hidden"
                      data-testid="upload-floor-plan-input"
                    />
                  </label>

                  <input
                    type="url"
                    value={form.floor_plan_image_url}
                    onChange={e => set("floor_plan_image_url", e.target.value)}
                    placeholder="veya doğrudan URL: https://.../kroki.png"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
                    data-testid="floor-plan-image-url"
                  />

                  {form.floor_plan_image_url && (
                    <button
                      type="button"
                      onClick={() => set("floor_plan_image_url", "")}
                      className="text-xs text-red-500 hover:underline inline-flex items-center gap-1"
                      data-testid="remove-floor-plan-btn"
                    >
                      <X size={12} /> Görseli kaldır
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STAND TYPES */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-summit-navy">Stand Tipleri</h2>
            <button type="button" onClick={addStandType} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-summit-navy text-white rounded-md hover:bg-summit-navy/90">
              <Plus size={13} /> Ekle
            </button>
          </div>
          <div className="space-y-3">
            {form.stand_types.map((t, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="md:col-span-3">
                  <Field small label="Adı" value={t.name} onChange={v => setStandType(i, "name", v)} />
                </div>
                <div className="md:col-span-2">
                  <Field small label="Boyut" value={t.size} onChange={v => setStandType(i, "size", v)} placeholder="3×4 m" />
                </div>
                <div className="md:col-span-2">
                  <Field small label="Adet" type="number" value={t.count} onChange={v => setStandType(i, "count", parseInt(v, 10) || 0)} />
                </div>
                <div className="md:col-span-4">
                  <Field small label="Özellikler" value={t.features} onChange={v => setStandType(i, "features", v)} />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button type="button" onClick={() => removeStandType(i)} className="p-2 border border-red-200 rounded text-red-500 hover:bg-red-50 w-full flex justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {form.stand_types.length === 0 && <p className="text-xs text-gray-400">Henüz stand tipi eklenmedi.</p>}
          </div>
        </div>

        {/* HIGHLIGHTS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-summit-navy">Avantajlar (Öne Çıkanlar)</h2>
            <button type="button" onClick={addHighlight} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-summit-navy text-white rounded-md hover:bg-summit-navy/90">
              <Plus size={13} /> Ekle
            </button>
          </div>
          <div className="space-y-2">
            {form.highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={h}
                  onChange={e => setHighlight(i, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Örn: 600+ yatırımcı ziyareti"
                />
                <button type="button" onClick={() => removeHighlight(i)} className="p-2 border border-red-200 rounded text-red-500 hover:bg-red-50">
                  <X size={14} />
                </button>
              </div>
            ))}
            {form.highlights.length === 0 && <p className="text-xs text-gray-400">Henüz avantaj eklenmedi.</p>}
          </div>
        </div>

        {/* GALLERY */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-summit-navy">Galeri Fotoğrafları</h2>
            <div className="flex items-center gap-2">
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${uploading?.startsWith("gallery-new") ? "bg-gray-200 text-gray-400" : "bg-summit-navy text-white hover:bg-summit-navy/90"}`} data-testid="upload-gallery-label">
                <Upload size={13} />
                {uploading === "gallery-new" ? "Yükleniyor..." : "Foto Yükle"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => onGalleryUpload(e, null)}
                  disabled={uploading === "gallery-new"}
                  className="hidden"
                  data-testid="upload-gallery-input"
                />
              </label>
              <button type="button" onClick={addGalleryItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-summit-navy text-summit-navy rounded-md hover:bg-summit-navy/5">
                <Plus size={13} /> URL Ekle
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {form.gallery.map((g, i) => (
              <div key={i} className="flex gap-3 items-start">
                {g && (
                  <div
                    className="w-20 h-20 bg-cover bg-center rounded border border-gray-200 shrink-0"
                    style={{ backgroundImage: `url(${g.startsWith("http") ? g : `${API.replace(/\/api$/, "")}${g}`})` }}
                  />
                )}
                <input
                  type="url"
                  value={g}
                  onChange={e => setGalleryItem(i, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="https://..."
                />
                <button type="button" onClick={() => removeGalleryItem(i)} className="p-2 border border-red-200 rounded text-red-500 hover:bg-red-50">
                  <X size={14} />
                </button>
              </div>
            ))}
            {form.gallery.length === 0 && <p className="text-xs text-gray-400">Henüz foto eklenmedi.</p>}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-summit-navy mb-4 pb-3 border-b border-gray-100">Eylem Butonu (CTA)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Buton Metni" value={form.cta_text} onChange={v => set("cta_text", v)} />
            <Field label="Buton Linki" value={form.cta_url} onChange={v => set("cta_url", v)} placeholder="/fuar-stant-kaydi" />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-summit-navy text-white text-sm font-medium rounded-lg hover:bg-summit-navy/90 disabled:opacity-60"
            data-testid="save-fair-btn"
          >
            <Save size={15} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, type = "text", help, small }) {
  return (
    <div>
      <label className={`block ${small ? "text-[0.65rem]" : "text-xs"} font-medium text-gray-700 mb-1`}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${small ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"} border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-summit-gold/40`}
        />
      )}
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}
