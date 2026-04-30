import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  CheckCircle, User, Mail, Phone, Building2, Globe, Megaphone, Award, MessageSquare,
  Sparkles, TrendingUp, Users as UsersIcon, Mic, Target, Eye, Handshake, Calendar,
  MapPin, ArrowRight, Star, Quote, Crown, Trophy, Medal, Gem, Check, Zap, Rocket,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const applicationTypes = [
  { value: "konusmaci", label: "Konuşmacı", desc: "Bireysel oturum / sunum yapmak istiyorum", icon: Mic },
  { value: "panelist", label: "Panelist", desc: "Panel oturumuna katılmak istiyorum", icon: UsersIcon },
  { value: "sponsor", label: "Sponsor", desc: "Zirveye sponsor olmak istiyorum", icon: Crown },
];

const sponsorPackages = [
  { value: "ana", label: "Ana Sponsor" },
  { value: "altin", label: "Altın Sponsor" },
  { value: "gumus", label: "Gümüş Sponsor" },
  { value: "bronz", label: "Bronz Sponsor" },
  { value: "danisacagim", label: "Önce bilgi almak istiyorum" },
];

// === Real summit photos (existing customer assets) — only PURE PHOTOS, no text-overlay banners ===
const HERO_BG = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/04eetgap_17e1e87f-b677-4054-92cc-c1972d6d0dd5.jpeg";
const PHOTO_AUDIENCE_1 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/8bgxo9f8_34e45b4c-4905-428c-8be7-bb3fc0c4ed87.jpeg";
const PHOTO_AUDIENCE_2 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/ukxr6ozq_IMG_4962.jpeg";
const PHOTO_AUDIENCE_3 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/01rt3h3r_IMG_4927.jpeg";
const PHOTO_AUDIENCE_4 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/kzmv2bzx_IMG_4415.jpeg";
const PHOTO_AUDIENCE_5 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/i9qghti1_IMG_4414.jpeg";
const PHOTO_STAGE_1 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/e7ra3uom_IMG_4941.png";
const PHOTO_STAGE_2 = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/vj45pzl7_IMG_4926.png";
// Side-card hero (allowed even if has small projector text — used in card frame with own caption)
const HERO_SIDE_CARD = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/6ol0ek8g_Arsa%20Yat%C4%B1r%C4%B1m%20Zirvesi.jpeg";
const FAIR_BG = "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/tnzjqtb2_fuar%20alan%C4%B1.jpeg";

const PAST_GALLERY = [PHOTO_AUDIENCE_1, PHOTO_AUDIENCE_2, PHOTO_AUDIENCE_3, PHOTO_AUDIENCE_4, PHOTO_AUDIENCE_5, PHOTO_STAGE_1, PHOTO_STAGE_2];

// === Stats ===
const HEADLINE_STATS = [
  { value: "600+", label: "Üst Düzey Katılımcı", icon: UsersIcon },
  { value: "36", label: "Sektör Lideri Stant", icon: Building2 },
  { value: "20+", label: "Uzman Konuşmacı", icon: Mic },
  { value: "5.000+", label: "Hedef Ziyaretçi", icon: Eye },
];

// === Why Sponsor Benefits — use ONLY clean photos ===
const BENEFITS = [
  {
    icon: Eye,
    title: "Marka Görünürlüğü",
    desc: "Logo + tanıtım videolarınız sahne, fuar girişi, sosyal medya ve basın kanallarında 600+ profesyonele ulaşır.",
    image: PHOTO_AUDIENCE_1,
    badge: "Ortalama 50.000+ erişim",
  },
  {
    icon: Handshake,
    title: "Doğrudan Yatırımcı Buluşması",
    desc: "Karar mercii yatırımcılar, müteahhitler ve emlak danışmanlarıyla yüz yüze tanışın. Networking salonunda birebir görüşme imkânı.",
    image: PHOTO_AUDIENCE_3,
    badge: "%72 Karar mercii oranı",
  },
  {
    icon: Target,
    title: "Yüksek Kalite Lead",
    desc: "QR yaka kartlarıyla standınızı ziyaret eden tüm yatırımcıların kişi bilgileri size aktarılır. CRM uyumlu Excel raporu.",
    image: PHOTO_AUDIENCE_4,
    badge: "Ortalama 250+ lead/firma",
  },
  {
    icon: Megaphone,
    title: "Basın & Medya",
    desc: "Sektörel basın, dijital medya ve yatırım yayınları zirveyi takip ediyor. Sponsor markalar her haberde ön planda.",
    image: PHOTO_STAGE_1,
    badge: "12+ medya partneri",
  },
];

