import React, { useEffect, useState } from "react";
import axios from "axios";
import { Save, RefreshCw, Calendar, AlertCircle, Clock } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const ISO_HELP = "ISO 8601 formatı: 2026-05-21T09:00:00+03:00 (yıl-ay-gün T saat:dakika:saniye+saat:dakika TR saat dilimi)";

function fmtRemaining(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (isNaN(diff)) return "Geçersiz tarih";
  if (diff <= 0) return "Etkinlik geçmiş";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d} gün ${h} saat ${m} dakika`;
}

export default function SiteSettingsManagement() {
  const [form, setForm] = useState({
    event_datetime: "2026-05-21T09:00:00+03:00",
    event_date_label: "21 Mayıs 2026",
    event_time_label: "09:00 - 19:00",
    event_location: "Hilton İstanbul Bosphorus",
    speakers_count: 4,
    sessions_count: 12,
    attendees_count: "600+",
    countdown_title: "Zirveye Kalan Süre",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/site-settings`, { withCredentials: true });
      if (data && Object.keys(data).length) setForm(p => ({ ...p, ...data }));
    } catch {
      setErr("Yüklenemedi");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Live countdown preview, updates every second
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(""); setErr("");
    try {
      // Strip server-managed fields
      const { id, key, created_at, updated_at, ...payload } = form;
      await axios.put(`${API}/admin/site-settings`, payload, { withCredentials: true });
      setMsg("Site ayarları kaydedildi. Ana sayfa otomatik güncellenir.");
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Kaydedilemedi");
    }
    setSaving(false);
  };

  // Convert ISO to datetime-local input format (YYYY-MM-DDTHH:MM)
  const toLocalInput = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ""; }
  };

  // Convert datetime-local back to ISO with TR timezone
  const fromLocalInput = (val) => {
    if (!val) return "";
    return `${val}:00+03:00`;
  };

  if (loading) return <div className="text-sm text-gray-500">Yükleniyor...</div>;

  const remaining = fmtRemaining(form.event_datetime);
  // tick is intentionally read here so React re-renders the countdown preview every second
  void tick;

  return (
    <div className="max-w-4xl mx-auto" data-testid="admin-site-settings-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-summit-navy">Etkinlik Tarihi & Geri Sayım</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ana sayfadaki geri sayım sayacının ve istatistiklerin (konuşmacı/oturum/katılımcı sayısı) ayarları.
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-summit-navy text-sm border border-gray-200 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Live preview */}
      <div className="bg-summit-navy text-white rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-summit-accent" />
          <span className="text-xs uppercase tracking-widest font-semibold opacity-80">Canlı Önizleme</span>
        </div>
        <p className="text-summit-accent text-xs font-semibold uppercase tracking-widest mb-1">{form.countdown_title}</p>
        <p className="font-heading text-3xl font-bold mb-1">{remaining}</p>
        <p className="text-white/70 text-xs">
          {form.event_date_label} · {form.event_time_label} · {form.event_location}
        </p>
      </div>

      {msg && <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{msg}</div>}
      {err && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

      <form onSubmit={submit} className="space-y-6">
        {/* DATE & TIME */}
        <div className="bg-white border-2 border-summit-accent/30 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-summit-accent/20 flex items-center justify-center text-summit-navy shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-summit-navy">Etkinlik Başlangıç Tarihi & Saati</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ana sayfadaki geri sayım bu tarihe göre hesaplanır.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Başlangıç Tarihi & Saati <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={toLocalInput(form.event_datetime)}
                onChange={(e) => set("event_datetime", fromLocalInput(e.target.value))}
                className="w-full px-3 py-2 border-2 border-summit-navy/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40 focus:border-summit-gold"
                data-testid="event-datetime-input"
              />
              <p className="text-xs text-gray-400 mt-1">
                Türkiye saati (UTC+3). Geri sayım buna göre hesaplanır. Geçmiş tarih girilirse sayaç 0 kalır.
              </p>
              <p className="text-[0.65rem] text-gray-400 mt-1 font-mono">Şu anki değer: {form.event_datetime}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tarih Etiketi (görüntüleme)</label>
              <input
                type="text"
                value={form.event_date_label || ""}
                onChange={(e) => set("event_date_label", e.target.value)}
                placeholder="21 Mayıs 2026"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
              <p className="text-xs text-gray-400 mt-1">Hero bölümünde "21 Mayıs 2026 · Perşembe" şeklinde gösterilir.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Saat Etiketi</label>
              <input
                type="text"
                value={form.event_time_label || ""}
                onChange={(e) => set("event_time_label", e.target.value)}
                placeholder="09:00 - 19:00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Konum</label>
              <input
                type="text"
                value={form.event_location || ""}
                onChange={(e) => set("event_location", e.target.value)}
                placeholder="Hilton İstanbul Bosphorus"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Önemli:</strong> Tarih sahasını yanlış değiştirirseniz geri sayım hatalı çalışır.
              Etiket alanlarını (görüntüleme metni) güncellemeyi unutmayın. Türkiye saati değişmediyse "+03:00" kısmına dokunmayın.
            </p>
          </div>
        </div>

        {/* COUNTDOWN TITLE */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-summit-navy mb-4 pb-3 border-b border-gray-100">Sayaç Başlığı</h2>
          <input
            type="text"
            value={form.countdown_title || ""}
            onChange={(e) => set("countdown_title", e.target.value)}
            placeholder="Zirveye Kalan Süre"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
          />
        </div>

        {/* STATS */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-summit-navy mb-4 pb-3 border-b border-gray-100">Hero İstatistikleri</h2>
          <p className="text-xs text-gray-500 mb-4">Ana sayfadaki sayaç kartının altında görünen 3 sayı.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Konuşmacı Sayısı</label>
              <input
                type="number"
                value={form.speakers_count ?? 0}
                onChange={(e) => set("speakers_count", parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Oturum Sayısı</label>
              <input
                type="number"
                value={form.sessions_count ?? 0}
                onChange={(e) => set("sessions_count", parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Katılımcı Sayısı (metin)</label>
              <input
                type="text"
                value={form.attendees_count || ""}
                onChange={(e) => set("attendees_count", e.target.value)}
                placeholder="600+"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-summit-gold/40"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-summit-navy text-white text-sm font-medium rounded-lg hover:bg-summit-navy/90 disabled:opacity-60"
            data-testid="save-site-settings-btn"
          >
            <Save size={15} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
