import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/**
 * Reusable KVKK / Privacy consent checkbox.
 * Use in every public form (visitor, exhibitor, speaker, game, etc.).
 *
 * Props:
 *  - checked: boolean
 *  - onChange: (newValue: boolean) => void
 *  - tone: "light" (white bg) | "dark" (transparent on dark bg). Default "light".
 *  - testid: optional, defaults to "kvkk-consent"
 */
export default function KvkkConsent({ checked, onChange, tone = "light", testid = "kvkk-consent" }) {
  const isDark = tone === "dark";
  const wrapperCls = isDark
    ? "bg-white/5 border-white/20 hover:border-white/40 text-white/85"
    : "bg-summit-paper border-gray-200 hover:border-summit-navy/40 text-gray-700";
  const linkCls = isDark
    ? "text-amber-300 hover:text-amber-200 underline underline-offset-2"
    : "text-summit-navy hover:text-summit-navy-dark underline underline-offset-2";

  return (
    <label
      className={`flex items-start gap-2.5 border rounded-lg p-3 cursor-pointer transition-colors ${wrapperCls}`}
      data-testid={testid}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-400 text-summit-navy focus:ring-summit-navy shrink-0"
        data-testid={`${testid}-checkbox`}
      />
      <span className="text-xs leading-relaxed">
        <ShieldCheck size={12} className={`inline-block mr-1 -mt-0.5 ${isDark ? "text-amber-300" : "text-summit-navy"}`} />
        Bu formu göndererek{" "}
        <Link to="/kvkk" target="_blank" rel="noopener noreferrer" className={linkCls}>
          KVKK Aydınlatma Metni
        </Link>
        ,{" "}
        <Link to="/gizlilik" target="_blank" rel="noopener noreferrer" className={linkCls}>
          Gizlilik Politikası
        </Link>{" "}
        ve <strong>Kullanım Koşulları</strong>'nı okuduğumu, kişisel verilerimin etkinlik organizasyonu ve bilgilendirme amacıyla işlenmesine açık rıza ile onay verdiğimi kabul ederim.
      </span>
    </label>
  );
}
