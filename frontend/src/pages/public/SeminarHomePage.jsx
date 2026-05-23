import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  GraduationCap, ArrowRight, BookOpen, Users, Award, Globe, MapPin,
  Sparkles, ChevronRight, CheckCircle2, Building2, TrendingUp,
  BadgePercent, Map, FileText, Briefcase, Layers, Banknote, Scale,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

const SITE = "https://arsayatirimzirvesi.com";

const ICON_MAP = {
  GraduationCap, BookOpen, Users, Award, MapPin, Map, Scale, TrendingUp,
  BadgePercent, FileText, Briefcase, Layers, Building2, Banknote,
};

const FAQS = [
  {
    q: "Arsa Yatırım Semineri nedir?",
    a: "Türkiye'nin saha uzmanlarından arsa-arazi yatırımı, gayrimenkul hukuku, dijital pazarlama ve satış teknikleri üzerine periyodik düzenlenen online ve yüz yüze seminer programıdır.",
  },
  {
    q: "Seminerler ücretli mi?",
    a: "Her seminer ayrı değerlendirilir. Hem ücretsiz buluşmalar hem de sertifikalı ücretli programlar mevcuttur. Detaylar her seminer sayfasında belirtilmiştir.",
  },
  {
    q: "Seminerlere kimler katılabilir?",
    a: "Yatırım yapmaya yeni başlayanlardan profesyonel emlak danışmanlarına kadar herkes katılabilir. Önerilen deneyim seviyesi her seminer sayfasında belirtilir.",
  },
  {
    q: "Sertifika veriliyor mu?",
    a: "Ücretli ve tamamlayıcı sertifika gerektiren seminerlerde Arsa Yatırım Semineri Katılım Sertifikası verilir.",
  },
  {
    q: "Online mı yüz yüze mi yapılıyor?",
    a: "Hem online (canlı yayın + kayıt) hem yüz yüze hem de hibrit formatta seminerlerimiz var. Her seminerin formatı listede ayrıca işaretlidir.",
  },
];

