import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ScanLine, CheckCircle2, XCircle, AlertTriangle, Clock, Camera, CameraOff,
  RefreshCw, User, Mail, Phone, Building2, MapPin, Ticket, Store, Keyboard
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const SCANNER_ELEMENT_ID = "qr-scanner-region";
const COOLDOWN_MS = 2500; // pause between successful scans to prevent re-fire

export default function CheckInPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { status, message, guest }
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const scannerRef = useRef(null);
  const cooldownRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/checkin/stats`, { withCredentials: true });
      setStats(data);
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const playFeedback = (status) => {
    // Haptic feedback
    if (navigator.vibrate) {
      const pattern = status === "approved" ? [120] : status === "already_checked_in" ? [80, 60, 80] : [200, 100, 200, 100, 200];
      navigator.vibrate(pattern);
    }
    // Audio beep
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
        `${API}/admin/checkin`,
        { code },
        { withCredentials: true }
      );
      setResult(data);
      playFeedback(data.status);
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || "Sunucu hatası. Tekrar deneyin.");
    } finally {
      setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);
    }
  }, [fetchStats]);

  const startScanner = async () => {
    setError("");
    setResult(null);

    // 1) Secure context check (camera REQUIRES HTTPS or localhost)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Kamera erişimi için HTTPS gerekli. Bu sayfa HTTP üzerinden açıldığı için tarayıcı kameraya izin vermez. Lütfen https:// ile başlayan adresten açın."
      );
      return;
    }

    // 2) Browser support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "Tarayıcınız kamera erişimini desteklemiyor. Lütfen güncel Chrome / Safari / Edge kullanın."
      );
      return;
    }

    try {
      // 3) Force a permission prompt FIRST. This gives a much clearer error
      // than html5-qrcode's wrapped messages when permission is denied.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      // We just wanted permission; release the stream so html5-qrcode can take over
      stream.getTracks().forEach((t) => t.stop());

      // Mark scanning state BEFORE starting so the DOM element is rendered
      setScanning(true);
      // small delay to allow React to mount the scanner region
      await new Promise((r) => setTimeout(r, 60));

      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, /* verbose */ false);
      scannerRef.current = html5QrCode;
      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
        // iOS Safari needs videoConstraints — facingMode passed alone breaks
        videoConstraints: { facingMode: { ideal: "environment" } },
        // disable flipping which breaks on some iOS devices
        rememberLastUsedCamera: true,
      };

      // 4) Try with rear camera first; fall back to ANY camera if that fails
      try {
        await html5QrCode.start(
          { facingMode: { ideal: "environment" } },
          config,
          (decodedText) => verifyCode(decodedText),
          () => {/* per-frame errors are noisy; ignore */}
        );
      } catch (envErr) {
        // Fallback: pick first available camera
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error("Cihazda kamera bulunamadı");
        }
        const back = cameras.find((c) => /back|rear|environment|arka/i.test(c.label || ""));
        const chosen = back || cameras[cameras.length - 1];
        await html5QrCode.start(
          chosen.id,
          config,
          (decodedText) => verifyCode(decodedText),
          () => {}
        );
      }

      // iOS Safari fix: make the injected <video> element inline + autoplay properly
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
        friendly =
          "Kamera izni reddedilmiş. Adres çubuğunun solundaki 🔒 / kilit ikonuna tıklayıp 'Kamera' iznini 'İzin Ver' yapın, ardından sayfayı yenileyin.";
      } else if (name === "NotFoundError" || /no camera|kamera bulunamadı/i.test(msg)) {
        friendly = "Cihazda erişilebilir bir kamera bulunamadı.";
      } else if (name === "NotReadableError" || /in use|already/i.test(msg)) {
        friendly = "Kamera başka bir uygulama tarafından kullanılıyor. Diğer kamera kullanan uygulamaları kapatıp tekrar deneyin.";
      } else if (name === "OverconstrainedError") {
        friendly = "Cihazınızda istenilen kamera modu bulunamadı. Tekrar deneyin (ön kameraya geçilecek).";
      } else {
        friendly = `Kamera başlatılamadı: ${msg || name || "Bilinmeyen hata"}. Manuel kod girişini deneyebilirsiniz.`;
      }
      setError(friendly);
      // ensure any half-started scanner is cleaned up
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

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) verifyCode(manualCode.trim());
    setManualCode("");
  };

  // === Result card visual config ===
  const RESULT_VISUAL = {
    approved: {
      bg: "bg-green-500", border: "border-green-600", icon: CheckCircle2,
      title: "✓ ONAYLANDI", subtitle: "Hoş geldiniz!", textColor: "text-white",
    },
    already_checked_in: {
      bg: "bg-amber-400", border: "border-amber-500", icon: Clock,
      title: "⚠ ZATEN GİRİŞ YAPMIŞ", subtitle: "Bu kart daha önce okutulmuş", textColor: "text-amber-950",
    },
    not_verified: {
      bg: "bg-orange-500", border: "border-orange-600", icon: AlertTriangle,
      title: "✗ DOĞRULANMAMIŞ", subtitle: "E-posta doğrulaması yapılmamış", textColor: "text-white",
    },
    not_found: {
      bg: "bg-red-600", border: "border-red-700", icon: XCircle,
      title: "✗ GEÇERSİZ KOD", subtitle: "Yaka kartı sistemde bulunamadı", textColor: "text-white",
    },
  };

  const visual = result ? RESULT_VISUAL[result.status] : null;
  const VisualIcon = visual?.icon;

  return (
    <div className="space-y-5" data-testid="checkin-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ScanLine size={26} className="text-summit-navy" />
            Yaka Kartı QR Tarama
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Telefon kameranızı yaka kartının QR koduna tutun. Sistem otomatik olarak doğrular.
          </p>
        </div>
        {stats && (
          <div className="flex flex-wrap gap-2">
            <span className="bg-summit-paper border border-gray-200 rounded-md px-3 py-1.5 text-xs text-summit-navy" data-testid="stat-summit">
              <strong className="text-base">{stats.summit.checked_in}</strong> / {stats.summit.verified} <span className="text-gray-500">Zirve</span>
            </span>
            <span className="bg-summit-paper border border-gray-200 rounded-md px-3 py-1.5 text-xs text-summit-navy" data-testid="stat-fair">
              <strong className="text-base">{stats.fair.checked_in}</strong> / {stats.fair.verified} <span className="text-gray-500">Fuar</span>
            </span>
            <span className="bg-summit-navy text-white rounded-md px-3 py-1.5 text-xs" data-testid="stat-total">
              <strong className="text-base">{stats.total_checked_in}</strong> / {stats.total_verified} Toplam
            </span>
          </div>
        )}
      </div>

      {/* RESULT CARD */}
      {visual && (
        <div
          className={`${visual.bg} ${visual.border} ${visual.textColor} border-2 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4`}
          data-testid={`result-${result.status}`}
        >
          <div className="flex items-start gap-4">
            <VisualIcon size={56} className="shrink-0" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <div className="font-heading text-2xl sm:text-3xl font-black tracking-wide" data-testid="result-title">
                {visual.title}
              </div>
              <div className="text-sm sm:text-base mt-1 opacity-95">{visual.subtitle}</div>
            </div>
          </div>

          {result.guest && (
            <div className="mt-4 pt-4 border-t border-white/30 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <InfoRow icon={User} label="Ad Soyad" value={result.guest.name} />
              <InfoRow icon={result.guest.visit_type === "fair" ? Store : Ticket} label="Tür" value={result.guest.visit_label} />
              {result.guest.company && <InfoRow icon={Building2} label="Şirket" value={result.guest.company} />}
              {result.guest.title && <InfoRow icon={User} label="Unvan" value={result.guest.title} />}
              {result.guest.email && <InfoRow icon={Mail} label="E-posta" value={result.guest.email} />}
              {result.guest.phone && <InfoRow icon={Phone} label="Telefon" value={result.guest.phone} />}
              {result.guest.city && <InfoRow icon={MapPin} label="Şehir" value={result.guest.city} />}
              <InfoRow icon={ScanLine} label="Kart No" value={result.guest.badge_id} />
              {result.guest.checked_in_at && (
                <InfoRow icon={Clock} label="Kayıt Saati" value={new Date(result.guest.checked_in_at).toLocaleString("tr-TR")} />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-5 w-full bg-white/20 hover:bg-white/30 text-current border border-white/40 rounded-md py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            data-testid="result-clear-btn"
          >
            <RefreshCw size={14} /> Yeni Tarama
          </button>
        </div>
      )}

      {/* SCANNER REGION */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading text-summit-navy text-lg font-bold">Kamera Tarayıcı</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {scanning ? "🔴 Aktif — QR kodu kameraya tutun" : "Tarayıcı kapalı"}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="flex-1 sm:flex-none bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                data-testid="start-scan-btn"
              >
                <Camera size={16} /> Kamerayı Başlat
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white rounded-md px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                data-testid="stop-scan-btn"
              >
                <CameraOff size={16} /> Durdur
              </button>
            )}
          </div>
        </div>

        {/* Scanner viewport */}
        <div
          id={SCANNER_ELEMENT_ID}
          className={`mx-auto w-full max-w-md aspect-square rounded-lg overflow-hidden bg-gray-900 relative
            ${scanning ? "" : "flex items-center justify-center"}`}
          style={{ minHeight: scanning ? 300 : "auto" }}
          data-testid="scanner-region"
        >
          {!scanning && (
            <div className="text-gray-400 text-center px-4">
              <Camera size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Tarayıcıyı başlatın ve QR kodu kameranıza tutun</p>
              <p className="text-xs mt-2 opacity-70">İlk kullanımda kamera izni isteyecektir</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm" data-testid="scanner-error">
            {error}
          </div>
        )}
      </div>

      {/* MANUAL ENTRY */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <button
          type="button"
          onClick={() => setShowManual(s => !s)}
          className="text-summit-navy text-sm font-semibold inline-flex items-center gap-2 hover:opacity-80"
          data-testid="manual-toggle"
        >
          <Keyboard size={15} /> {showManual ? "Manuel girişi kapat" : "Manuel kod gir (kamera çalışmıyorsa)"}
        </button>
        {showManual && (
          <form onSubmit={handleManualSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="AYZ2026-... veya guest_id"
              className="flex-1 bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-navy"
              data-testid="manual-input"
            />
            <button
              type="submit"
              className="bg-summit-navy hover:bg-summit-navy-dark text-white rounded-md px-5 py-2.5 text-sm font-semibold"
              data-testid="manual-submit"
            >
              Doğrula
            </button>
          </form>
        )}
      </div>

      {/* HELP */}
      <div className="bg-summit-paper border border-gray-200 rounded-xl p-5 text-xs text-gray-600 leading-relaxed">
        <p className="font-semibold text-summit-navy mb-2">Nasıl Kullanılır?</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Kamerayı Başlat</strong> butonuna basın. Tarayıcı kamera izni isteyecek.</li>
          <li>Yaka kartının üzerindeki kare QR kodu kameranıza yaklaştırın.</li>
          <li>Sistem otomatik olarak okur ve <span className="text-green-700 font-semibold">ONAYLANDI</span> /
            <span className="text-amber-700 font-semibold"> ZATEN GİRİŞ YAPMIŞ</span> /
            <span className="text-red-700 font-semibold"> GEÇERSİZ</span> sonucunu gösterir.
          </li>
          <li>Aynı kart ikinci kez okutulduğunda sarı uyarı verilir (mükerrer giriş engellenir).</li>
          <li>Kamera çalışmıyorsa <em>Manuel Kod Gir</em> seçeneğini kullanabilirsiniz.</li>
        </ol>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="opacity-70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="opacity-70 mr-1">{label}:</span>
        <strong className="break-words">{value}</strong>
      </div>
    </div>
  );
}
