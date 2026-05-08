import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Settings, BarChart3, Code, Share2, Phone, Save, AlertCircle, Check,
  Instagram, Linkedin, Twitter, Facebook, Youtube, MessageCircle, Mail, MapPin,
  ExternalLink, Info
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const TABS = [
  { id: "analytics", label: "Analytics & Tag Manager", icon: BarChart3 },
  { id: "head", label: "Head & Body Kod", icon: Code },
  { id: "social", label: "Sosyal Medya", icon: Share2 },
  { id: "contact", label: "İletişim", icon: Phone },
];

export default function IntegrationsPage() {
  const [tab, setTab] = useState("analytics");
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/seo`, { withCredentials: true });
      setData(data);
      setForm({
        gtm_id: data.gtm_id || "",
        ga_id: data.ga_id || "",
        meta_pixel_id: data.meta_pixel_id || "",
        google_site_verification: data.google_site_verification || "",
        custom_head_html: data.custom_head_html || "",
        custom_body_html: data.custom_body_html || "",
        social_instagram: data.social_instagram || "",
        social_linkedin: data.social_linkedin || "",
        social_twitter: data.social_twitter || "",
        social_facebook: data.social_facebook || "",
        social_youtube: data.social_youtube || "",
        social_tiktok: data.social_tiktok || "",
        social_whatsapp: data.social_whatsapp || "",
        contact_phone: data.contact_phone || "",
        contact_email: data.contact_email || "",
        contact_address: data.contact_address || "",
      });
    } catch (e) {
      setError(e.response?.data?.detail || "Yüklenemedi");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true); setError(""); setMsg(null);
    try {
      // Send only fields the SEO model accepts; merge with existing data so we don't wipe other fields
      const merged = { ...data, ...form };
      // Strip read-only fields
      delete merged.id; delete merged._id; delete merged.key; delete merged.created_at;
      await axios.put(`${API}/admin/seo`, merged, { withCredentials: true });
      setMsg("Ayarlar kaydedildi. Değişiklikler birkaç saniye içinde sitede aktif.");
      await load();
      setTimeout(() => setMsg(null), 4500);
    } catch (e) {
      setError(e.response?.data?.detail || "Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  if (!data) return <div className="p-6 text-gray-500">Yükleniyor…</div>;

  return (
    <div className="space-y-5" data-testid="integrations-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Settings size={24} /> Entegrasyonlar & Sosyal Medya
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Google Analytics, Tag Manager, sosyal medya hesapları, iletişim bilgileri — hepsini tek yerden yönetin.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
          data-testid="save-btn"
        >
          <Save size={15} /> {saving ? "Kaydediliyor…" : "Tüm Değişiklikleri Kaydet"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-3 text-sm flex items-start gap-2" data-testid="save-msg">
          <Check size={16} className="shrink-0 mt-0.5" /> {msg}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto" data-testid="tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${active ? "border-summit-navy text-summit-navy" : "border-transparent text-gray-500 hover:text-summit-navy"}`}
              data-testid={`tab-${t.id}`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5" data-testid="tab-content-analytics">
          <Notice>
            Buraya gireceğiniz ID'ler tüm sayfaların <code>&lt;head&gt;</code> bölümüne otomatik enjekte edilir.
            Değişiklik birkaç saniye içinde aktif olur (deploy gerekmez).
          </Notice>

          <Field label="Google Tag Manager ID" hint="Format: GTM-XXXXXXX" testid="field-gtm">
            <input type="text" value={form.gtm_id} onChange={e => set("gtm_id", e.target.value)}
              placeholder="GTM-MKFS5QXV"
              className="font-mono w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy" />
          </Field>

          <Field label="Google Analytics 4 (GA4) Ölçüm Kimliği" hint="Format: G-XXXXXXXXXX" testid="field-ga">
            <input type="text" value={form.ga_id} onChange={e => set("ga_id", e.target.value)}
              placeholder="G-B6KEJ4DYPL"
              className="font-mono w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy" />
          </Field>

          <Field label="Meta / Facebook Pixel ID" hint="Sadece sayılardan oluşur, örn: 123456789012345" testid="field-meta">
            <input type="text" value={form.meta_pixel_id} onChange={e => set("meta_pixel_id", e.target.value)}
              placeholder="000000000000000"
              className="font-mono w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy" />
          </Field>

          <Field label="Google Search Console — Site Doğrulama Kodu" hint="meta name='google-site-verification' content değeri" testid="field-gsc">
            <input type="text" value={form.google_site_verification} onChange={e => set("google_site_verification", e.target.value)}
              placeholder="abc123..."
              className="font-mono w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy" />
          </Field>

          <ExternalGuide />
        </div>
      )}

      {/* HEAD/BODY HTML TAB */}
      {tab === "head" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5" data-testid="tab-content-head">
          <Notice tone="warning">
            ⚠ Bu alanlara <strong>script ve HTML</strong> kodu girebilirsiniz. Yanlış kod siteyi kırabilir; eklemeden önce kaynağı doğrulayın.
            Buraya yazılanlar tüm sayfalara dahil edilir.
          </Notice>

          <Field label="Özel <head> HTML / Script" hint="Hotjar, MS Clarity, Pinterest Tag, custom meta vb. — &lt;script&gt; ve &lt;meta&gt; tag'leri otomatik &lt;head&gt;'e taşınır" testid="field-head">
            <textarea value={form.custom_head_html} onChange={e => set("custom_head_html", e.target.value)}
              rows={10}
              placeholder={'<script>...</script>\n<meta name="..." content="..." />'}
              className="font-mono w-full bg-summit-paper border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-xs focus:outline-none focus:border-summit-navy resize-y" />
          </Field>

          <Field label="Özel <body> HTML / Script" hint="GTM noscript fallback otomatik eklenir; buraya sadece ekstra body içeriği koyun" testid="field-body">
            <textarea value={form.custom_body_html} onChange={e => set("custom_body_html", e.target.value)}
              rows={6}
              placeholder={'<noscript>...</noscript>'}
              className="font-mono w-full bg-summit-paper border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-xs focus:outline-none focus:border-summit-navy resize-y" />
          </Field>
        </div>
      )}

      {/* SOCIAL MEDIA TAB */}
      {tab === "social" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="tab-content-social">
          <Notice>
            Buraya girilen URL'ler footer'da otomatik gösterilir. Sadece tam URL kullanın (https:// ile başlayan).
          </Notice>
          <SocialField icon={Instagram} label="Instagram" value={form.social_instagram} onChange={v => set("social_instagram", v)} placeholder="https://instagram.com/arsayatirimzirvesi" testid="s-ig" />
          <SocialField icon={Linkedin} label="LinkedIn" value={form.social_linkedin} onChange={v => set("social_linkedin", v)} placeholder="https://linkedin.com/company/..." testid="s-li" />
          <SocialField icon={Facebook} label="Facebook" value={form.social_facebook} onChange={v => set("social_facebook", v)} placeholder="https://facebook.com/..." testid="s-fb" />
          <SocialField icon={Twitter} label="X / Twitter" value={form.social_twitter} onChange={v => set("social_twitter", v)} placeholder="https://x.com/..." testid="s-x" />
          <SocialField icon={Youtube} label="YouTube" value={form.social_youtube} onChange={v => set("social_youtube", v)} placeholder="https://youtube.com/@..." testid="s-yt" />
          <SocialField icon={Share2} label="TikTok" value={form.social_tiktok} onChange={v => set("social_tiktok", v)} placeholder="https://tiktok.com/@..." testid="s-tt" />
          <SocialField icon={MessageCircle} label="WhatsApp" value={form.social_whatsapp} onChange={v => set("social_whatsapp", v)} placeholder="https://wa.me/905551234567" testid="s-wa" />
        </div>
      )}

      {/* CONTACT TAB */}
      {tab === "contact" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="tab-content-contact">
          <Notice>
            İletişim bilgileri footer'da ve "İletişim" bölümlerinde görünür.
          </Notice>
          <SocialField icon={Phone} label="Telefon" value={form.contact_phone} onChange={v => set("contact_phone", v)} placeholder="+90 555 000 00 00" testid="c-phone" />
          <SocialField icon={Mail} label="E-posta" value={form.contact_email} onChange={v => set("contact_email", v)} placeholder="info@arsayatirimzirvesi.com" testid="c-email" />
          <Field label="Adres" testid="field-address">
            <textarea value={form.contact_address} onChange={e => set("contact_address", e.target.value)}
              rows={3}
              placeholder="Hilton İstanbul Bosphorus, Cumhuriyet Cd. No:50, Şişli/İstanbul"
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy resize-y" />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children, testid }) {
  return (
    <div data-testid={testid}>
      <label className="text-xs uppercase tracking-wider mb-1.5 block font-bold text-gray-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-500 mt-1 flex items-start gap-1"><Info size={11} className="mt-0.5 shrink-0" />{hint}</p>}
    </div>
  );
}

