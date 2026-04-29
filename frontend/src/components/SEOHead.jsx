import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Global SEO head injector.
 * Fetches admin-managed SEO settings from /api/seo and injects
 * <title>, meta tags, OG/Twitter cards, canonical, and Event JSON-LD.
 *
 * Per-page override: pass `pageTitle` / `pageDescription` / `pagePath` props.
 */
export default function SEOHead({ pageTitle, pageDescription, pagePath }) {
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
    </Helmet>
  );
}
