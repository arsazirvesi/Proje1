import React, { useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, User, Mail, Phone, Building2, Globe, FileText, Megaphone, Award, MessageSquare } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const applicationTypes = [
  { value: "konusmaci", label: "Konuşmacı", desc: "Bireysel oturum / sunum yapmak istiyorum" },
  { value: "panelist", label: "Panelist", desc: "Panel oturumuna katılmak istiyorum" },
  { value: "sponsor", label: "Sponsor", desc: "Zirveye sponsor olmak istiyorum" },
];

const sponsorPackages = [
  { value: "ana", label: "Ana Sponsor" },
  { value: "altin", label: "Altın Sponsor" },
  { value: "gumus", label: "Gümüş Sponsor" },
  { value: "bronz", label: "Bronz Sponsor" },
  { value: "danisacagim", label: "Önce bilgi almak istiyorum" },
];

export default function SpeakerApplicationPage() {
  const [form, setForm] = useState({
    application_type: "konusmaci",
    name: "", email: "", phone: "", company: "", expertise: "",
    topic: "", bio: "", sponsor_package: "", linkedin: "", website: "", additional_notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register/speaker-application`, form);
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="bg-white min-h-screen font-body">
        <Navbar />
        <div className="pt-32 pb-24 px-4">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-md p-10 text-center shadow-lg">
            <div className="w-16 h-16 bg-summit-navy/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-summit-navy" />
            </div>
            <h2 className="font-heading text-summit-navy text-2xl">Başvurunuz Alındı!</h2>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">{result.message}</p>
            <a href="/" className="btn-navy px-8 py-3 mt-6 inline-block">Ana Sayfaya Dön</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none transition-colors";
  const labelCls = "text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold";
  const isSponsor = form.application_type === "sponsor";
  const isSpeaker = form.application_type === "konusmaci";

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Megaphone size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Konuşmacı / Panel / Sponsor</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">Başvuru Formu</h1>
            <p className="text-gray-600 mt-4 text-sm max-w-xl mx-auto">
              Zirvede yer almak için konuşmacı, panelist veya sponsor olarak başvurun. Tüm başvurular değerlendirmeye alınır.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-10 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="speaker-app-form">

              {/* Application Type */}
              <div>
                <label className={labelCls}>Başvuru Tipi *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {applicationTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({...form, application_type: t.value})}
                      className={`text-left p-4 rounded-md border-2 transition-all ${
                        form.application_type === t.value
                          ? "border-summit-navy bg-summit-navy/5"
                          : "border-gray-200 hover:border-summit-navy/40"
                      }`}
                      data-testid={`type-${t.value}`}
                    >
                      <div className="font-heading text-summit-navy text-sm font-semibold mb-1">{t.label}</div>
                      <div className="text-gray-500 text-xs">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 pb-2 border-t border-gray-100">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Kişi / Firma Bilgileri</h3>
                <p className="text-xs text-gray-500">İletişim bilgilerinizi girin</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Ad Soyad / Firma *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder={isSponsor ? "Firma Adı" : "Ad Soyad"} value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className={inputCls} data-testid="input-sp-name" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{isSponsor ? "Yetkili E-posta" : "E-posta"} *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" required placeholder="ornek@email.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className={inputCls} data-testid="input-sp-email" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefon *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" required placeholder="+90 5XX XXX XXXX" value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className={inputCls} data-testid="input-sp-phone" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{isSponsor ? "Sektör" : "Şirket / Kurum"}</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder={isSponsor ? "Sektör" : "Şirket adı"} value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      className={inputCls} data-testid="input-sp-company" />
                  </div>
                </div>
              </div>

              {!isSponsor && (
                <>
                  <div className="pt-4 pb-2 border-t border-gray-100">
                    <h3 className="font-heading text-summit-navy text-lg mb-1">Uzmanlık Bilgileri</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Uzmanlık Alanı</label>
                      <div className="relative">
                        <Award size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" placeholder="Gayrimenkul Hukuku / Yatırım vb." value={form.expertise}
                          onChange={e => setForm({...form, expertise: e.target.value})}
                          className={inputCls} data-testid="input-sp-expertise" />
                      </div>
                    </div>
                    {isSpeaker && (
                      <div>
                        <label className={labelCls}>Konu Başlığı</label>
                        <div className="relative">
                          <MessageSquare size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="text" placeholder="Sunum konunuzun başlığı" value={form.topic}
                            onChange={e => setForm({...form, topic: e.target.value})}
                            className={inputCls} data-testid="input-sp-topic" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Kısa Bio / CV</label>
                    <textarea rows={4} placeholder="Mesleki geçmişiniz ve zirveye katkınız hakkında kısa bilgi..."
                      value={form.bio}
                      onChange={e => setForm({...form, bio: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                      data-testid="input-sp-bio" />
                  </div>
                </>
              )}

              {isSponsor && (
                <>
                  <div className="pt-4 pb-2 border-t border-gray-100">
                    <h3 className="font-heading text-summit-navy text-lg mb-1">Sponsorluk Bilgileri</h3>
                  </div>
                  <div>
                    <label className={labelCls}>İlgilendiğiniz Sponsor Paketi</label>
                    <select value={form.sponsor_package}
                      onChange={e => setForm({...form, sponsor_package: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                      data-testid="input-sp-package">
                      <option value="">Seçiniz</option>
                      {sponsorPackages.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Paket fiyatlandırması için ekibimiz sizinle iletişime geçecektir.</p>
                  </div>
                </>
              )}

              <div className="pt-4 pb-2 border-t border-gray-100">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Ek Bilgiler</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>LinkedIn</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin}
                      onChange={e => setForm({...form, linkedin: e.target.value})}
                      className={inputCls} data-testid="input-sp-linkedin" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Web Sitesi</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="url" placeholder="https://www..." value={form.website}
                      onChange={e => setForm({...form, website: e.target.value})}
                      className={inputCls} data-testid="input-sp-website" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Eklemek İstediğiniz Notlar</label>
                <textarea rows={3} placeholder="Ek notlarınız varsa buraya yazabilirsiniz..."
                  value={form.additional_notes}
                  onChange={e => setForm({...form, additional_notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                  data-testid="input-sp-notes" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="sp-error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-navy py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-sp-btn">
                {loading ? "Başvuru Gönderiliyor..." : "Başvuruyu Gönder"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Başvurunuz değerlendirildikten sonra ekibimiz sizinle iletişime geçecektir.
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
