import React, { useEffect, useState } from "react";
import axios from "axios";
import { Save, Search, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const FIELDS = [
  {
    section: "Temel Bilgiler",
    icon: Search,
    desc: "Google ve diğer arama motorlarında görünecek temel bilgiler.",
    items: [
      { k: "site_name", label: "Site Adı", placeholder: "Arsa Yatırım Zirvesi", help: "Tarayıcı sekmesi ve sosyal paylaşımlarda kullanılır." },
      { k: "site_url", label: "Site URL", placeholder: "https://arsayatirimzirvesi.com", help: "Tam alan adı (https:// ile)." },
      { k: "title", label: "Sayfa Başlığı (Title)", placeholder: "Arsa Yatırım Zirvesi 2026 | 21 Mayıs · Hilton İstanbul", help: "Google sonuçlarında görünen başlık. 50–60 karakter ideal.", maxLen: 70 },
      { k: "description", label: "Meta Açıklama", placeholder: "Türkiye'nin en kapsamlı arsa yatırımı zirvesi...", textarea: true, help: "Google sonuçlarında görünen açıklama. 150–160 karakter ideal.", maxLen: 180 },
      { k: "keywords", label: "Anahtar Kelimeler", placeholder: "arsa yatırım zirvesi, arsa yatırımı, gayrimenkul...", textarea: true, help: "Virgülle ayrılmış kelimeler." },
      { k: "author", label: "Yazar / Şirket", placeholder: "FIRAT CONSTRUCTION YAPI A.Ş." },
      { k: "canonical_url", label: "Canonical URL", placeholder: "https://arsayatirimzirvesi.com/", help: "Tercih edilen kanonik adres." },
      { k: "robots", label: "Robots", placeholder: "index, follow", help: "index, follow / noindex, nofollow vb." },
    ],
  },
  {
    section: "Sosyal Medya — Open Graph (Facebook, LinkedIn, WhatsApp)",
    icon: ExternalLink,
    desc: "Link paylaşıldığında çıkan başlık, açıklama ve görsel.",
    items: [
      { k: "og_title", label: "OG Başlık", placeholder: "Arsa Yatırım Zirvesi 2026" },
      { k: "og_description", label: "OG Açıklama", placeholder: "Uzman konuşmacılar, networking, ücretsiz kayıt", textarea: true },
      { k: "og_image", label: "OG Görsel URL (1200x630px önerilir)", placeholder: "https://..." },
    ],
  },
  {
    section: "Twitter / X Kartı",
    icon: ExternalLink,
    desc: "Twitter'da paylaşıldığında çıkan kart.",
    items: [
      { k: "twitter_card", label: "Kart Tipi", placeholder: "summary_large_image", help: "summary_large_image | summary" },
      { k: "twitter_title", label: "Twitter Başlık", placeholder: "Arsa Yatırım Zirvesi 2026" },
      { k: "twitter_description", label: "Twitter Açıklama", textarea: true },
      { k: "twitter_image", label: "Twitter Görsel URL", placeholder: "https://..." },
    ],
  },
  {
    section: "Etkinlik Bilgileri (Google Events Schema)",
    icon: Sparkles,
    desc: "Google'da \"Arsa Yatırım Zirvesi\" arandığında etkinlik bilgisi (tarih, konum) zengin sonuç olarak görünür.",
    items: [
      { k: "event_name", label: "Etkinlik Adı", placeholder: "Arsa Yatırım Zirvesi 2026" },
      { k: "event_start_date", label: "Başlangıç (ISO 8601)", placeholder: "2026-05-21T09:00:00+03:00" },
      { k: "event_end_date", label: "Bitiş (ISO 8601)", placeholder: "2026-05-21T19:00:00+03:00" },
      { k: "event_location_name", label: "Konum Adı", placeholder: "Hilton İstanbul Bosphorus" },
      { k: "event_location_address", label: "Konum Adresi", placeholder: "Cumhuriyet Cd. No:50, Şişli/İstanbul", textarea: true },
      { k: "event_organizer", label: "Düzenleyici", placeholder: "FIRAT CONSTRUCTION YAPI A.Ş." },
      { k: "event_organizer_url", label: "Düzenleyici Web Sitesi", placeholder: "https://firatconstruction.com" },
    ],
  },
  {
    section: "Doğrulama & Ekstra",
    icon: Sparkles,
    desc: "Google Search Console doğrulaması ve özel <head> ekleri.",
    items: [
      { k: "google_site_verification", label: "Google Site Verification", placeholder: "abcdefghij1234...", help: "Search Console > HTML etiketi yöntemi." },
      { k: "favicon_url", label: "Favicon URL", placeholder: "https://..." },
      { k: "custom_head_html", label: "Özel <head> HTML (ileri düzey)", textarea: true, placeholder: "<!-- ek meta veya script -->" },
    ],
  },
];

const DEFAULTS = {
  site_name: "Arsa Yatırım Zirvesi",
  site_url: "https://arsayatirimzirvesi.com",
  title: "Arsa Yatırım Zirvesi 2026 | 21 Mayıs · Hilton İstanbul Bosphorus",
  description: "Türkiye'nin en kapsamlı arsa yatırımı zirvesi. 21 Mayıs 2026, Hilton İstanbul Bosphorus. Uzman konuşmacılar, networking, ücretsiz katılım.",
  keywords: "arsa yatırım zirvesi, arsa yatırımı, arsa yatırım 2026, gayrimenkul yatırımı, arazi yatırımı, istanbul arsa, arsa zirvesi, arsa yatırım fuarı",
  author: "FIRAT CONSTRUCTION YAPI A.Ş.",
  og_title: "Arsa Yatırım Zirvesi 2026 — 21 Mayıs · Hilton İstanbul Bosphorus",
  og_description: "Türkiye'nin en kapsamlı arsa yatırımı buluşması. Uzman konuşmacılar, sektör liderleri, fuar ve networking. Ücretsiz kayıt.",
  twitter_title: "Arsa Yatırım Zirvesi 2026",
  twitter_description: "Türkiye'nin en kapsamlı arsa yatırımı zirvesi · 21 Mayıs 2026 · Hilton İstanbul Bosphorus",
  twitter_card: "summary_large_image",
  robots: "index, follow",
  canonical_url: "https://arsayatirimzirvesi.com/",
  event_name: "Arsa Yatırım Zirvesi 2026",
  event_start_date: "2026-05-21T09:00:00+03:00",
  event_end_date: "2026-05-21T19:00:00+03:00",
  event_location_name: "Hilton İstanbul Bosphorus",
  event_location_address: "Cumhuriyet Cd. No:50, 34367 Şişli/İstanbul",
  event_organizer: "FIRAT CONSTRUCTION YAPI A.Ş.",
  event_organizer_url: "https://firatconstruction.com",
};

export default function AdminSEO() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/seo`, { withCredentials: true });
      setForm(data || {});
    } catch (e) {
      setErr("Yüklenemedi");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAutoFill = () => {
    setForm((p) => {
      const next = { ...p };
      Object.entries(DEFAULTS).forEach(([k, v]) => {
        if (!next[k] || next[k].trim?.() === "") next[k] = v;
      });
      return next;
    });
    setMsg("Boş alanlar otomatik dolduruldu — Kaydet'e basmayı unutmayın.");
    setErr("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(""); setErr("");
    try {
      // Strip server-managed fields
      const { id, key, created_at, updated_at, ...payload } = form;
      await axios.put(`${API}/admin/seo`, payload, { withCredentials: true });
      setMsg("SEO ayarları kaydedildi.");
      load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Kaydedilemedi");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Yükleniyor...</div>;
  }

  const previewTitle = form.title || DEFAULTS.title;
  const previewDesc = form.description || DEFAULTS.description;
  const previewUrl = (form.site_url || DEFAULTS.site_url).replace(/^https?:\/\//, "");

  return (
    <div className="max-w-5xl mx-auto" data-testid="admin-seo-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-summit-navy">SEO & Arama Motoru Ayarları</h1>
          <p className="text-sm text-gray-500 mt-1">Google, Bing ve sosyal medya için sitenin nasıl görüneceğini buradan yönetin.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoFill}
            className="inline-flex items-center gap-2 px-4 py-2 bg-summit-gold/10 hover:bg-summit-gold/20 text-summit-navy text-sm font-medium rounded-lg border border-summit-gold/30 transition-colors"
            data-testid="seo-autofill-btn"
          >
            <Sparkles size={15} /> Otomatik Doldur
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-summit-navy text-sm rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Google preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6" data-testid="seo-google-preview">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Google Önizleme</div>
        <div className="font-sans">
          <div className="text-xs text-gray-700">{previewUrl}</div>
          <div className="text-xl text-blue-700 hover:underline cursor-pointer leading-snug truncate">{previewTitle}</div>
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{previewDesc}</div>
        </div>
      </div>

      {msg && <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{msg}</div>}
      {err && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {FIELDS.map((sec) => {
          const Icon = sec.icon;
          return (
            <div key={sec.section} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-summit-navy/5 flex items-center justify-center text-summit-navy shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-summit-navy">{sec.section}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{sec.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sec.items.map((it) => {
                  const v = form[it.k] || "";
                  const len = (v || "").length;
                  const over = it.maxLen && len > it.maxLen;
                  return (
                    <div key={it.k} className={it.textarea ? "md:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        {it.label}
                        {it.maxLen && (
                          <span className={`ml-2 text-xs ${over ? "text-red-500" : "text-gray-400"}`}>
                            {len}/{it.maxLen}
                          </span>
                        )}
                      </label>
                      {it.textarea ? (
                        <textarea
                          value={v}
                          onChange={(e) => handleChange(it.k, e.target.value)}
                          placeholder={it.placeholder}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40 focus:border-summit-gold/50 transition-all"
                          data-testid={`seo-field-${it.k}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={v}
                          onChange={(e) => handleChange(it.k, e.target.value)}
                          placeholder={it.placeholder}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40 focus:border-summit-gold/50 transition-all"
                          data-testid={`seo-field-${it.k}`}
                        />
                      )}
                      {it.help && <p className="text-xs text-gray-400 mt-1">{it.help}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-summit-navy/5 rounded-xl p-4">
          <div className="text-xs text-gray-600">
            <strong className="text-summit-navy">İpucu:</strong> Değişiklikler kaydedildikten sonra tarayıcıda Ctrl+Shift+R ile yeniden yükleyin.
            Google'ın güncellemeyi görmesi 1–7 gün sürebilir. Search Console'a sitemap.xml göndermeyi unutmayın.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-summit-navy text-white text-sm font-medium rounded-lg hover:bg-summit-navy/90 disabled:opacity-60 transition-colors"
            data-testid="seo-save-btn"
          >
            <Save size={15} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>

      {/* Helpful links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { t: "Google Search Console", u: "https://search.google.com/search-console", d: "Sitenizi Google'a tanıtın." },
          { t: "Sitemap", u: "/sitemap.xml", d: "Search Console'a yükleyin." },
          { t: "Robots.txt", u: "/robots.txt", d: "Tarama kuralları." },
        ].map((l) => (
          <a key={l.t} href={l.u} target="_blank" rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-summit-gold/50 hover:bg-summit-gold/5 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-summit-navy">{l.t}</span>
              <ExternalLink size={13} className="text-gray-400 group-hover:text-summit-gold" />
            </div>
            <p className="text-xs text-gray-500 mt-1">{l.d}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
