import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CheckCircle, User, Mail, Phone, Building2, Globe, FileText, Hash, Briefcase, Layers } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const standOptions = [
  { value: "6m2", label: "6 m² Standart Stant" },
  { value: "9m2", label: "9 m² Orta Stant" },
  { value: "12m2", label: "12 m² Büyük Stant" },
  { value: "ozel", label: "Özel Tasarım / Geniş Alan" },
  { value: "danisacagim", label: "Önce bilgi almak istiyorum" },
];

const sectors = [
  "Gayrimenkul Geliştirme", "İnşaat", "Emlak Danışmanlık", "Mimarlık",
  "Hukuk Danışmanlığı", "Finans / Bankacılık", "Proje Pazarlama",
  "Gayrimenkul Değerleme", "Yatırım Danışmanlığı", "Teknoloji / PropTech", "Diğer"
];

export default function ExhibitorRegisterPage() {
  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    tax_office: "", tax_number: "", sector: "", stand_preference: "",
    products_services: "", website: "", social_media: "", notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register/exhibitor`, form);
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
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">
              {result.message}
            </p>
            <p className="text-gray-500 text-xs mt-4">Stant alanı ve fiyatlandırma için en kısa sürede sizi arayacağız.</p>
            <a href="/" className="btn-navy px-8 py-3 mt-6 inline-block">Ana Sayfaya Dön</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none transition-colors";
  const selectCls = "w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none";
  const labelCls = "text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold";

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Building2 size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Fuar Stant Kaydı</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">Stant Alanı Başvurusu</h1>
            <p className="text-gray-600 mt-4 text-sm max-w-xl mx-auto">
              Zirvede şirketinizi tanıtın, hedef kitlenizle doğrudan iletişim kurun. Başvurunuzu alır almaz ekibimiz sizinle iletişime geçecek.
            </p>
            <Link
              to="/fuar-alani"
              className="inline-flex items-center gap-1.5 mt-4 text-summit-navy font-semibold text-xs hover:text-summit-accent transition-colors border-b border-summit-navy/30 hover:border-summit-accent pb-0.5"
              data-testid="exhibitor-fair-link"
            >
              Fuar Alanı ve Stant Krokisini İncele →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-10 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="exhibitor-register-form">

              <div className="pb-2">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Firma Bilgileri</h3>
                <p className="text-xs text-gray-500">Şirket iletişim bilgilerinizi giriniz</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Firma Adı *</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder="ABC İnşaat A.Ş." value={form.company_name}
                      onChange={e => setForm({...form, company_name: e.target.value})}
                      className={inputCls} data-testid="input-exh-company" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Yetkili Kişi *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" required placeholder="Ad Soyad" value={form.contact_name}
                      onChange={e => setForm({...form, contact_name: e.target.value})}
                      className={inputCls} data-testid="input-exh-contact" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>E-posta *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" required placeholder="ornek@firma.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className={inputCls} data-testid="input-exh-email" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefon *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" required placeholder="+90 5XX XXX XXXX" value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      className={inputCls} data-testid="input-exh-phone" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Vergi Dairesi</label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Kadıköy" value={form.tax_office}
                      onChange={e => setForm({...form, tax_office: e.target.value})}
                      className={inputCls} data-testid="input-exh-tax-office" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Vergi Numarası</label>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="1234567890" value={form.tax_number}
                      onChange={e => setForm({...form, tax_number: e.target.value})}
                      className={inputCls} data-testid="input-exh-tax-no" />
                  </div>
                </div>
              </div>

              <div className="pt-4 pb-2 border-t border-gray-100">
                <h3 className="font-heading text-summit-navy text-lg mb-1">Stant Bilgileri</h3>
                <p className="text-xs text-gray-500">Stant tercihinizi ve sergilenecek ürün/hizmetleri belirtin</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Sektör</label>
                  <select value={form.sector}
                    onChange={e => setForm({...form, sector: e.target.value})}
                    className={selectCls} data-testid="input-exh-sector">
                    <option value="">Seçiniz</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Stant Tercihi</label>
                  <div className="relative">
                    <Layers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" />
                    <select value={form.stand_preference}
                      onChange={e => setForm({...form, stand_preference: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                      data-testid="input-exh-stand">
                      <option value="">Seçiniz</option>
                      {standOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Sergilenecek Ürün / Hizmet</label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-gray-500" />
                  <textarea rows={3} placeholder="Stantınızda tanıtacağınız ürün ve hizmetler hakkında bilgi verin..."
                    value={form.products_services}
                    onChange={e => setForm({...form, products_services: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                    data-testid="input-exh-products" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Web Sitesi</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="url" placeholder="https://www.firma.com" value={form.website}
                      onChange={e => setForm({...form, website: e.target.value})}
                      className={inputCls} data-testid="input-exh-website" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Sosyal Medya</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Instagram / LinkedIn kullanıcı adı" value={form.social_media}
                      onChange={e => setForm({...form, social_media: e.target.value})}
                      className={inputCls} data-testid="input-exh-social" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Ek Notlar</label>
                <textarea rows={2} placeholder="Özel talepleriniz / beklentileriniz"
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none resize-none"
                  data-testid="input-exh-notes" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" data-testid="exh-error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-navy py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="submit-exh-btn">
                {loading ? "Başvuru Gönderiliyor..." : "Stant Başvurusunu Gönder"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Başvurunuz değerlendirildikten sonra ekibimiz sizinle stant fiyatlandırması ve detayları için iletişime geçecektir.
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