// === Sponsor Tiers — NO BACKGROUND IMAGES, just clean colored cards ===
const SPONSOR_TIERS = [
  {
    icon: Crown,
    label: "Ana Sponsor",
    bg: "bg-gradient-to-br from-summit-navy via-blue-900 to-summit-navy-dark",
    iconBg: "bg-summit-accent",
    iconColor: "text-summit-navy",
    perks: [
      "Sahnede açılış konuşması",
      "Tüm iletişim materyallerinde isim hakkı",
      "Premium Stant (24m²) — ana giriş konumu",
      "10 dakika tanıtım videosu sahnede",
      "Tüm katılımcı veri tabanı paylaşımı",
      "VIP yemek + özel networking",
    ],
    highlight: true,
    pkg: "ana",
  },
  {
    icon: Trophy,
    label: "Altın Sponsor",
    bg: "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600",
    iconBg: "bg-white",
    iconColor: "text-amber-600",
    perks: [
      "Panel oturumunda konuşma hakkı",
      "Logo: tüm dijital + basılı materyaller",
      "Stant (15m²) — fuar alanı",
      "5 dakika tanıtım videosu",
      "Katılımcı verisi (filtrelenmiş)",
      "VIP yemek davetiyesi",
    ],
    pkg: "altin",
  },
  {
    icon: Medal,
    label: "Gümüş Sponsor",
    bg: "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700",
    iconBg: "bg-white",
    iconColor: "text-slate-600",
    perks: [
      "Logo: tüm dijital materyaller",
      "Stant (9m²) — fuar alanı",
      "2 dakika tanıtım videosu",
      "Katılımcı listesi (ad-soyad-firma)",
      "Networking yemek davetiyesi",
    ],
    pkg: "gumus",
  },
  {
    icon: Gem,
    label: "Bronz Sponsor",
    bg: "bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700",
    iconBg: "bg-white",
    iconColor: "text-orange-600",
    perks: [
      "Logo: web sitesi + sahne arkası",
      "Mini Stant (6m²)",
      "Sosyal medya tanıtım postu",
      "5 kişilik konferans katılımı",
    ],
    pkg: "bronz",
  },
];

// === Testimonials ===
const TESTIMONIALS = [
  {
    quote: "Geçen yılki zirvede edindiğimiz bağlantılar yıllık satış hedefimizin %40'ını karşıladı. Bu yıl Ana Sponsor olmamamız mümkün değildi.",
    name: "Mehmet K.",
    role: "Yönetim Kurulu Başkanı, Konut Yatırım A.Ş.",
  },
  {
    quote: "Sahnede 8 dakikalık konuşmamız sonrasında 47 yeni potansiyel yatırımcı bizi aradı. Yatırımın geri dönüşü inanılmazdı.",
    name: "Ayşe D.",
    role: "Pazarlama Direktörü, Premium Real Estate",
  },
  {
    quote: "Standımıza gelen ziyaretçilerin %72'si gerçekten karar mercii kişilerdi. Hiçbir fuarda bu kadar kaliteli bir izleyici görmedik.",
    name: "Tolga A.",
    role: "Genel Müdür, Marina Project",
  },
];

const COUNTDOWN_TARGET = new Date("2026-05-20T09:00:00+03:00").getTime();

