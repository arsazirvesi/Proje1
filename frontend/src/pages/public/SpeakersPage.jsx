import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  Linkedin, Instagram, Twitter, Mic, Users, TrendingUp, Award, ArrowRight, Sparkles,
  CheckCircle2, Megaphone, Target, BadgeCheck
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState([]);

  useEffect(() => {
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data)).catch(() => {});
  }, []);

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      {/* Header */}
      <div className="pt-32 pb-12 text-center bg-gradient-to-b from-summit-paper to-transparent">
        <span className="section-overline section-overline-center">Zirve 2026</span>
        <h1 className="font-heading text-summit-navy text-4xl sm:text-5xl">Konuşmacılar</h1>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto px-4 text-sm sm:text-base">
          Arsa yatırımı, gayrimenkul hukuku ve yatırım danışmanlığı alanlarında derin uzmanlığa sahip konuşmacılarımızla tanışın.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {(() => {
          const isModerator = (s) => /moderat[oö]r|sunucu/i.test(s.title || "");
          const moderators = speakers.filter(isModerator);
          const regulars = speakers.filter((s) => !isModerator(s));
          return (
            <>
              {/* Top row — Moderator (1 person, centered, slightly larger) */}
              {moderators.length > 0 && (
                <div className="flex justify-center mb-8 sm:mb-10">
                  <div className="w-full max-w-sm">
                    {moderators.map((sp) => (
                      <SpeakerCard key={sp.id} sp={sp} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom row — Speakers (4 across on desktop) */}
              {regulars.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {regulars.map((sp) => (
                    <SpeakerCard key={sp.id} sp={sp} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* SPEAKER / SPONSOR APPLICATION CTA */}
      <SpeakerApplyCTA />

      <Footer />
    </div>
  );
}

function SpeakerCard({ sp, featured = false }) {
  return (
    <div
      className="bg-white border border-amber-300 rounded-md overflow-hidden card-hover flex flex-col shadow-sm"
      data-testid={`speaker-card-${sp.id}`}
    >
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy text-[10px] uppercase tracking-[0.22em] font-bold py-1.5 text-center px-2">
        {sp.title || "Konuşmacı"}
      </div>
      <div
        className={`${featured ? "h-80" : "h-72"} bg-cover`}
        style={{
          backgroundImage: `url(${sp.image_url})`,
          backgroundPosition: sp.image_position || "center 20%",
        }}
      />
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-heading text-summit-navy text-lg leading-tight">{sp.name}</h3>
        <p className="text-summit-navy text-xs mt-1.5 font-semibold uppercase tracking-wide">{sp.title}</p>
        <p className="text-gray-600 text-xs mt-3 leading-relaxed flex-1">{sp.bio}</p>
        {(sp.social_linkedin || sp.social_instagram || sp.social_twitter) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <SpeakerSocialLinks sp={sp} />
          </div>
        )}
      </div>
    </div>
  );
}

function SpeakerSocialLinks({ sp }) {
  const cls = "w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy hover:border-summit-navy/40 transition-colors";
  return (
    <>
      {sp.social_linkedin && (
        <a href={sp.social_linkedin} target="_blank" rel="noopener noreferrer" className={cls} aria-label="LinkedIn">
          <Linkedin size={14} />
        </a>
      )}
      {sp.social_instagram && (
        <a href={sp.social_instagram} target="_blank" rel="noopener noreferrer" className={cls} aria-label="Instagram">
          <Instagram size={14} />
        </a>
      )}
      {sp.social_twitter && (
        <a href={sp.social_twitter} target="_blank" rel="noopener noreferrer" className={cls} aria-label="Twitter / X">
          <Twitter size={14} />
        </a>
      )}
    </>
  );
}

function SpeakerApplyCTA() {
  return (
    <section className="relative bg-summit-navy text-white py-20 sm:py-24 overflow-hidden mt-12" data-testid="speaker-apply-cta">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 backdrop-blur-sm border border-amber-400/40 rounded-full px-4 py-1.5 mb-5">
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-xs tracking-wider uppercase font-bold text-amber-100">Konuşmacı & Sponsor Başvurusu</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Sahnede Yerinizi Alın<br/>
            <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
              Sektörün Önde Gelen Yatırımcılarıyla Buluşun
            </span>
          </h2>
          <p className="text-white/75 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Türkiye'nin en kapsamlı arsa yatırımı buluşmasında uzmanlığınızı paylaşın,
            markanızı 600+ yatırımcının dikkatine sunun. Konuşmacı veya sponsor olarak başvurun.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <BenefitCard icon={Users} title="600+ Yatırımcı" desc="Birikim sahibi karar alıcılarla doğrudan iletişim" />
          <BenefitCard icon={Megaphone} title="Marka Görünürlüğü" desc="Sosyal medya, basın ve etkinlik materyallerinde tanıtım" />
          <BenefitCard icon={Target} title="Hedef Kitle" desc="Gayrimenkul + arsa yatırımcıları, müteahhitler, hukuk uzmanları" />
          <BenefitCard icon={TrendingUp} title="Kalıcı Ağ" desc="Yıllar sürecek profesyonel ilişkiler kurun" />
        </div>

        {/* Two CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <ApplyTile
            tone="speaker"
            icon={Mic}
            badge="Konuşmacı"
            title="Sahnede Konuşun"
            description="Uzmanlığınızı 600+ yatırımcıya anlatın. Konuşmacı profili site ve sosyal medyada öne çıkar."
            bullets={["20-30 dakikalık sunum hakkı", "Profesyonel fotoğraf + biyografi sayfası", "Etkinlik sonrası video kayıt + paylaşım"]}
          />
          <ApplyTile
            tone="sponsor"
            icon={Award}
            badge="Sponsor"
            title="Marka Sponsoru Olun"
            description="Ana sponsor, premium, fuar standı vb. paketlerle markanızı zirveye taşıyın."
            bullets={["Stant alanı + bayrak + roll-up", "Tüm materyallerde logo yer alır", "Yaka kartlarında sponsor logosu"]}
          />
        </div>

        {/* Big CTA button */}
        <div className="text-center">
          <Link
            to="/konusmaci-basvuru"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-summit-navy rounded-xl px-7 py-4 text-base font-bold transition-all shadow-2xl shadow-amber-500/30 hover:scale-105"
            data-testid="speaker-cta-apply-btn"
          >
            <BadgeCheck size={18} /> Hemen Başvuru Yap <ArrowRight size={16} />
          </Link>
          <p className="text-white/50 text-xs mt-3">Başvurular 7 gün içinde değerlendirilir · Ücretsiz başvuru</p>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-4 hover:border-amber-400/40 transition-all">
      <div className="w-10 h-10 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-3">
        <Icon size={18} className="text-amber-300" />
      </div>
      <div className="font-heading font-bold text-white text-base mb-1">{title}</div>
      <div className="text-xs text-white/65 leading-relaxed">{desc}</div>
    </div>
  );
}

function ApplyTile({ tone, icon: Icon, badge, title, description, bullets }) {
  const isSpeaker = tone === "speaker";
  const accent = isSpeaker
    ? { grad: "from-blue-400/15 via-white/5 to-blue-500/10", border: "border-blue-300/30", text: "text-blue-200", iconBg: "from-blue-400 to-blue-600" }
    : { grad: "from-amber-400/20 via-white/5 to-amber-500/10", border: "border-amber-300/40", text: "text-amber-200", iconBg: "from-amber-400 to-amber-600" };
  return (
    <div className={`bg-gradient-to-br ${accent.grad} border-2 ${accent.border} rounded-2xl p-6 hover:scale-[1.015] transition-transform`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accent.iconBg} flex items-center justify-center shrink-0 shadow-xl`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <div className={`text-[10px] uppercase tracking-wider font-bold ${accent.text} mb-1`}>{badge}</div>
          <h3 className="font-heading text-xl font-bold text-white">{title}</h3>
        </div>
      </div>
      <p className="text-white/75 text-sm leading-relaxed mb-4">{description}</p>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/80">
            <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${accent.text}`} /> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
