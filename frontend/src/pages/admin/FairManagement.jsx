import React, { useEffect, useState } from "react";
import axios from "axios";
import { Save, RefreshCw, Plus, Trash2, X } from "lucide-react";
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
            <Field label="Kroki PDF URL" value={form.floor_plan_url} onChange={v => set("floor_plan_url", v)} placeholder="https://.../stand-plan.pdf" help="PDF formatında kroki. Sitede iframe olarak gösterilir ve indirilebilir." />
            <Field label="Kroki Görsel URL (opsiyonel)" value={form.floor_plan_image_url} onChange={v => set("floor_plan_image_url", v)} placeholder="https://.../kroki.png" help="Eğer PNG/JPG olarak da versiyonu varsa buraya. PDF'e alternatif, daha hızlı yüklenir." />
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
            <button type="button" onClick={addGalleryItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-summit-navy text-white rounded-md hover:bg-summit-navy/90">
              <Plus size={13} /> Foto Ekle
            </button>
          </div>
          <div className="space-y-3">
            {form.gallery.map((g, i) => (
              <div key={i} className="flex gap-3 items-start">
                {g && (
                  <div
                    className="w-20 h-20 bg-cover bg-center rounded border border-gray-200 shrink-0"
                    style={{ backgroundImage: `url(${g})` }}
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
