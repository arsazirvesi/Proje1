import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Analytics helper - works with GTM (GTM-TCJD6TXD) + GA4 (G-2BZWL02BBS).
 * Both are loaded directly in /public/index.html so they work on any deployment.
 *
 * This component handles:
 * - SPA route change tracking (sends page_view on every in-app navigation)
 * - Consent mode updates when user clicks Accept / Reject
 */

const GA_ID = "G-2BZWL02BBS";

function updateConsent(granted) {
  if (typeof window.gtag !== "function") return;
  const state = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
}

export default function Analytics() {
  const location = useLocation();

  // Handle consent changes from CookieConsent banner
  useEffect(() => {
    const onConsent = () => {
      const v = localStorage.getItem("cookie_consent");
      updateConsent(v === "accepted");
    };
    // Sync once on mount in case user previously accepted
    onConsent();
    window.addEventListener("cookie-consent-change", onConsent);
    return () => window.removeEventListener("cookie-consent-change", onConsent);
  }, []);

  // Track SPA route changes (GA4 + GTM dataLayer)
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    const pagePath = location.pathname + location.search;

    // GTM event
    window.dataLayer.push({
      event: "page_view",
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });

    // GA4 direct (config update)
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
        send_to: GA_ID,
      });
    }
  }, [location]);

  return null;
}
