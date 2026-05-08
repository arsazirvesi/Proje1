import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE as API } from "../lib/api";

/**
 * Analytics helper - works with GTM (GTM-TCJD6TXD) + GA4 (G-K6R7RGP5S9).
 * Both are loaded directly in /public/index.html so they work on any deployment.
 *
 * This component handles:
 * - SPA route change tracking (sends page_view on every in-app navigation)
 * - Consent mode updates when user clicks Accept / Reject
 */

const GA_ID = "G-K6R7RGP5S9";

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

  // Inject GTM <noscript> iframe + custom_body_html (one-time, after SEO loads)
  useEffect(() => {
    let mounted = true;
    axios.get(`${API}/seo`).then(r => {
      if (!mounted) return;
      const seo = r.data || {};

      // GTM noscript fallback
      if (seo.gtm_id && !document.getElementById("gtm-noscript-frame")) {
        const ns = document.createElement("noscript");
        ns.id = "gtm-noscript-frame";
        ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${seo.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
        document.body.insertBefore(ns, document.body.firstChild);
      }

      // Custom body HTML (admin-defined)
      if (seo.custom_body_html && !document.getElementById("custom-body-html")) {
        const wrap = document.createElement("div");
        wrap.id = "custom-body-html";
        wrap.style.display = "none";
        wrap.innerHTML = seo.custom_body_html;
        document.body.insertBefore(wrap, document.body.firstChild);
      }

      // Custom head HTML (admin-defined)
      if (seo.custom_head_html && !document.getElementById("custom-head-html")) {
        const wrap = document.createElement("div");
        wrap.id = "custom-head-html";
        wrap.innerHTML = seo.custom_head_html;
        // Move all script/meta/link nodes to head
        Array.from(wrap.childNodes).forEach(n => {
          if (n.nodeType === 1) {
            if (n.tagName === "SCRIPT") {
              const s = document.createElement("script");
              for (const a of n.attributes) s.setAttribute(a.name, a.value);
              s.text = n.text || "";
              document.head.appendChild(s);
            } else {
              document.head.appendChild(n.cloneNode(true));
            }
          }
        });
      }
    }).catch(() => {/* ignore */});
    return () => { mounted = false; };
  }, []);

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
