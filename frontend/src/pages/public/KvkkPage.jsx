import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Shield, Mail, Lock, Building2, FileText, AlertCircle } from "lucide-react";

export default function KvkkPage() {
  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24 bg-summit-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-summit-navy/10 px-3 py-1 rounded-md mb-4">
              <Shield size={14} className="text-summit-navy" />
              <span className="text-summit-navy text-xs font-semibold uppercase tracking-wider">KVKK Aydınlatma Metni</span>
            </div>
            <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl">Kişisel Verilerin Korunması Kanunu</h1>
            <p className="text-gray-600 mt-4 text-sm">6698 Sayılı KVKK Kapsamında Aydınlatma Metni</p>
            <p className="text-gray-500 mt-1 text-xs">Son güncelleme: Nisan 2026</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-10 space-y-8 shadow-sm">

            {/* Company Info Box */}
            <section className="bg-summit-paper rounded-md p-5 border-l-4 border-summit-navy">
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-4">
                <Building2 size={18} /> Veri Sorumlusu
              </h2>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Unvan</span>
                  <p className="text-summit-navy font-semibold">FIRAT CONSTRUCTION YAPI A.Ş.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Vergi Dairesi</span>
                    <p className="text-summit-navy">Küçükköy</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Vergi No</span>
                    <p className="text-summit-navy">3861019646</p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Adres</span>
                  <p className="text-summit-navy leading-relaxed">
                    Mustafa Kemal Paşa Mah. Gerçek Sk. Fırat Emlak<br />
                    No: 2 İç Kapı No: 3 Arnavutköy / İstanbul
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-3">
                <FileText size={18} /> Amaç ve Kapsam
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                FIRAT CONSTRUCTION YAPI A.Ş. ("Şirket") olarak; 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında siz değerli ziyaretçi, üye, katılımcı, tedarikçi ve ilgili üçüncü kişilerin kişisel verilerini, Veri Sorumlusu sıfatıyla kişisel verilerin işlenme amaçları, hukuki sebepleri, toplama yöntemleri, aktarılabileceği taraflar ve KVKK'nın 11. maddesinde yer alan haklarınıza ilişkin bilgilendirmek amacıyla işbu Aydınlatma Metni hazırlanmıştır.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                İşlenen Kişisel Veriler
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Arsa Yatırım Zirvesi 2026 organizasyonu kapsamında aşağıdaki kişisel verileriniz işlenebilir:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li><strong className="text-summit-navy">Kimlik Bilgileri:</strong> Ad, soyad, unvan</li>
                <li><strong className="text-summit-navy">İletişim Bilgileri:</strong> Telefon numarası, e-posta adresi, şehir</li>
                <li><strong className="text-summit-navy">Mesleki Bilgiler:</strong> Şirket/kurum adı, unvan, sektör, uzmanlık alanı</li>
                <li><strong className="text-summit-navy">Finansal Bilgiler (stant başvuruları için):</strong> Vergi dairesi, vergi numarası</li>
                <li><strong className="text-summit-navy">Pazarlama Tercihleri:</strong> İlgi alanı, beklentiler, katılımcı türü</li>
                <li><strong className="text-summit-navy">İşlem Güvenliği Bilgileri:</strong> IP adresi (anonimleştirilmiş), çerez kayıtları</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Kişisel Verilerin İşlenme Amaçları
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Arsa Yatırım Zirvesi 2026 etkinliğine kayıt işlemlerinin yürütülmesi</li>
                <li>Ziyaretçi, fuar stant katılımcısı ve konuşmacı/sponsor başvurularının değerlendirilmesi</li>
                <li>Katılımcı kimliği ve yaka kartı oluşturulması</li>
                <li>Etkinlik günü katılımcı tanıma ve giriş-çıkış yönetimi</li>
                <li>Etkinlik ile ilgili bilgilendirme ve duyuruların iletilmesi</li>
                <li>Sektörel içerik ve haber bülteninin gönderilmesi (açık rıza dahilinde)</li>
                <li>Site kullanımına ilişkin istatistiklerin çıkarılması ve hizmet kalitesinin iyileştirilmesi</li>
                <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Hukuki Sebepler
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Kişisel verileriniz KVKK'nın 5. ve 6. maddelerinde belirtilen hukuki sebeplere dayalı olarak işlenmektedir:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Açık rızanızın bulunması</li>
                <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması</li>
                <li>Şirketimizin hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması</li>
                <li>Temel hak ve özgürlüklerinize zarar vermemek kaydıyla, meşru menfaatlerimiz için zorunlu olması</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Kişisel Verilerin Aktarımı
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Kişisel verileriniz; yurt içinde etkinlik organizasyon hizmeti aldığımız JNR Fuarcılık ile, yaka kartı basım firması ile, e-posta hizmeti sağlayıcılarımız ile (SendGrid) ve analitik hizmet sağlayıcımız (Google Tag Manager / Google Analytics) ile kanunun 8. ve 9. maddelerine uygun olarak aktarılabilir. Yasal yükümlülüklerimiz gereği yetkili kamu kurumlarıyla da paylaşılabilir.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl mb-3">
                Veri Toplama Yöntemleri
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Kişisel verileriniz; web sitemiz üzerindeki kayıt formları, e-posta iletişimi, telefon görüşmeleri, etkinlik günü kayıt masası, sosyal medya kanalları ve çerez teknolojileri aracılığıyla otomatik ve/veya otomatik olmayan yöntemlerle elektronik ortamda toplanmaktadır.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-3">
                <Lock size={18} /> İlgili Kişinin Hakları (KVKK m.11)
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                KVKK kapsamında Şirketimize başvurarak;
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
                <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme</li>
                <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
                <li>Yapılan düzeltme, silme ve yok etme işlemlerinin kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                <li>İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
              </ul>
              <p className="text-gray-600 text-sm leading-relaxed mt-4">
                haklarına sahipsiniz.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-summit-navy text-xl flex items-center gap-2 mb-3">
                <AlertCircle size={18} /> Başvuru Yöntemi
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                KVKK'nın 11. maddesi kapsamındaki taleplerinizi aşağıdaki yöntemlerden biri ile Şirketimize iletebilirsiniz:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                <li>Yazılı olarak Şirket merkez adresimize kimliğinizi tevsik edici belgelerle birlikte başvuru dilekçesi gönderilerek</li>
                <li>Şirketimize daha önce bildirilen ve sistemimizde kayıtlı bulunan e-posta adresiniz kullanılmak suretiyle <a href="mailto:info@arsayatirimzirvesi.com" className="text-summit-navy font-semibold underline">info@arsayatirimzirvesi.com</a> adresine e-posta gönderilerek</li>
              </ul>
              <p className="text-gray-600 text-sm leading-relaxed mt-4">
                Şirketimiz, başvurularınızı en kısa sürede ve her halükarda en geç 30 (otuz) gün içerisinde sonuçlandıracaktır.
              </p>
            </section>

            <section className="bg-summit-paper rounded-md p-5 border-l-4 border-summit-accent">
              <h2 className="font-heading text-summit-navy text-lg flex items-center gap-2 mb-2">
                <Mail size={16} /> İletişim
              </h2>
              <p className="text-gray-700 text-sm mb-3">
                <strong>FIRAT CONSTRUCTION YAPI A.Ş.</strong>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Mustafa Kemal Paşa Mah. Gerçek Sk. Fırat Emlak<br />
                No: 2 İç Kapı No: 3 Arnavutköy / İstanbul<br />
                <span className="text-summit-navy font-semibold">E-posta:</span> <a href="mailto:info@arsayatirimzirvesi.com" className="text-summit-navy underline">info@arsayatirimzirvesi.com</a>
              </p>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
