import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { CONTACT } from '@/lib/contact';

const DESCRIPTION = `${SITE_NAME} sitesinde kullanılan çerezler, tarayıcıda saklanan tercihler ve kişisel verilerin işlenmesi hakkında bilgilendirme.`;
const UPDATED = '12 Kasım 2026';

export const metadata: Metadata = {
  title: 'Gizlilik ve Çerezler',
  description: DESCRIPTION,
  openGraph: { title: `Gizlilik ve Çerezler · ${SITE_NAME}`, description: DESCRIPTION, siteName: SITE_NAME, locale: 'tr_TR' },
  alternates: { canonical: '/gizlilik' },
};

export default function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl pt-14">
      <p className="eyebrow">Bilgilendirme</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Gizlilik ve Çerezler</h1>
      <p className="mt-4 text-sm text-muted">Son güncelleme: {UPDATED}</p>

      <div className="prose-tekellum mt-10">
        <p>
          Bu sayfa, {SITE_NAME} sitesini ziyaret ettiğinizde hangi bilgilerin işlendiğini, nerede saklandığını ve
          haklarınızı açıklar. Site reklam göstermez; ziyaretçileri izleyen, profil çıkaran ya da istatistik toplayan
          herhangi bir çerez veya analiz aracı kullanmaz.
        </p>

        <h2>Veri sorumlusu</h2>
        <p>
          {CONTACT.name} · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </p>

        <h2>Çerezler</h2>
        <p>Sitede yalnızca bir çerez bulunur ve bu çerez sıradan ziyaretçilerde hiç oluşmaz:</p>
        <ul>
          <li>
            <strong>Oturum çerezi</strong> (<code>__Host-tekellum_oturum</code>): Yalnızca site yöneticisi yönetim
            paneline giriş yaptığında oluşturulur ve oturumun açık kalmasını sağlar. Sitenin çalışması için zorunlu bir
            çerezdir; başka sitelerce okunamaz ve çıkış yapıldığında silinir.
          </li>
        </ul>
        <p>Zorunlu çerez dışında çerez kullanılmadığından ayrıca onayınız istenmez.</p>

        <h2>Tarayıcınızda saklanan tercihler</h2>
        <p>
          Aşağıdaki iki tercih, çerez olarak değil tarayıcınızın yerel depolamasında (localStorage) tutulur. Sunucuya
          gönderilmez, yalnızca sizin cihazınızda kalır ve tarayıcı ayarlarından ya da site verilerini temizleyerek
          silebilirsiniz:
        </p>
        <ul>
          <li>
            <strong>Tema tercihi</strong> (<code>tekellum-tema</code>): Açık/koyu tema düğmesine bastığınızda
            seçiminizi hatırlar.
          </li>
          <li>
            <strong>Konum tercihi</strong> (<code>tekellum-konum</code>): Ana sayfadaki hava durumunda &ldquo;Konumumu
            kullan&rdquo; düğmesine basıp tarayıcınızın konum iznini onayladığınızda, yaklaşık 1 km&apos;ye yuvarlanmış
            konumunuzu hatırlar. &ldquo;Yaklaşık konuma dön&rdquo; dediğinizde silinir.
          </li>
        </ul>

        <h2>Hava durumu</h2>
        <p>
          Ana sayfadaki hava durumu için konum bilgisi, bağlandığınız internet adresinden barındırma hizmeti tarafından
          yaklaşık olarak (şehir düzeyinde) belirlenir; izin verdiyseniz tarayıcınızın paylaştığı yuvarlanmış konum
          kullanılır. Bu koordinatlar yalnızca hava durumunu almak için Open-Meteo hizmetine iletilir ve sitede
          saklanmaz.
        </p>

        <h2>İletişim formu</h2>
        <p>
          İletişim formu aracılığıyla gönderdiğiniz <strong>ad soyad, e-posta adresi, konu ve mesaj</strong> bilgileri
          yalnızca mesajınızı okumak ve size yanıt vermek amacıyla işlenir; üçüncü kişilerle paylaşılmaz ve pazarlama
          amacıyla kullanılmaz. Kötüye kullanımı (toplu ve otomatik gönderimleri) önlemek için internet adresinizin
          kendisi değil, geri döndürülemeyen bir özeti kaydedilir. Mesajlar en fazla bir yıl saklanır, ardından
          kendiliğinden silinir.
        </p>

        <h2>Belge dönüştürücü</h2>
        <p>
          <Link href="/donusturucu">Belge dönüştürücüye</Link> yüklediğiniz dosyalar hiçbir sunucuya gönderilmez;
          dönüştürme tamamen tarayıcınızın içinde, kendi cihazınızda yapılır.
        </p>

        <h2>Barındırma ve teknik kayıtlar</h2>
        <p>
          Site Vercel tarafından barındırılır; içerik ve iletişim mesajları Supabase üzerindeki veritabanında tutulur.
          Sunucular Almanya&apos;dadır (Frankfurt). Bu hizmet sağlayıcıları, sitenin güvenli ve kesintisiz çalışması
          için internet adresi ve tarayıcı bilgisi gibi teknik bağlantı kayıtlarını kendi politikaları çerçevesinde
          sınırlı süreyle tutabilir.
        </p>

        <h2>Haklarınız</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi uyarınca kişisel verilerinizin işlenip
          işlenmediğini öğrenme, işlenmişse bilgi talep etme, düzeltilmesini veya silinmesini isteme ve diğer
          haklarınızı kullanmak için <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> adresine yazabilirsiniz.
        </p>
      </div>
    </article>
  );
}