export default function SeminarHomePage() {
  const [cats, setCats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API}/academy/categories`).then(r => setCats(r.data || []));
    axios.get(`${API}/academy/courses`).then(r => setCourses(r.data || []));
    axios.get(`${API}/seminar/settings`).then(r => setSettings(r.data || null));
  }, []);

  if (!settings) {
    return <div className="min-h-screen bg-summit-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const canonical = `${SITE}${settings.canonical_path || "/seminer"}`;

  // ===== JSON-LD =====
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": settings.hero_title || "Arsa Yatırım Semineri",
    "url": canonical,
    "logo": `${SITE}/logo.png`,
    "description": settings.seo_description,
    "sameAs": [
      "https://instagram.com/arsayatirimzirvesi",
      "https://linkedin.com/company/arsayatirimzirvesi",
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": SITE },
      { "@type": "ListItem", "position": 2, "name": "Seminer", "item": canonical },
    ],
  };
  const coursesLd = courses.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": courses.slice(0, 10).map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Course",
        "name": c.title,
        "description": c.description || c.seo_description || c.title,
        "provider": {
          "@type": "Organization",
          "name": settings.hero_title || "Arsa Yatırım Semineri",
          "sameAs": canonical,
        },
      },
    })),
  } : null;

  // Hero title split for accent color
  const title = settings.hero_title || "Arsa Yatırım Semineri";
  const accent = settings.hero_accent || "Semineri";
  const titleStart = accent && title.endsWith(accent)
    ? title.slice(0, title.length - accent.length).trim()
    : title;
  const titleEnd = accent && title.endsWith(accent) ? accent : "";

  const ogImage = settings.og_image || `${SITE}/og-seminer.png`;
  const ogTitle = settings.og_title || settings.seo_title;
  const ogDesc = settings.og_description || settings.seo_description;

  return (
    <div className="min-h-screen bg-white" data-testid="seminer-home">
      <Helmet>
        <title>{settings.seo_title}</title>
        <meta name="description" content={settings.seo_description} />
        <meta name="keywords" content={settings.seo_keywords} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(orgLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        {coursesLd && <script type="application/ld+json">{JSON.stringify(coursesLd)}</script>}
      </Helmet>

      <Navbar />

      <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-200 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-500">
          <Link to="/" className="hover:text-summit-navy">Ana Sayfa</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-summit-navy font-semibold">Seminer</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative bg-summit-navy text-white overflow-hidden" data-testid="seminer-hero">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-summit-navy via-summit-navy to-summit-navy-dark" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-amber-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 rounded-full px-3 py-1.5 mb-6">
              <Sparkles size={14} className="text-amber-300" />
              <span className="text-amber-300 text-[11px] uppercase tracking-[0.2em] font-bold">{settings.hero_overline}</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
              {titleStart}
              {titleEnd && <><br /><span className="text-amber-400">{titleEnd}</span></>}
            </h1>
            <h2 className="text-base sm:text-lg lg:text-xl text-white/85 mb-8 max-w-2xl leading-relaxed">
              {settings.hero_subtitle}
            </h2>

            <div className="flex flex-wrap gap-3 mb-8">
              <a href="#kategoriler"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-summit-navy font-bold px-6 py-3 rounded-md transition-colors"
                data-testid="seminer-hero-cta-categories">
                Seminer Kategorileri <ArrowRight size={15} />
              </a>
              <a href="#sss"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-md transition-colors">
                Sıkça Sorulanlar
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-md">
              <Stat icon={Layers} label="Kategori" value={cats.length || "4"} />
              <Stat icon={BookOpen} label="Seminer" value={courses.length || "—"} />
              <Stat icon={Users} label="Saha Uzmanı" value="10+" />
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-16 bg-summit-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">Neden Seminer?</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Sahadan Sınıfa, Kanıtlanmış Bilgi</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Award, t: "Saha Uzmanlığı", d: "Eğitmenlerimiz teorik değil, sahada milyonlarca TL'lik arsa işlemi yapmış kişilerdir." },
              { icon: Building2, t: "Güncel Mevzuat", d: "Tapu, imar ve hukuk seminerleri yürürlükteki en güncel mevzuata göre hazırlanır." },
              { icon: TrendingUp, t: "Pratik Vaka Analizi", d: "Gerçek arsa yatırım örnekleri, getiri hesapları ve risk analizleriyle öğrenirsiniz." },
              { icon: Globe, t: "Online + Yüz Yüze", d: "Türkiye'nin neresinde olursanız olun online erişim. İsteyenlere yüz yüze atölyeler." },
              { icon: BadgePercent, t: "Sertifikalı Seminerler", d: "Tamamlanan programlar sonunda Seminer katılım sertifikası verilir." },
              { icon: Users, t: "Uzman Ağı", d: "Seminer sonrası katılımcılar arası WhatsApp / LinkedIn networking grupları." },
            ].map((b, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center mb-3">
                  <b.icon size={18} className="text-amber-600" />
                </div>
                <h3 className="font-bold text-summit-navy text-base mb-1.5">{b.t}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="kategoriler" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">Seminer Kategorileri</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Hangi Alanda Seminere Katılmak İstersiniz?</h2>
          </div>

          {cats.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">Henüz kategori yayında değil.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {cats.map(c => {
                const Icon = ICON_MAP[c.icon] || GraduationCap;
                const courseCount = courses.filter(co => co.category_id === c.id).length;
                return (
                  <Link
                    key={c.id}
                    to={`/seminer/kategori/${c.slug}`}
                    className="group bg-white border border-gray-200 hover:border-amber-400 rounded-xl p-5 transition-all hover:shadow-md"
                    data-testid={`seminer-category-${c.slug}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon size={22} className="text-summit-navy" />
                    </div>
                    <h3 className="font-heading font-bold text-summit-navy text-lg mb-1.5 leading-tight">{c.name}</h3>
                    {c.description && <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-3">{c.description}</p>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{courseCount} seminer</span>
                      <ChevronRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* COURSES PREVIEW */}
      {courses.length > 0 && (
        <section className="py-16 bg-summit-paper border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <span className="section-overline">Yaklaşan Seminerler</span>
                <h2 className="gyoder-section-title">Açık Kayıt</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.slice(0, 6).map(c => <CourseCard key={c.id} course={c} cats={cats} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="sss" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">SSS</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <details key={i} className="group bg-summit-paper border border-gray-200 rounded-lg open:border-amber-300">
                <summary className="px-5 py-3.5 font-bold text-summit-navy text-sm cursor-pointer flex items-center justify-between gap-3 list-none">
                  <span>{f.q}</span>
                  <ChevronRight size={15} className="text-amber-500 transition-transform group-open:rotate-90 shrink-0" />
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-amber-300 text-[10px] uppercase tracking-wider font-bold mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className="font-bold text-white text-2xl sm:text-3xl tabular-nums">{value}</div>
    </div>
  );
}

function CourseCard({ course: c, cats }) {
  const cat = cats.find(x => x.id === c.category_id);
  const formatLabel = { online: "Online", onsite: "Yüz Yüze", hybrid: "Hibrit" }[c.format] || "Hibrit";
  return (
    <Link
      to={`/seminer/${c.slug}`}
      className="group bg-white border border-gray-200 hover:border-amber-400 rounded-xl overflow-hidden transition-all hover:shadow-md flex flex-col"
      data-testid={`seminer-${c.slug}`}
    >
      <div className="h-40 bg-gradient-to-br from-summit-navy to-summit-navy-dark relative overflow-hidden">
        {c.cover_image_url ? (
          <img src={c.cover_image_url} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap size={40} className="text-amber-400/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-summit-navy/90 text-amber-400 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">{formatLabel}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {cat && <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mb-1.5">{cat.name}</div>}
        <h3 className="font-heading font-bold text-summit-navy text-base leading-tight line-clamp-2 mb-2">{c.title}</h3>
        {c.description && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-3 flex-1">{c.description}</p>}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {c.is_free ? (
            <span className="text-xs font-bold text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Ücretsiz</span>
          ) : (
            <span className="text-sm font-bold text-summit-navy tabular-nums">₺{Number(c.price_try).toLocaleString("tr-TR")}</span>
          )}
          <ChevronRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
