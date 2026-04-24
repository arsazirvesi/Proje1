import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Shield, Cookie, Mail, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Shield size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">Gizlilik & Çerez Politikası</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">Gizlilik Politikası</h1>
            <p className="text-gray-600 mt-4 text-sm">Son güncelleme: Nisan 2026</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-10 space-y-8 shadow-sm">

            <section>
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-3">
                <Lock size={18} /> Veri Sorumlusu
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Bu site, Arsa Yatırım Zirvesi 2026 organizasyonu adına Fırat İnşaat & Gayrimenkul tarafından yönetilmektedir. Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlenir.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-3">
                <Cookie size={18} /> Çerez Kullanımı
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Sitemizde aşağıdaki türde çerezler kullanılmaktadır:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li><strong className="text-summit-navy">Zorunlu çerezler:</strong> Sitenin düzgün çalışması için gereklidir (oturum, güvenlik).</li>
                <li><strong className="text-summit-navy">Analitik çerezler:</strong> Google Analytics aracılığıyla anonim ziyaret istatistikleri toplanır. IP adresleri anonimleştirilir.</li>
              </ul>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                Analitik çerezleri istediğiniz zaman tarayıcı ayarlarınızdan temizleyebilir veya onayınızı geri çekmek için site çerezlerini silebilirsiniz.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Toplanan Veriler
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Kayıt formlarımız aracılığıyla aşağıdaki verileri topluyoruz:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Ad, soyad, e-posta, telefon numarası</li>
                <li>Şirket / kurum bilgileri (opsiyonel)</li>
                <li>Şehir, ilgi alanı, beklentiler (opsiyonel)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Verilerin Kullanım Amacı
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Etkinlik kayıt işlemlerinin gerçekleştirilmesi</li>
                <li>Yaka kartı oluşturulması ve etkinlik günü tanıma</li>
                <li>Etkinlik duyurularının iletilmesi</li>
                <li>Sektörel bilgilendirme e-postalarının gönderilmesi</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Haklarınız
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                KVKK kapsamında verilerinize erişme, düzeltme, silinmesini talep etme ve işlenmesine itiraz etme hakkına sahipsiniz. Taleplerinizi aşağıdaki iletişim kanalından bize iletebilirsiniz.
              </p>
            </section>

            <section className="bg-summit-paper rounded-md p-5 border-l-4 border-summit-navy">
              <h2 className="font-heading text-summit-navy text-lg flex items-center gap-2 mb-2">
                <Mail size={16} /> İletişim
              </h2>
              <p className="text-gray-600 text-sm">
                Gizlilik ile ilgili sorularınız için: <a href="mailto:info@arsayatirimzirvesi.com" className="text-summit-navy font-semibold">info@arsayatirimzirvesi.com</a>
              </p>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
