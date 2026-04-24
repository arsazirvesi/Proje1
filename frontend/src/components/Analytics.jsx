import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Analytics helper for Google Tag Manager (GTM-TCJD6TXD).
 *
 * - GTM base snippet is loaded in /public/index.html (head + body noscript).
 * - This component pushes SPA route changes + consent state into dataLayer
 *   so GTM-based tags (GA4, Facebook Pixel, etc.) can react.
 */
export default function Analytics() {
  const location = useLocation();

  // Push consent state on mount + whenever it changes
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];

    const pushConsent = () => {
      const consent = localStorage.getItem("cookie_consent");
      window.dataLayer.push({
        event: "cookie_consent_update",
        consent_state: consent || "pending",
      });
    };

    pushConsent();
    window.addEventListener("cookie-consent-change", pushConsent);
    return () => window.removeEventListener("cookie-consent-change", pushConsent);
  }, []);

  // Push virtual page view on route change (SPA tracking)
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
