import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ScanLine, CheckCircle2, XCircle, AlertTriangle, Clock, Camera, CameraOff,
  RefreshCw, User, Mail, Phone, Building2, MapPin, Ticket, Store, Keyboard, ShieldAlert
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const SCANNER_ELEMENT_ID = "qr-scanner-region-public";
const COOLDOWN_MS = 2500;

/**
 * Public, no-login scanner page for door staff.
 * Route: /tarama/:apiKey
 * Calls POST /api/external/checkin with X-API-Key header from URL.
 */
export default function StaffScanPage() {
  const { apiKey } = useParams();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [keyError, setKeyError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef(null);
  const cooldownRef = useRef(false);

  const playFeedback = (status) => {
    if (navigator.vibrate) {
      const pattern = status === "approved" ? [120] : status === "already_checked_in" ? [80, 60, 80] : [200, 100, 200, 100, 200];
      navigator.vibrate(pattern);
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const freqMap = { approved: 880, already_checked_in: 520, not_verified: 320, not_found: 220 };
      osc.frequency.value = freqMap[status] || 440;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {/* audio not allowed */}
  };

  const verifyCode = useCallback(async (code) => {
    if (!code || cooldownRef.current) return;
    cooldownRef.current = true;
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/external/checkin`,
        { code, mark_checkin: true },
        { headers: { "X-API-Key": apiKey } }
      );
      setResult(data);
      setScanCount((c) => c + 1);
      playFeedback(data.status);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 401 || status === 403) {
        setKeyError(detail || "Bu tarama linki artık geçerli değil. Lütfen yöneticinizden yeni bir link isteyin.");
      } else {
        setError(detail || "Sunucu hatası. Tekrar deneyin.");
      }
    } finally {
      setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);
    }
  }, [apiKey]);

  const startScanner = async () => {
    setError("");
    setResult(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Kamera erişimi için HTTPS gerekli. Lütfen https:// ile başlayan adresten açın.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Tarayıcınız kamerayı desteklemiyor. Güncel Chrome / Safari kullanın.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.getTracks().forEach((t) => t.stop());

      setScanning(true);
      await new Promise((r) => setTimeout(r, 60));

      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, false);
      scannerRef.current = html5QrCode;
      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
        videoConstraints: { facingMode: { ideal: "environment" } },
        rememberLastUsedCamera: true,
      };

      try {
        await html5QrCode.start(
          { facingMode: { ideal: "environment" } },
          config,
          (decodedText) => verifyCode(decodedText),
          () => {}
        );
      } catch {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) throw new Error("Cihazda kamera bulunamadı");
        const back = cameras.find((c) => /back|rear|environment|arka/i.test(c.label || ""));
        const chosen = back || cameras[cameras.length - 1];
        await html5QrCode.start(chosen.id, config, (decodedText) => verifyCode(decodedText), () => {});
      }

      // iOS Safari fix
      const region = document.getElementById(SCANNER_ELEMENT_ID);
      const video = region?.querySelector("video");
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.setAttribute("muted", "true");
        video.setAttribute("autoplay", "true");
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        try { await video.play(); } catch {/* already playing */}
      }
    } catch (err) {
      const name = err?.name || "";
      const msg = err?.message || "";
      let friendly;
      if (name === "NotAllowedError" || /Permission|denied/i.test(msg)) {
        friendly = "Kamera izni reddedilmiş. Adres çubuğundaki 🔒 ikonundan 'Kamera' iznini 'İzin Ver' yapıp sayfayı yenileyin.";
      } else if (name === "NotFoundError" || /no camera|kamera bulunamadı/i.test(msg)) {
        friendly = "Cihazda erişilebilir bir kamera bulunamadı.";
      } else if (name === "NotReadableError") {
        friendly = "Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamaları kapatın.";
      } else {
        friendly = `Kamera başlatılamadı: ${msg || name || "Bilinmeyen hata"}.`;
      }
      setError(friendly);
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {/* ignore */}
        try { await scannerRef.current.clear(); } catch {/* ignore */}
        scannerRef.current = null;
      }
      setScanning(false);
    }
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {/* ignore */}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) verifyCode(manualCode.trim());
    setManualCode("");
  };

  const RESULT_VISUAL = {
    approved: { bg: "bg-green-500", icon: CheckCircle2, title: "✓ ONAYLANDI", subtitle: "Hoş geldiniz!", textColor: "text-white" },
    already_checked_in: { bg: "bg-amber-400", icon: Clock, title: "⚠ ZATEN GİRİŞ YAPMIŞ", subtitle: "Bu kart daha önce okutulmuş", textColor: "text-amber-950" },
    not_verified: { bg: "bg-orange-500", icon: AlertTriangle, title: "✗ DOĞRULANMAMIŞ", subtitle: "E-posta doğrulaması yapılmamış", textColor: "text-white" },
    not_found: { bg: "bg-red-600", icon: XCircle, title: "✗ GEÇERSİZ KOD", subtitle: "Yaka kartı sistemde bulunamadı", textColor: "text-white" },
  };
  const visual = result ? RESULT_VISUAL[result.status] : null;
  const VisualIcon = visual?.icon;

  // Block UI if API key was rejected
  if (keyError) {
    return (
      <div className="min-h-screen bg-summit-paper flex items-center justify-center p-6" data-testid="staff-scan-blocked">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-xl">
          <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="font-heading text-xl font-bold text-summit-navy mb-2">Tarama linki geçersiz</h1>
          <p className="text-sm text-gray-600 mb-4">{keyError}</p>
          <p className="text-xs text-gray-400">Anahtar pasif yapılmış veya silinmiş olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-summit-paper" data-testid="staff-scan-page">
      {/* Sticky compact header */}
      <header className="sticky top-0 z-20 bg-summit-navy text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-base sm:text-lg font-bold flex items-center gap-2">
              <ScanLine size={18} /> Yaka Kartı Tarama
            </h1>
            <p className="text-[11px] text-white/70 mt-0.5">Arsa Yatırım Zirvesi 2026 — Görevli</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/60">Bu Cihaz</div>
            <div className="text-lg font-bold text-summit-gold leading-none" data-testid="scan-counter">{scanCount}</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* RESULT */}
        {visual && (
          <div
            className={`${visual.bg} ${visual.textColor} rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-4`}
            data-testid={`result-${result.status}`}
          >
            <div className="flex items-start gap-3">
              <VisualIcon size={48} className="shrink-0" strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <div className="font-heading text-xl sm:text-2xl font-black tracking-wide">{visual.title}</div>
                <div className="text-xs sm:text-sm mt-1 opacity-95">{visual.subtitle}</div>
              </div>
            </div>

            {result.guest && (
              <div className="mt-4 pt-4 border-t border-white/30 grid grid-cols-1 gap-y-1.5 text-sm">
                <InfoRow icon={User} label="Ad Soyad" value={result.guest.name} bold />
                <InfoRow icon={result.guest.visit_type === "fair" ? Store : Ticket} label="Tür" value={result.guest.visit_label} />
                {result.guest.company && <InfoRow icon={Building2} label="Şirket" value={result.guest.company} />}
                {result.guest.title && <InfoRow icon={User} label="Unvan" value={result.guest.title} />}
                {result.guest.phone && <InfoRow icon={Phone} label="Telefon" value={result.guest.phone} />}
                {result.guest.email && <InfoRow icon={Mail} label="E-posta" value={result.guest.email} />}
                {result.guest.city && <InfoRow icon={MapPin} label="Şehir" value={result.guest.city} />}
                {result.guest.checked_in_at && (
                  <InfoRow icon={Clock} label="Saat" value={new Date(result.guest.checked_in_at).toLocaleString("tr-TR")} />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 border border-white/40 rounded-md py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
              data-testid="result-clear-btn"
            >
              <RefreshCw size={14} /> Yeni Tarama
            </button>
          </div>
        )}

        {/* SCANNER */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-heading text-summit-navy text-base font-bold">Kamera</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{scanning ? "🔴 Aktif" : "Kapalı"}</p>
            </div>
            {!scanning ? (
              <button
                onClick={startScanner}
                className="bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
                data-testid="start-scan-btn"
              >
                <Camera size={16} /> Kamerayı Başlat
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
                data-testid="stop-scan-btn"
              >
                <CameraOff size={16} /> Durdur
              </button>
            )}
          </div>

          <div
            id={SCANNER_ELEMENT_ID}
            className={`mx-auto w-full max-w-md aspect-square rounded-lg overflow-hidden bg-gray-900 relative ${scanning ? "" : "flex items-center justify-center"}`}
            style={{ minHeight: scanning ? 280 : "auto" }}
            data-testid="scanner-region"
          >
            {!scanning && (
              <div className="text-gray-400 text-center px-4">
                <Camera size={44} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">QR kodu kameraya tutun</p>
                <p className="text-[11px] mt-2 opacity-70">İlk kullanımda kamera izni verin</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm" data-testid="scanner-error">
              {error}
            </div>
          )}
        </div>

        {/* MANUAL */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <button
            type="button"
            onClick={() => setShowManual(s => !s)}
            className="text-summit-navy text-sm font-semibold inline-flex items-center gap-2"
            data-testid="manual-toggle"
          >
            <Keyboard size={15} /> {showManual ? "Manuel girişi kapat" : "Manuel kod gir"}
          </button>
          {showManual && (
            <form onSubmit={handleManualSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="00AYZ2026-..."
                className="flex-1 bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="manual-input"
              />
              <button type="submit" className="bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-5 py-2.5 text-sm font-semibold" data-testid="manual-submit">
                Doğrula
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400 pt-2 pb-6">
          Bu sayfayı yalnızca etkinlik görevlileri ile paylaşın.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, bold = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="opacity-70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="opacity-70 mr-1">{label}:</span>
        <strong className={`break-words ${bold ? "text-base" : ""}`}>{value}</strong>
      </div>
    </div>
  );
}
