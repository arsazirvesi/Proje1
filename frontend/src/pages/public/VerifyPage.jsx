import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, XCircle, Mail, Ticket, Store, ArrowRight, ExternalLink } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | already | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Doğrulama anahtarı bulunamadı. Lütfen e-postanızdaki linke tekrar tıklayın.");
      return;
    }
    axios
      .get(`${API}/verify/guest?token=${encodeURIComponent(token)}`)
      .then((r) => {
        setData(r.data);
        setStatus(r.data.already_verified ? "already" : "success");
      })
      .catch((e) => {
        setErrorMsg(e?.response?.data?.detail || "Doğrulama başarısız oldu. Link geçersiz veya süresi dolmuş olabilir.");
        setStatus("error");
      });
  }, [token]);

  const isFair = data?.visit_type === "fair";
  const themeNavy = !isFair;
  const Icon = isFair ? Store : Ticket;
  const eventName = isFair ? "8. Gayrimenkul Proje Yatırım Fuarı" : "Arsa Yatırım Zirvesi 2026";
  const dateLine = isFair ? "20-21 Mayıs 2026" : "21 Mayıs 2026, Perşembe";
  const badgeUrl = data?.badge_url ? `${API.replace(/\/api$/, "")}${data.badge_url}` : null;

  return (
    <div className="bg-white min-h-screen font-body" data-testid="verify-page">
      <Navbar />
      <div className="pt-28 pb-24 px-4 bg-summit-paper min-h-screen">
        <div className="max-w-lg mx-auto">
          {/* Loading */}
          {status === "loading" && (
            <div className="bg-white border border-gray-200 rounded-md p-12 text-center shadow-lg">
              <div className="w-12 h-12 mx-auto mb-5 border-3 border-summit-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-summit-navy text-sm font-medium">Doğrulanıyor...</p>
            </div>
          )}

          {/* Success (first-time verification) */}
          {status === "success" && (
            <div className="bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg" data-testid="verify-success">
              <div className={`w-20 h-20 ${themeNavy ? "bg-summit-navy/10" : "bg-summit-accent/20"} rounded-full flex items-center justify-center mx-auto mb-6`}>
                <CheckCircle size={40} className={themeNavy ? "text-summit-navy" : "text-summit-navy"} />
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded mb-3 ${themeNavy ? "bg-summit-navy/10 text-summit-navy" : "bg-summit-accent/20 text-summit-navy"}`}>
                <Icon size={12} /> {isFair ? "Fuar Ziyareti" : "Zirve Katılımı"}
              </span>
              <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl mt-1">E-postanız Doğrulandı!</h1>
              <p className="text-gray-600 text-sm mt-4 leading-relaxed">
                Hoş geldiniz <strong>{data?.name}</strong>! {eventName} için kaydınız başarıyla tamamlandı.
              </p>

              {/* Sequence number card */}
              {data?.sequence && (
                <div className="bg-summit-paper rounded-md border-l-4 border-summit-navy p-5 mt-6 text-left">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1 font-semibold">Sıra Numaranız</p>
                  <p className="text-summit-navy font-heading text-3xl font-bold">#{data.sequence}</p>
                  <p className="text-gray-500 text-xs mt-2">{dateLine} · Hilton İstanbul Bosphorus</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-summit-navy/5 rounded-md p-4 mt-5 text-left">
                <p className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                  <Mail size={16} className="text-summit-navy shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-summit-navy">Yaka kartınız</strong> az önce e-postanıza gönderildi.
                    Etkinlik günü yazdırıp getirebilir ya da telefonunuzdaki QR'ı kayıt masasında okutabilirsiniz.
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {badgeUrl && (
                  <a
                    href={badgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-navy px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
                    data-testid="verify-view-badge-btn"
                  >
                    Yaka Kartımı Aç <ExternalLink size={14} />
                  </a>
                )}
                <Link to="/" className="flex-1 btn-outline-navy px-5 py-3 text-sm text-center">
                  Ana Sayfa
                </Link>
              </div>
            </div>
          )}

          {/* Already verified */}
          {status === "already" && (
            <div className="bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg" data-testid="verify-already">
              <div className="w-16 h-16 bg-summit-navy/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-summit-navy" />
              </div>
              <h1 className="font-heading text-summit-navy text-2xl">Zaten Doğrulanmış</h1>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                {data?.name ? <><strong>{data.name}</strong>, </> : ""}kaydınız daha önce doğrulanmış.
                Etkinlik günü görüşmek üzere!
              </p>
              <Link to="/" className="btn-outline-navy px-8 py-3 mt-6 inline-flex items-center gap-2">
                Ana Sayfaya Dön <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="bg-white border border-red-200 rounded-md p-10 text-center shadow-lg" data-testid="verify-error">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h1 className="font-heading text-summit-navy text-2xl">Doğrulama Başarısız</h1>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{errorMsg}</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link to="/ziyaretci-kaydi" className="flex-1 btn-navy px-5 py-3 text-sm">
                  Yeniden Kayıt Ol
                </Link>
                <Link to="/" className="flex-1 btn-outline-navy px-5 py-3 text-sm">
                  Ana Sayfa
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
