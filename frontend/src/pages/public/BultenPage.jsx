import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { Mail, CheckCircle2, Sparkles, ArrowRight, Calendar, GraduationCap, BookOpen } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

const SITE = "https://arsayatirimzirvesi.com";

const INTEREST_OPTIONS = [
  { v: "zirve", l: "Yıllık Zirve", icon: Calendar },
  { v: "seminer", l: "Seminerler", icon: GraduationCap },
  { v: "egitim", l: "Eğitimler & Atölyeler", icon: BookOpen },
];

export default function BultenPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interests: ["zirve", "seminer"] });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toggleInterest = (v) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter(x => x !== v) : [...f.interests, v],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      await axios.post(`${API}/newsletter/subscribe`, {
        ...form,
        source: params.get("from") || "bulten_page",
      });
      setSubmitted(true);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Kayıt oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="bulten-page">
      <Helmet>
        <title>Bülten Aboneliği | Arsa Yatırım Zirvesi — Yeni Zirve & Seminerlerden Haberdar Olun</title>
        <meta name="description" content="Arsa Yatırım Zirvesi ve Seminer bültenine abone olun. Yeni etkinliklerden, açık kayıtlardan ve özel davetlerden ilk haberi alın." />
        <meta name="keywords" content="arsa yatırım zirvesi bülten, arsa yatırım seminer haberdar ol, gayrimenkul etkinlik bülteni" />
        <link rel="canonical" href={`${SITE}/bulten`} />
        <meta property="og:title" content="Bülten Aboneliği | Arsa Yatırım Zirvesi" />
        <meta property="og:description" content="Yeni zirve ve seminerlerden ilk siz haberdar olun." />
        <meta property="og:url" content={`${SITE}/bulten`} />
      </Helmet>

      <Navbar />

      <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-200 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-500">
          <Link to="/" className="hover:text-summit-navy">Ana Sayfa</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-summit-navy font-semibold">Bülten</span>
        </div>
      </nav>

      <section className="relative bg-summit-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-summit-navy via-summit-navy to-summit-navy-dark" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute -top-40 -right-40 w-[420px] h-[420px] bg-amber-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 rounded-full px-3 py-1.5 mb-5">
            <Sparkles size={13} className="text-amber-300" />
            <span className="text-amber-300 text-[11px] uppercase tracking-[0.2em] font-bold">Bülten Aboneliği</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] mb-4">
            Yeni Zirve ve Seminerlerden<br /><span className="text-amber-400">İlk Siz Haberdar Olun</span>
          </h1>
          <h2 className="text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
            Bülten üyesi olursanız bir sonraki Arsa Yatırım Zirvesi'nden, açılan yeni seminerlerden ve özel davetlerden ilk siz haberdar olursunuz. E-posta adresinizi bırakın, yer ayırma ve davet süreçlerinde sizinle iletişime geçelim.
          </h2>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 sm:py-16 bg-summit-paper">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <SuccessCard email={form.email} />
          ) : (
            <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-5" data-testid="bulten-form">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                  <Mail size={22} className="text-amber-600" />
                </div>
                <h3 className="font-heading text-summit-navy text-xl font-bold">Abone Ol</h3>
                <p className="text-xs text-gray-500 mt-1">İletişim bilgilerinizi bırakın — yeni etkinlik açıldığında size dönüş yapalım.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Ad Soyad">
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" data-testid="bulten-name" placeholder="Ad Soyad" />
                </Field>
                <Field label="Telefon (opsiyonel)">
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="+90..." />
                </Field>
              </div>
              <Field label="E-posta *">
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" data-testid="bulten-email" placeholder="ornek@mail.com" />
              </Field>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Hangi etkinliklerden haberdar olmak istersiniz?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {INTEREST_OPTIONS.map(o => {
                    const I = o.icon;
                    const active = form.interests.includes(o.v);
                    return (
                      <button key={o.v} type="button" onClick={() => toggleInterest(o.v)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-bold border-2 transition-all ${active ? "bg-summit-navy text-white border-summit-navy" : "bg-white text-gray-600 border-gray-200 hover:border-summit-navy/30"}`}
                        data-testid={`bulten-interest-${o.v}`}>
                        <I size={14} /> {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{err}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-summit-accent hover:bg-amber-300 text-summit-navy font-heading font-bold text-base py-3.5 rounded-md inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                data-testid="bulten-submit">
                {loading ? "Gönderiliyor..." : "Bültene Abone Ol"} <ArrowRight size={16} />
              </button>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                Spam göndermiyoruz. Yalnızca yeni etkinlik duyuruları ve özel davetler. İstediğiniz zaman abonelikten çıkabilirsiniz.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function SuccessCard({ email }) {
  return (
    <div className="bg-white border border-green-200 rounded-xl shadow-md p-8 sm:p-10 text-center" data-testid="bulten-success">
      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={28} className="text-green-600" />
      </div>
      <h3 className="font-heading text-summit-navy text-2xl font-bold mb-2">Teşekkürler!</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        <strong className="text-summit-navy">{email}</strong> adresi bülten listemize başarıyla eklendi. Yeni zirve veya seminer açıldığında ilk siz haberdar olacaksınız.
      </p>
      <Link to="/" className="inline-flex items-center gap-2 text-summit-navy font-bold text-sm hover:underline">
        Ana Sayfaya Dön <ArrowRight size={14} />
      </Link>
    </div>
  );
}