function useCountdown() {
  const [diff, setDiff] = useState(COUNTDOWN_TARGET - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(COUNTDOWN_TARGET - Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return { days };
}

export default function SpeakerApplicationPage() {
  const [form, setForm] = useState({
    application_type: "sponsor",
    name: "", email: "", phone: "", company: "", expertise: "",
    topic: "", bio: "", sponsor_package: "", linkedin: "", website: "", additional_notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const countdown = useCountdown();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register/speaker-application`, form);
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = (typeOverride, packageOverride) => {
    if (typeOverride) setForm(f => ({ ...f, application_type: typeOverride }));
    if (packageOverride) setForm(f => ({ ...f, sponsor_package: packageOverride }));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  if (result) {
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-32 pb-24 px-4">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg">
            <div className="w-16 h-16 bg-summit-navy/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-navy" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl">Başvurunuz Alındı!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">{result.message}</p>
            <p className="text-gray-500 text-xs mt-4">
              Sponsor & konuşmacı ekibimiz <strong>en geç 48 saat içinde</strong> sizinle iletişime geçecektir.
            </p>
            <a href="/" className="btn-navy px-8 py-3 mt-6 inline-block" data-testid="back-home-btn">Ana Sayfaya Dön</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy transition-colors";
  const labelCls = "text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold";
  const isSponsor = form.application_type === "sponsor";
  const isSpeaker = form.application_type === "konusmaci";

  return (
    <div className="bg-white min-h-screen font-body" data-testid="speaker-app-page">
      <Navbar />

      {/* ============ HERO ============ */}
      <section className="relative min-h-[78vh] flex items-center overflow-hidden">
        {/* BG IMAGE */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
          aria-hidden="true"
        />
        {/* OVERLAY */}
        <div className="absolute inset-0 bg-summit-navy/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-summit-navy/95 via-summit-navy/70 to-summit-navy/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-summit-navy/70 via-transparent to-summit-navy/20" />
        {/* DOTS PATTERN */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full">
          <div className="lg:col-span-8 text-white">
            <div className="inline-flex items-center gap-2 bg-summit-accent/20 backdrop-blur-sm border border-summit-accent/40 px-3 py-1.5 rounded-full mb-6"
              data-testid="hero-badge">
              <Sparkles size={14} className="text-summit-accent" />
              <span className="text-summit-accent text-[0.7rem] font-bold uppercase tracking-[0.2em]">
                Sponsor & Konuşmacı Başvuruları Açıldı
              </span>
            </div>
            <h1 className="font-heading text-white text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.1] mb-6 drop-shadow-lg">
              Türkiye'nin <span className="text-summit-accent">En Prestijli</span>
              <br />Arsa Yatırım Zirvesinde
              <br /><span className="italic font-light text-white/95">yer alın.</span>
            </h1>
            <p className="text-white/85 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
              600+ üst düzey yatırımcı, 36 sektör liderini buluşturan zirvede markanızı en doğru hedef kitleye ulaştırın.
              Sahnede konuşun, panel ağırlayın ya da ana sponsor olarak öne çıkın.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => scrollToForm("sponsor")}
                className="bg-summit-accent text-summit-navy hover:bg-yellow-400 px-7 py-3.5 rounded-md inline-flex items-center gap-2 text-sm font-bold shadow-lg hover:shadow-2xl transition-all hover:-translate-y-0.5"
                data-testid="hero-cta-sponsor"
              >
                <Crown size={16} /> Sponsor Ol
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollToForm("konusmaci")}
                className="bg-white/10 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-md inline-flex items-center gap-2 text-sm font-semibold hover:bg-white/20 transition-colors"
                data-testid="hero-cta-speaker"
              >
                <Mic size={16} /> Konuşmacı Olarak Başvur
              </button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-white/85 text-sm">
              <span className="inline-flex items-center gap-2"><Calendar size={14} className="text-summit-accent" /> 21 Mayıs 2026, Perşembe</span>
              <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-summit-accent" /> Hilton İstanbul Bosphorus</span>
              {countdown && (
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Zap size={14} className="text-summit-accent" /> {countdown.days} gün kaldı
                </span>
              )}
            </div>
          </div>

          {/* SIDE CARD */}
          <div className="lg:col-span-4 hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="aspect-[4/5] rounded-lg overflow-hidden mb-5 relative">
                <img src={HERO_SIDE_CARD} alt="Arsa Yatırım Zirvesi sahne görüntüsü" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-summit-navy/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[0.65rem] uppercase tracking-widest text-summit-accent font-bold">2025 Zirvesi</p>
                  <p className="text-sm font-semibold mt-0.5">Ana Salon · Tam Kapasite</p>
                </div>
              </div>
              <p className="text-white/80 text-xs leading-relaxed text-center">
                Geçen yıl <strong className="text-summit-accent">587 kişi</strong> ana salonu doldurdu.<br />
                Bu yıl <strong className="text-summit-accent">600 kişilik</strong> kontenjan koyuyoruz.
              </p>
            </div>
          </div>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="bg-summit-navy py-12 border-y-4 border-summit-accent" data-testid="stats-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {HEADLINE_STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="text-center text-white group cursor-default">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-summit-accent/20 flex items-center justify-center group-hover:bg-summit-accent group-hover:scale-110 transition-all">
                    <Icon size={24} className="text-summit-accent group-hover:text-summit-navy" />
                  </div>
                  <div className="font-heading text-3xl sm:text-4xl font-bold text-summit-accent">{s.value}</div>
                  <div className="text-white/70 text-xs uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ WHY APPLY ============ */}
      <section className="py-20 bg-white" data-testid="benefits-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="section-overline">Neden Yer Almalısınız?</span>
            <h2 className="font-heading text-summit-navy text-3xl sm:text-4xl mt-3">
              Bu sadece bir konferans değil — <span className="italic text-summit-accent">yatırım fırsatıdır.</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 leading-relaxed">
              Geçen yıl sponsor olan firmaların <strong>%92'si</strong> bu yıl tekrar başvurdu. Sebebini aşağıda görün.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  data-testid={`benefit-card-${i}`}
                >
                  <div className="relative h-48 overflow-hidden bg-summit-navy">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-summit-navy via-summit-navy/60 to-summit-navy/40" />
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-summit-accent flex items-center justify-center shadow-lg ring-2 ring-white/30">
                      <Icon size={22} className="text-summit-navy" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="inline-flex items-center gap-1.5 text-summit-navy text-[0.7rem] font-bold uppercase tracking-wider bg-summit-accent px-3 py-1.5 rounded shadow-md">
                        <TrendingUp size={12} /> {b.badge}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-summit-navy text-xl mb-2">{b.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PAST EVENT GALLERY ============ */}
      <section className="py-20 bg-summit-paper relative overflow-hidden" data-testid="gallery-section">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-summit-accent/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-summit-navy/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-12">
            <div className="lg:col-span-5">
              <span className="section-overline">2025 Zirvesinden</span>
              <h2 className="font-heading text-summit-navy text-3xl sm:text-4xl mt-3 leading-tight">
                Geçen yıl 587 kişi <span className="text-summit-accent italic">ana salonu</span> doldurdu.
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mt-4 leading-relaxed">
                Sahnede sektör liderleri konuştu, fuar alanında 30+ proje sergilendi, lobi koridorlarında sayısız iş görüşmesi yapıldı.
                Bu yıl daha büyük bir kapasiteyle, aynı kalitede.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-md text-sm text-summit-navy shadow-sm">
                  <Star size={14} className="text-summit-accent fill-summit-accent" /> 4.9 / 5 katılımcı puanı
                </span>
                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-md text-sm text-summit-navy shadow-sm">
                  <UsersIcon size={14} className="text-summit-navy" /> %92 sponsor tekrar oranı
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-3 gap-3">
              {PAST_GALLERY.slice(0, 6).map((img, i) => (
                <div key={i}
                  className={`group relative overflow-hidden rounded-lg shadow-md ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
                  <img src={img} alt={`Zirve fotoğrafı ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-summit-navy/0 group-hover:bg-summit-navy/30 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[PHOTO_STAGE_2, PHOTO_AUDIENCE_5, PHOTO_AUDIENCE_2, PHOTO_AUDIENCE_4].map((img, i) => (
              <div key={i} className="group relative aspect-[4/3] rounded-lg overflow-hidden shadow-md">
                <img src={img} alt={`Zirve görsel ${i + 7}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-summit-navy/0 group-hover:bg-summit-navy/30 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SPONSOR TIERS ============ */}
      <section className="py-20 bg-white" data-testid="sponsor-tiers-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="section-overline">Sponsor Paketleri</span>
            <h2 className="font-heading text-summit-navy text-3xl sm:text-4xl mt-3">
              Her bütçeye uygun, her vizyona <span className="italic text-summit-accent">özel paket.</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 leading-relaxed">
              4 farklı sponsor paketi. Tüm paketlerde fuar standı + dijital görünürlük dahildir.
              Detaylı fiyatlandırma için ekibimizle görüşün.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {SPONSOR_TIERS.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i}
                  className={`relative group rounded-2xl overflow-hidden flex flex-col bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl
                    ${t.highlight
                      ? "ring-2 ring-summit-accent shadow-2xl lg:scale-[1.04]"
                      : "ring-1 ring-gray-200 shadow-md"}`}
                  data-testid={`sponsor-tier-${t.label.toLowerCase().replace(" ", "-")}`}
                >
                  {t.highlight && (
                    <div className="absolute top-0 left-0 right-0 bg-summit-accent text-summit-navy text-[0.65rem] font-bold uppercase tracking-[0.2em] text-center py-1.5 z-10 shadow-md">
                      ★ EN POPÜLER ★
                    </div>
                  )}

                  {/* Colored Header */}
                  <div className={`relative ${t.bg} ${t.highlight ? "pt-12 pb-7" : "py-7"} px-5 text-center`}>
                    {/* subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-10"
                      style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                    <div className={`relative w-16 h-16 mx-auto rounded-xl ${t.iconBg} flex items-center justify-center shadow-lg ring-4 ring-white/20`}>
                      <Icon size={28} className={t.iconColor} strokeWidth={2.2} />
                    </div>
                    <h3 className="relative font-heading text-white text-xl font-bold mt-4 drop-shadow-md">{t.label}</h3>
                    <p className="relative text-white/85 text-[0.68rem] uppercase tracking-[0.18em] mt-1.5 font-semibold">
                      {t.highlight ? "Premium Paket" : "Standart Paket"}
                    </p>
                  </div>

                  {/* Perks */}
                  <div className="flex-1 p-5 flex flex-col">
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {t.perks.map((p, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                          <Check size={13} className="text-summit-accent mt-0.5 shrink-0" strokeWidth={3} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => scrollToForm("sponsor", t.pkg)}
                      className={`w-full py-3 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all
                        ${t.highlight
                          ? "bg-summit-accent text-summit-navy hover:bg-yellow-400 shadow-md hover:shadow-lg"
                          : "bg-summit-navy text-white hover:bg-summit-navy-dark"
                        }`}
                      data-testid={`sponsor-cta-${i}`}
                    >
                      Bu Paketi Seç <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-gray-500 text-xs mt-8">
            Tüm paketler özelleştirilebilir. Standart dışı talepleriniz için ekibimizle görüşebilirsiniz.
          </p>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 bg-summit-navy relative overflow-hidden" data-testid="testimonials-section">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${PHOTO_AUDIENCE_3})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-summit-navy/85" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-summit-navy via-summit-navy/80 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Quote size={40} className="text-summit-accent mx-auto mb-4 opacity-50" />
            <h2 className="font-heading text-white text-3xl sm:text-4xl">
              Geçen yıl sponsor olanlar <span className="italic text-summit-accent">ne diyor?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className="bg-white/5 backdrop-blur-md border border-white/15 rounded-xl p-6 hover:border-summit-accent/40 transition-colors"
                data-testid={`testimonial-${i}`}
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, k) => (
                    <Star key={k} size={14} className="text-summit-accent fill-summit-accent" />
                  ))}
                </div>
                <p className="text-white/90 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="pt-4 border-t border-white/15">
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-white/60 text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ APPLICATION FORM ============ */}
      <section ref={formRef} className="py-20 bg-summit-paper relative" data-testid="application-form-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Rocket size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Hemen Başvur</span>
            </div>
            <h2 className="font-heading text-summit-navy text-3xl sm:text-4xl">
              Yerinizi <span className="italic text-summit-accent">şimdi</span> ayırtın
            </h2>
            <p className="text-gray-600 mt-4 text-sm sm:text-base max-w-xl mx-auto">
              Formu doldurun, ekibimiz <strong>48 saat içinde</strong> sizinle iletişime geçerek detayları paylaşacak.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="speaker-app-form">

              {/* Application Type */}
              <div>
                <label className={labelCls}>Başvuru Tipi *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {applicationTypes.map((t) => {
                    const Icon = t.icon;
                    const active = form.application_type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({...form, application_type: t.value})}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          active
                            ? "border-summit-accent bg-summit-accent/10 shadow-md"
                            : "border-gray-200 hover:border-summit-navy/40 bg-white"
                        }`}
                        data-testid={`type-${t.value}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${active ? "bg-summit-accent text-summit-navy" : "bg-gray-100 text-summit-navy"}`}>
                            <Icon size={16} />
                          </div>
                          <div className="font-heading text-summit-navy text-sm font-semibold">{t.label}</div>
                        </div>
                        <div className="text-gray-500 text-xs leading-relaxed">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 pb-2 border-t border-gray-100">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Kişi / Firma Bilgileri</h3>
                <p className="text-xs text-gray-500">İletişim bilgilerinizi girin — ekibimiz 48 saat içinde dönüş yapacak</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Ad Soyad / Firma *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder={isSponsor ? "Firma Adı" : "Ad Soyad"} value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className={inputCls} data-testid="input-sp-name" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{isSponsor ? "Yetkili E-posta" : "E-posta"} *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" required placeholder="ornek@email.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className={inputCls} data-testid="input-sp-email" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefon *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" required placeholder="+90 5XX XXX XXXX" value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className={inputCls} data-testid="input-sp-phone" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{isSponsor ? "Sektör" : "Şirket / Kurum"}</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder={isSponsor ? "Sektör" : "Şirket adı"} value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      className={inputCls} data-testid="input-sp-company" />
                  </div>
                </div>
              </div>

              {!isSponsor && (
                <>
                  <div className="pt-4 pb-2 border-t border-gray-100">
                    <h3 className="font-heading text-summit-navy text-lg mb-1">Uzmanlık Bilgileri</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Uzmanlık Alanı</label>
                      <div className="relative">
                        <Award size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" placeholder="Gayrimenkul Hukuku / Yatırım vb." value={form.expertise}
                          onChange={e => setForm({...form, expertise: e.target.value})}
                          className={inputCls} data-testid="input-sp-expertise" />
                      </div>
                    </div>
                    {isSpeaker && (
                      <div>
                        <label className={labelCls}>Konu Başlığı</label>
                        <div className="relative">
                          <MessageSquare size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="text" placeholder="Sunum konunuzun başlığı" value={form.topic}
                            onChange={e => setForm({...form, topic: e.target.value})}
                            className={inputCls} data-testid="input-sp-topic" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Kısa Bio / CV</label>
                    <textarea rows={4} placeholder="Mesleki geçmişiniz ve zirveye katkınız hakkında kısa bilgi..."
                      value={form.bio}
                      onChange={e => setForm({...form, bio: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy resize-none"
                      data-testid="input-sp-bio" />
                  </div>
                </>
              )}

              {isSponsor && (
                <>
                  <div className="pt-4 pb-2 border-t border-gray-100">
                    <h3 className="font-heading text-summit-navy text-lg mb-1">Sponsorluk Bilgileri</h3>
                  </div>
                  <div>
                    <label className={labelCls}>İlgilendiğiniz Sponsor Paketi</label>
                    <select value={form.sponsor_package}
                      onChange={e => setForm({...form, sponsor_package: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                      data-testid="input-sp-package">
                      <option value="">Seçiniz</option>
                      {sponsorPackages.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Paket fiyatlandırması için ekibimiz sizinle iletişime geçecektir.</p>
                  </div>
                </>
              )}

              <div className="pt-4 pb-2 border-t border-gray-100">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Ek Bilgiler</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>LinkedIn</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin}
                      onChange={e => setForm({...form, linkedin: e.target.value})}
                      className={inputCls} data-testid="input-sp-linkedin" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Web Sitesi</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="url" placeholder="https://www..." value={form.website}
                      onChange={e => setForm({...form, website: e.target.value})}
                      className={inputCls} data-testid="input-sp-website" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Eklemek İstediğiniz Notlar</label>
                <textarea rows={3} placeholder="Ek notlarınız varsa buraya yazabilirsiniz..."
                  value={form.additional_notes}
                  onChange={e => setForm({...form, additional_notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy resize-none"
                  data-testid="input-sp-notes" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="sp-error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-navy py-4 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                data-testid="submit-sp-btn">
                {loading ? "Başvuru Gönderiliyor..." : (
                  <>Başvuruyu Gönder <ArrowRight size={16} /></>
                )}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Başvurunuz değerlendirildikten sonra ekibimiz <strong>48 saat içinde</strong> sizinle iletişime geçecektir.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative py-16 overflow-hidden" data-testid="final-cta">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FAIR_BG})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-summit-navy/90" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="font-heading text-3xl sm:text-4xl mb-4">
            Sınırlı kontenjan. <span className="text-summit-accent italic">Hemen yerinizi ayırtın.</span>
          </h2>
          <p className="text-white/85 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            36 stant ve 4 ana sponsorluk paketi mevcut. Geçen yıl 12 firma "keşke daha erken başvursaydık" dedi.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => scrollToForm("sponsor")}
              className="bg-summit-accent text-summit-navy hover:bg-yellow-400 px-7 py-3.5 rounded-md inline-flex items-center gap-2 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5"
              data-testid="final-cta-sponsor"
            >
              <Crown size={16} /> Sponsor Olarak Başvur <ArrowRight size={16} />
            </button>
            <a
              href="tel:+902120000000"
              className="bg-white/10 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-md inline-flex items-center gap-2 text-sm font-semibold hover:bg-white/20 transition-colors"
              data-testid="final-cta-phone"
            >
              <Phone size={16} /> Bizi Hemen Arayın
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
