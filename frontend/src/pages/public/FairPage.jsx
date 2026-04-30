import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, FileText, ArrowRight, Check, Building2, Grid3x3, Download, Mail, Phone } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function FairPage() {
  const [fair, setFair] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    axios.get(`${API}/fair`).then(r => setFair(r.data || {})).catch(() => setFair({}));
  }, []);

  if (!fair) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen font-body" data-testid="fair-page">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-28 pb-14 bg-summit-paper overflow-hidden border-b border-gray-200">
        <div className="absolute top-10 -right-40 w-[500px] h-[500px] rounded-full bg-summit-navy/5 blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] rounded-full bg-summit-accent/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="section-overline">Fuar Alanı</span>
            <h1 className="font-heading text-summit-navy text-[2rem] sm:text-5xl lg:text-[3.3rem] leading-[1.05] mt-3">
              {fair.fair_name || "8. Gayrimenkul Proje Yatırım Fuarı"}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg mt-5 leading-relaxed max-w-2xl">
              {fair.subtitle || "Zirveyle eş zamanlı, aynı mekânda."}
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              {fair.dates && (
                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-md text-sm text-summit-navy shadow-sm">
                  <Calendar size={14} /> {fair.dates}
                </span>
              )}
              {fair.location && (
                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-md text-sm text-summit-navy shadow-sm">
                  <MapPin size={14} /> {fair.location.split("—")[0].trim()}
                </span>
              )}
              {fair.total_stands && (
                <span className="inline-flex items-center gap-2 bg-summit-navy text-white px-4 py-2 rounded-md text-sm shadow-sm">
                  <Grid3x3 size={14} /> {fair.total_stands} Stand
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to={fair.cta_url || "/fuar-stant-kaydi"}
                className="btn-navy px-6 py-3 inline-flex items-center justify-center gap-2 text-sm"
                data-testid="fair-hero-apply-btn"
              >
                <Building2 size={15} /> {fair.cta_text || "Stant Başvurusu Yap"}
              </Link>
              {fair.floor_plan_url && (
                <a
                  href={fair.floor_plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline-navy px-6 py-3 inline-flex items-center justify-center gap-2 text-sm"
                  data-testid="fair-hero-plan-btn"
                >
                  <FileText size={15} /> Stant Planını İndir (PDF)
                </a>
              )}
            </div>
          </div>

          {/* Right: gallery preview */}
          <div className="lg:col-span-5">
            {fair.gallery?.[0] && (
              <div className="relative">
                <div
                  className="w-full h-72 lg:h-[380px] rounded-md overflow-hidden shadow-xl cursor-pointer"
                  style={{
                    backgroundImage: `url(${fair.gallery[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  onClick={() => setLightbox(fair.gallery[0])}
                />
                <div className="absolute -bottom-6 right-5 bg-white border-l-4 border-summit-navy p-5 shadow-2xl rounded-md">
                  <div className="text-[0.6rem] uppercase tracking-widest text-gray-500 font-semibold">Geçmiş Fuardan</div>
                  <div className="font-heading text-summit-navy text-xl font-bold mt-1">Proje Standları</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}
      {fair.description && (
        <section className="py-14 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="section-overline">Fuar Hakkında</span>
            <h2 className="gyoder-section-title inline-block">Sektörün Buluşma Noktası</h2>
            <p className="text-gray-700 text-base sm:text-lg mt-6 leading-relaxed">{fair.description}</p>
          </div>
        </section>
      )}

      {/* FLOOR PLAN (kroki) */}
      {(fair.floor_plan_url || fair.floor_plan_image_url) && (
        <section className="py-14 bg-summit-paper" data-testid="fair-floor-plan">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Yerleşim Planı</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Stant Krokisi</h2>
              <p className="text-gray-500 mt-5 max-w-2xl mx-auto text-sm">
                {fair.hall_name || "Connie Salonları"} içinde yerleşim. Tercih ettiğiniz stand numarasını başvuru formunda belirtebilirsiniz.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm">
              {fair.floor_plan_image_url ? (
                <img
                  src={fair.floor_plan_image_url}
                  alt="Fuar stand krokisi"
                  className="w-full h-auto rounded border border-gray-200 cursor-pointer"
                  onClick={() => setLightbox(fair.floor_plan_image_url)}
                />
              ) : (
                <div className="relative w-full" style={{ paddingTop: "70%" }}>
                  <iframe
                    src={`${fair.floor_plan_url}#view=FitH&toolbar=0`}
                    title="Stand planı"
                    className="absolute inset-0 w-full h-full border border-gray-200 rounded"
                    data-testid="floor-plan-iframe"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
                <a
                  href={fair.floor_plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-summit-navy text-white text-sm rounded-md hover:bg-summit-navy/90 transition-colors"
                >
                  <Download size={14} /> Krokiyi İndir (PDF)
                </a>
                <Link
                  to={fair.cta_url || "/fuar-stant-kaydi"}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-summit-navy text-summit-navy text-sm rounded-md hover:bg-summit-navy hover:text-white transition-colors"
                >
                  <Building2 size={14} /> Stand Rezervasyonu
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STAND TYPES */}
      {fair.stand_types?.length > 0 && (
        <section className="py-14 bg-white border-t border-gray-100" data-testid="stand-types-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Stand Tipleri</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Hangi Stand Size Uygun?</h2>
              <p className="text-gray-500 mt-5 max-w-2xl mx-auto text-sm">
                {fair.total_size_range || "9-27 m² arası"} farklı boyutlarda standlar. Her paket içinde masa, sandalye, aydınlatma ve priz yer alır.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {fair.stand_types.map((t, i) => (
                <div
                  key={i}
                  className={`bg-white border border-gray-200 rounded-md p-6 card-hover shadow-sm border-l-4 ${i === 1 ? "border-l-summit-accent" : i === 2 ? "border-l-summit-navy" : i === 3 ? "border-l-purple-500" : "border-l-gray-300"}`}
                  data-testid={`stand-type-${i}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Grid3x3 size={18} className="text-summit-navy" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {t.count} Stand
                    </span>
                  </div>
                  <h3 className="font-heading text-summit-navy text-lg leading-tight">{t.name}</h3>
                  <p className="text-summit-navy text-xs mt-2 font-mono font-semibold bg-summit-navy/5 inline-block px-2 py-0.5 rounded">{t.size}</p>
                  <p className="text-gray-600 text-xs mt-4 leading-relaxed">{t.features}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <p className="text-gray-500 text-sm mb-4">
                Stant fiyatları konumu ve boyutuna göre değişiklik gösterir. Detaylı bilgi için başvuru formunu doldurun, sizinle iletişime geçelim.
              </p>
              <Link
                to={fair.cta_url || "/fuar-stant-kaydi"}
                className="btn-navy px-7 py-3 inline-flex items-center gap-2"
                data-testid="stand-types-apply-btn"
              >
                Fiyat Teklifi Al <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* HIGHLIGHTS */}
      {fair.highlights?.length > 0 && (
        <section className="py-14 bg-summit-paper border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Neden Stand Almalı?</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Fuarda Yer Almanın Avantajları</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fair.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-summit-navy/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} className="text-summit-navy" />
                  </div>
                  <span className="text-gray-700 text-sm leading-relaxed">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {fair.gallery?.length > 0 && (
        <section className="py-14 bg-white border-t border-gray-100" data-testid="fair-gallery">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Galeri</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Geçmiş Fuarlardan Kareler</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fair.gallery.map((img, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] bg-cover bg-center rounded-md shadow-sm cursor-pointer overflow-hidden group"
                  style={{ backgroundImage: `url(${img})` }}
                  onClick={() => setLightbox(img)}
                  data-testid={`fair-gallery-item-${i}`}
                >
                  <div className="w-full h-full bg-black/0 group-hover:bg-black/20 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="py-16 bg-summit-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-summit-accent text-xs uppercase tracking-[0.25em] font-semibold">Başvuru Açık</span>
          <h2 className="font-heading text-3xl sm:text-4xl mt-3 leading-tight">
            Stand Yerleriniz Sınırlıdır
          </h2>
          <p className="text-white/80 text-sm sm:text-base mt-5 max-w-2xl mx-auto">
            Zirvemiz her yıl 600+ yatırımcının katıldığı, sektörün en verimli networking etkinliklerinden biri.
            Stand rezervasyonları başvuru sırasına göre değerlendirilir.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              to={fair.cta_url || "/fuar-stant-kaydi"}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-summit-accent text-summit-navy font-semibold text-sm rounded-md hover:bg-white transition-colors"
              data-testid="fair-final-cta"
            >
              <Building2 size={16} /> Hemen Başvur
            </Link>
            <Link
              to="/konusmaci-basvuru"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/30 text-white text-sm rounded-md hover:bg-white/10 transition-colors"
            >
              <Mail size={16} /> Sponsor Olarak Katıl
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
          data-testid="fair-lightbox"
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