function SocialField({ icon: Icon, label, value, onChange, placeholder, testid }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 items-center" data-testid={testid}>
      <div className="w-10 h-10 rounded-lg bg-summit-paper border border-gray-200 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-summit-navy" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 block">{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy" />
      </div>
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-summit-navy" title="Linki aç">
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function Notice({ children, tone = "info" }) {
  const cls = tone === "warning"
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : "bg-blue-50 border-blue-200 text-blue-900";
  return (
    <div className={`${cls} border rounded-md p-3 text-xs flex items-start gap-2`}>
      <Info size={14} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function ExternalGuide() {
  return (
    <div className="bg-summit-paper border border-gray-200 rounded-md p-4 text-xs text-gray-700 leading-relaxed">
      <strong className="text-summit-navy block mb-2">📚 ID'lerinizi nereden bulacaksınız?</strong>
      <ul className="space-y-1.5 list-disc pl-5">
        <li><strong>GTM:</strong> tagmanager.google.com → Workspace → Container ID (sağ üst köşe)</li>
        <li><strong>GA4:</strong> analytics.google.com → Yönetim → Veri Akışları → Web → "Ölçüm Kimliği"</li>
        <li><strong>Meta Pixel:</strong> business.facebook.com → Events Manager → Veri Kaynakları → Pixel ID</li>
        <li><strong>Search Console:</strong> search.google.com/search-console → Ayarlar → Mülk doğrulama → HTML etiketi içindeki content değeri</li>
      </ul>
    </div>
  );
}
