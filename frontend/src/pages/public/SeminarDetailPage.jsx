import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  MapPin, Calendar, Clock, ArrowRight, Users, CheckCircle2,
  GraduationCap, ChevronRight, Building2, ArrowLeft, Sparkles,
  Linkedin, Instagram, Twitter,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

const SITE = "https://arsayatirimzirvesi.com";
const FORMAT_LABEL = { online: "Online", onsite: "Yüz Yüze", hybrid: "Hibrit" };

export default function SeminarDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/academy/courses/${slug}`),
      axios.get(`${API}/academy/categories`),
    ])
      .then(([c, cs]) => {
        if (!mounted) return;
        setCourse(c.data);
        setCats(cs.data || []);
      })
      .catch(e => mounted && setErr(e?.response?.data?.detail || "Seminer bulunamadı"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-summit-navy flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (err || !course) {
    return (
      <div className="min-h-screen bg-summit-paper">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-3xl text-summit-navy font-bold mb-3">Seminer Bulunamadı</h1>
          <p className="text-gray-600 mb-6">{err || "Aradığınız seminer mevcut değil veya yayından kaldırılmış."}</p>
          <button onClick={() => navigate("/seminer")} className="btn-navy">Tüm Seminerler</button>
        </div>
        <Footer />
      </div>
    );
  }

  const cat = cats.find(x => x.id === course.category_id);
  const canonical = `${SITE}/seminer/${course.slug}`;
  const formatLabel = FORMAT_LABEL[course.format] || "Hibrit";
  const moderators = (course.speakers || []).filter(s => s.is_moderator);
  const speakers = (course.speakers || []).filter(s => !s.is_moderator);

  const seoTitle = course.seo_title || `${course.title} | Arsa Yatırım Semineri`;
  const seoDesc = course.seo_description || course.description || `${course.title} — saha uzmanlarından arsa yatırım semineri.`;
  const seoKeywords = course.seo_keywords || "";

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": seoDesc,
    "provider": {
      "@type": "Organization",
      "name": "Arsa Yatırım Semineri",
      "sameAs": `${SITE}/seminer`,
    },
    ...(course.cover_image_url && { "image": course.cover_image_url }),
    ...(course.start_date && {
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "startDate": course.start_date,
        ...(course.end_date && { "endDate": course.end_date }),
        "courseMode": course.format === "online" ? "online" : course.format === "onsite" ? "onsite" : "blended",
        ...(course.location && { "location": { "@type": "Place", "name": course.location } }),
      }
    }),
    ...(!course.is_free && course.price_try > 0 && {
      "offers": {
        "@type": "Offer",
        "price": course.price_try,
        "priceCurrency": "TRY",
        "category": "Paid",
      },
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": SITE },
      { "@type": "ListItem", "position": 2, "name": "Seminer", "item": `${SITE}/seminer` },
      ...(cat ? [{ "@type": "ListItem", "position": 3, "name": cat.name, "item": `${SITE}/seminer/kategori/${cat.slug}` }] : []),
      { "@type": "ListItem", "position": cat ? 4 : 3, "name": course.title, "item": canonical },
    ],
  };

  return (
    <div className="min-h-screen bg-white" data-testid="seminer-detail-page">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonical} />
        {course.cover_image_url && <meta property="og:image" content={course.cover_image_url} />}
        <script type="application/ld+json">{JSON.stringify(courseLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <Navbar />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-200 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-500 flex flex-wrap gap-2 items-center">
          <Link to="/" className="hover:text-summit-navy">Ana Sayfa</Link>
          <span className="text-gray-300">/</span>
          <Link to="/seminer" className="hover:text-summit-navy">Seminer</Link>
          {cat && (<>
            <span className="text-gray-300">/</span>
            <span className="hover:text-summit-navy">{cat.name}</span>
          </>)}
          <span className="text-gray-300">/</span>
          <span className="text-summit-navy font-semibold truncate">{course.title}</span>
        </div>
      </nav>

      {/* HERO with Countdown */}
      <section className="relative bg-summit-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-summit-navy via-summit-navy to-summit-navy-dark" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-amber-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              {cat && (
                <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 rounded-full px-3 py-1.5 mb-5">
                  <Sparkles size={13} className="text-amber-300" />
                  <span className="text-amber-300 text-[11px] uppercase tracking-[0.2em] font-bold">{cat.name}</span>
                </div>
              )}
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-base text-white/85 mb-6 leading-relaxed">{course.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                <Chip icon={Building2} label={formatLabel} />
                {course.start_date && <Chip icon={Calendar} label={fmtDate(course.start_date)} />}
                {course.duration_hours && <Chip icon={Clock} label={`${course.duration_hours} saat`} />}
                {(course.location || course.venue) && <Chip icon={MapPin} label={[course.venue, course.location].filter(Boolean).join(" · ")} />}
                {course.capacity && <Chip icon={Users} label={`${course.capacity} kişilik`} />}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/seminer-kaydi?slug=${encodeURIComponent(course.slug || slug || "")}&title=${encodeURIComponent(course.title || "")}`}
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-summit-navy font-bold px-6 py-3 rounded-md transition-colors"
                  data-testid="seminar-detail-register-btn"
                >
                  Kayıt Ol <ArrowRight size={15} />
                </Link>
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-3 rounded-md">
                  <ArrowLeft size={14} /> Geri
                </button>
              </div>
            </div>

            {/* Countdown */}
            <CountdownCard target={course.start_date} priceFree={course.is_free} price={course.price_try} />
          </div>
        </div>
      </section>

      {/* SPEAKERS */}
      {(moderators.length > 0 || speakers.length > 0) && (
        <section className="py-12 sm:py-16 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Seminerin Uzmanları</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Konuşmacılar & Eğitmenler</h2>
            </div>

            {moderators.length > 0 && (
              <div className="flex justify-center mb-8 sm:mb-10">
                <div className="w-full max-w-sm">
                  {moderators.map((sp, i) => <SpeakerCard key={i} sp={sp} featured />)}
                </div>
              </div>
            )}
            {speakers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {speakers.map((sp, i) => <SpeakerCard key={i} sp={sp} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* REGISTRATION CTA */}
      <section id="kayit" className="py-12 sm:py-16 bg-summit-paper border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl text-summit-navy font-bold mb-3">Yerinizi Şimdiden Ayırtın</h2>
          <p className="text-gray-600 mb-6">{course.is_free ? "Bu seminer ücretsizdir — kayıt zorunludur." : `Katılım ücreti: ₺${Number(course.price_try).toLocaleString("tr-TR")}`}</p>
          <Link
            to={`/seminer-kaydi?slug=${encodeURIComponent(course.slug || slug || "")}&title=${encodeURIComponent(course.title || "")}`}
            className="btn-accent px-8 py-3.5 inline-flex items-center gap-2"
            data-testid="seminar-detail-register-cta"
          >
            Seminere Kaydol <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Chip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-md px-3 py-1.5 text-xs text-white">
      <Icon size={12} className="text-amber-300" /> {label}
    </span>
  );
}

function CountdownCard({ target, priceFree, price }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, started: false });

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0, started: true }); return; }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        started: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="bg-white text-summit-navy rounded-2xl p-6 shadow-2xl border-2 border-emerald-200 relative">
      <div className="absolute -top-1 left-6 right-6 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full" />
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Seminer Geri Sayım
        </span>
        <Calendar size={16} className="text-emerald-500" />
      </div>
      <h3 className="font-heading text-xl font-bold mb-5 text-emerald-900">{target ? "Seminere Kalan Süre" : "Tarih Yakında"}</h3>

      {!target ? (
        <p className="text-sm text-gray-500 py-4">Tarih belirlendiğinde geri sayım burada görünür.</p>
      ) : t.started ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-full text-sm">
            <CheckCircle2 size={14} /> Seminer Başladı
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[["d","Gün"],["h","Saat"],["m","Dk"],["s","Sn"]].map(([k,l]) => (
            <div key={k} className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg py-3 text-center">
              <div className="font-heading text-2xl sm:text-3xl text-emerald-800 font-bold tabular-nums leading-none">{String(t[k]).padStart(2, "0")}</div>
              <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold mt-1">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-emerald-100 pt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Katılım</div>
          {priceFree
            ? <div className="font-bold text-emerald-600 text-sm">Ücretsiz</div>
            : <div className="font-bold text-summit-navy text-base tabular-nums">₺{Number(price).toLocaleString("tr-TR")}</div>}
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Kayıt</div>
          <div className="font-bold text-emerald-700 text-sm inline-flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Açık</div>
        </div>
      </div>
    </div>
  );
}

function SpeakerCard({ sp, featured = false }) {
  return (
    <div className="bg-white border border-amber-300 overflow-hidden shadow-sm rounded-md flex flex-col">
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy text-[10px] uppercase tracking-[0.22em] font-bold py-1.5 text-center px-2">
        {sp.is_moderator ? "Moderatör" : (sp.title || "Konuşmacı")}
      </div>
      <div className={`${featured ? "h-80" : "h-72"} bg-cover`} style={{
        backgroundImage: sp.image_url ? `url(${sp.image_url})` : "linear-gradient(135deg, #22316a, #1A264F)",
        backgroundPosition: sp.image_position || 'center 20%',
      }} />
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="font-heading text-summit-navy text-lg leading-tight">{sp.name}</h4>
        {sp.title && <p className="text-summit-navy text-xs mt-1.5 font-semibold uppercase tracking-wide">{sp.title}</p>}
        {sp.bio && <p className="text-gray-600 text-xs mt-3 leading-relaxed flex-1">{sp.bio}</p>}
        {(sp.social_linkedin || sp.social_instagram || sp.social_twitter) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            {sp.social_linkedin && (
              <a href={sp.social_linkedin} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy">
                <Linkedin size={14} />
              </a>
            )}
            {sp.social_instagram && (
              <a href={sp.social_instagram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy">
                <Instagram size={14} />
              </a>
            )}
            {sp.social_twitter && (
              <a href={sp.social_twitter} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy">
                <Twitter size={14} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}
