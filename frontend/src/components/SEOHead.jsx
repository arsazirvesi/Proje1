import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE as API } from "../lib/api";

/**
 * Global SEO head injector.
 * Fetches admin-managed SEO settings from /api/seo and injects
 * <title>, meta tags, OG/Twitter cards, canonical, and Event JSON-LD.
 *
 * Pages with their own <Helmet> (e.g. /akademi) can opt out via path prefix.
 */
const SKIP_PATH_PREFIXES = ["/akademi", "/seminer"];

export default function SEOHead({ pageTitle, pageDescription, pagePath }) {
  const location = useLocation();
  const [seo, setSeo] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API}/seo`)
      .then((r) => mounted && setSeo(r.data || {}))
      .catch(() => mounted && setSeo({}));
    return () => {
      mounted = false;
    };
  }, []);

  if (!seo) return null;
  // Some pages own their full <head> via their own <Helmet>; skip global override
  if (SKIP_PATH_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const siteUrl = (seo.site_url || "https://arsayatirimzirvesi.com").replace(/\/$/, "");
  const title = pageTitle || seo.title || "Arsa Yatırım Zirvesi 2026";
  const description = pageDescription || seo.description || "";
  const canonical = pagePath ? `${siteUrl}${pagePath}` : seo.canonical_url || `${siteUrl}/`;
  const ogTitle = seo.og_title || title;
  const ogDescription = seo.og_description || description;
  const ogImage = seo.og_image || "";
  const twTitle = seo.twitter_title || ogTitle;
  const twDescription = seo.twitter_description || ogDescription;
  const twImage = seo.twitter_image || ogImage;
  const twCard = seo.twitter_card || "summary_large_image";

  // Build JSON-LD: Organization + Event
  const eventLd =
    seo.event_name && seo.event_start_date
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: seo.event_name,
          startDate: seo.event_start_date,
          endDate: seo.event_end_date || seo.event_start_date,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: seo.event_location_name || "",
            address: seo.event_location_address || "",
          },
          image: ogImage ? [ogImage] : undefined,
          description: description,
          organizer: seo.event_organizer
            ? {
                "@type": "Organization",
                name: seo.event_organizer,
                url: seo.event_organizer_url || siteUrl,
              }
            : undefined,
          offers: {
            "@type": "Offer",
            url: `${siteUrl}/ziyaretci-kaydi`,
            price: "0",
            priceCurrency: "TRY",
            availability: "https://schema.org/InStock",
            validFrom: new Date().toISOString().slice(0, 10),
          },
        }
      : null;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.site_name || "Arsa Yatırım Zirvesi",
    url: siteUrl,
    logo: ogImage || undefined,
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seo.site_name || "Arsa Yatırım Zirvesi",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <html lang="tr" />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      {seo.author && <meta name="author" content={seo.author} />}
      <meta name="robots" content={seo.robots || "index, follow"} />
      {seo.google_site_verification && (
        <meta name="google-site-verification" content={seo.google_site_verification} />
      )}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={seo.site_name || "Arsa Yatırım Zirvesi"} />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:title" content={ogTitle} />
      {ogDescription && <meta property="og:description" content={ogDescription} />}
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content={twCard} />
      <meta name="twitter:title" content={twTitle} />
      {twDescription && <meta name="twitter:description" content={twDescription} />}
      {twImage && <meta name="twitter:image" content={twImage} />}

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(orgLd)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteLd)}</script>
      {eventLd && (
        <script type="application/ld+json">{JSON.stringify(eventLd)}</script>
      )}

      {/* Google Tag Manager */}
      {seo.gtm_id && (
        <script>{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.gtm_id}');`}</script>
      )}

      {/* Google Analytics 4 */}
      {seo.ga_id && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${seo.ga_id}`}></script>
      )}
      {seo.ga_id && (
        <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.ga_id}');`}</script>
      )}

      {/* Meta / Facebook Pixel */}
      {seo.meta_pixel_id && (
        <script>{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.meta_pixel_id}');fbq('track','PageView');`}</script>
      )}
    </Helmet>
  );
}
