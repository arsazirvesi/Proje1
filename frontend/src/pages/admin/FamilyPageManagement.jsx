import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Loader2, Globe, Users, Crown } from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import ImageUrlInput from "../../components/ImageUrlInput";

export default function FamilyPageManagement() {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    axios.get(`${API}/family/settings`).then(r => setF(r.data));
  }, []);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { data } = await axios.patch(`${API}/admin/family/settings`, f, { withCredentials: true });
      setF(data);
      setMsg("✅ Kaydedildi — /zirve-ailesi sayfası güncellendi");
      setTimeout(() => setMsg(""), 4000);
    } catch (e2) {
      setMsg(e2?.response?.data?.detail || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (!f) return <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-summit-navy" /></div>;

  return (
    <div className="space-y-5" data-testid="admin-family">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-summit-navy font-bold flex items-center gap-2">
            <Users size={22} className="text-amber-500" />
            Zirve Ailesi Sayfası
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Sayfa başlıkları, SEO meta etiketleri ve sosyal medya önizlemesi</p>
        </div>
        <a href="/zirve-ailesi" target="_blank" rel="noreferrer"
          className="text-xs font-semibold text-summit-navy hover:underline inline-flex items-center gap-1">
          Sayfayı Görüntüle <Globe size={11} />
        </a>
      </header>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs flex items-start gap-2">
        <Crown size={14} className="shrink-0 mt-0.5" />
        <span>Kurucu ve konuşmacıları yönetmek için <strong>Admin → Konuşmacılar</strong> sayfasında her konuşmacı için "Kurucu", "Katıldığı Yıllar" ve "Detaylı Biyografi" alanları mevcuttur.</span>
      </div>

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-3xl">
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2">Hero Bölümü</h3>
          <Field label="Üst Rozet">
            <input value={f.hero_overline || ""} onChange={e => set("hero_overline", e.target.value)} placeholder="Arsa Yatırım Zirvesi" className="form-input" />
          </Field>
          <Field label="Ana Başlık (H1)">
            <input value={f.hero_title || ""} onChange={e => set("hero_title", e.target.value)} placeholder="Zirve Ailesi" className="form-input" data-testid="family-h1" />
          </Field>
          <Field label="Vurgulu Kelime (altın renge boyanır)">
            <input value={f.hero_accent || ""} onChange={e => set("hero_accent", e.target.value)} placeholder="Ailesi" className="form-input" />
          </Field>
          <Field label="Alt Başlık (H2)">
            <textarea value={f.hero_subtitle || ""} onChange={e => set("hero_subtitle", e.target.value)} rows={3} className="form-input resize-none" />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2 pt-4">Bölüm Başlıkları</h3>
          <Field label="Kurucu Etiketi (H3)">
            <input value={f.founder_title || ""} onChange={e => set("founder_title", e.target.value)} placeholder="Zirve ve Platform Kurucusu" className="form-input" />
          </Field>
          <Field label="Konuşmacılar Bölüm Başlığı (H3)">
            <input value={f.speakers_title || ""} onChange={e => set("speakers_title", e.target.value)} placeholder="Konuşmacılarımız" className="form-input" />
          </Field>
          <Field label="Konuşmacılar Alt Açıklaması (H4/H5)">
            <input value={f.speakers_subtitle || ""} onChange={e => set("speakers_subtitle", e.target.value)} className="form-input" />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2 pt-4 flex items-center gap-1.5">
            <Search size={12} /> SEO Meta Etiketleri
          </h3>
          <Field label="SEO Title (60-70 karakter ideal)">
            <input value={f.seo_title || ""} onChange={e => set("seo_title", e.target.value)} maxLength={120} className="form-input" data-testid="family-seo-title" />
            <div className="text-[10px] text-gray-400 mt-1">{(f.seo_title || "").length}/120</div>
          </Field>
          <Field label="SEO Description (150-160 karakter ideal)">
            <textarea value={f.seo_description || ""} onChange={e => set("seo_description", e.target.value)} maxLength={300} rows={3} className="form-input resize-none" />
            <div className="text-[10px] text-gray-400 mt-1">{(f.seo_description || "").length}/300</div>
          </Field>
          <Field label="Anahtar Kelimeler (virgülle ayır)">
            <textarea value={f.seo_keywords || ""} onChange={e => set("seo_keywords", e.target.value)} rows={3} className="form-input resize-none" />
          </Field>
          <Field label="Canonical URL Yolu">
            <input value={f.canonical_path || ""} onChange={e => set("canonical_path", e.target.value)} placeholder="/zirve-ailesi" className="form-input" />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2 pt-4">Sosyal Medya Önizleme (Open Graph)</h3>
          <Field label="OG Title (opsiyonel)">
            <input value={f.og_title || ""} onChange={e => set("og_title", e.target.value)} className="form-input" />
          </Field>
          <Field label="OG Description (opsiyonel)">
            <textarea value={f.og_description || ""} onChange={e => set("og_description", e.target.value)} rows={2} className="form-input resize-none" />
          </Field>
          <Field label="OG Image (1200×630px önerilir)">
            <ImageUrlInput value={f.og_image} onChange={url => set("og_image", url)} testIdPrefix="family-og" />
          </Field>
        </section>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {msg && <div className="text-xs font-semibold text-summit-navy">{msg}</div>}
          <button type="submit" disabled={saving} className="btn-navy px-5 py-2.5 text-xs inline-flex items-center gap-1.5 ml-auto" data-testid="family-save-btn">
            {saving && <Loader2 size={12} className="animate-spin" />} Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  );
}
