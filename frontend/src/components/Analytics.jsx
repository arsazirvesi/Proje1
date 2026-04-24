import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

function loadGoogleAnalytics() {
  if (!GA_ID || window.__gaLoaded) return;
  window.__gaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
}

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent === "accepted") {
      loadGoogleAnalytics();
    }

    const onConsent = () => {
      if (localStorage.getItem("cookie_consent") === "accepted") {
        loadGoogleAnalytics();
      }
    };
    window.addEventListener("cookie-consent-change", onConsent);
    return () => window.removeEventListener("cookie-consent-change", onConsent);
  }, []);

  // Track SPA route changes
  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
