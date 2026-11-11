# MÜESSİR

Hukuk, düşünce ve metin üzerine kişisel yayın platformu: makaleler, mevzuat kütüphanesi ve makale–kanun maddesi ilişkilendirmesi.

## Teknoloji

| Katman | Seçim |
| --- | --- |
| Uygulama | Next.js 16 (App Router), React 19, TypeScript |
| Veritabanı | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Editör | Tiptap 3 (kalın/italik/altı çizili, başlıklar, listeler, alıntı, bağlantı, tablo, Word `.docx` içe aktarma) |
| Doğrulama | Zod 4 (tüm form girdileri sunucuda doğrulanır) |
| Tasarım | Tailwind CSS 4, Source Serif 4 + Inter, açık/koyu tema |
| Kimlik doğrulama | Kendi oturum sistemi: scrypt parola özeti, veritabanında saklanan oturumlar, `httpOnly` çerez |

## Özellikler

- **Makaleler:** taslak/yayın akışı, öne çıkan yazı, kategoriler, okuma süresi, önizleme.
- **Mevzuat kütüphanesi:** 12 temel kanun (TMK, TBK, HMK, İİK, TCK, CMK, AY, İşK, İYUK, TTK, TKHK, KVKK) ve Mevzuat Bilgi Sistemi bağlantıları.
- **Tam metinler:** 12 kanunun güncel (konsolide) metni Mevzuat Bilgi Sistemi'nden alınır; bölüm başlıkları içindekilerde, madde başlıkları maddenin üstünde gösterilir, “Maddeye git” kutusu ve `#madde-49`, `#madde-68-a`, `#gecici-madde-1` bağlantıları vardır. Büyük metinler (TTK ≈ 1 MB) sayfadan ayrı, sürümlü ve CDN'de önbelleğe alınan bir adresten yüklenir.
- **Metin aktarımı denetimi:** `npm run mevzuat:aktar`, dönüştürülen metnin resmî HTML'deki kelimelerin en az %99,9'unu içerdiğini doğrulamadan hiçbir kanunu kaydetmez.
- **Resmî Gazete:** `/resmi-gazete` altında günlük sayıların fihristi ve tam metinleri. Vercel Cron her gece 01.07'de (Türkiye saati) bugünü ve önceki iki günü `resmigazete.gov.tr`'den aktarır; metinler temizlenip saklanır, PDF olarak yayımlananlar resmî kaynaktan gösterilir. Yönetim panelinden tarih aralığı elle aktarılabilir. Zamanlanmış görev `CRON_SECRET` ortam değişkeni olmadan çalışmaz.
- **Doğrulama ilkesi:** Bir kanunun metni, ancak yönetici “resmî kaynakla karşılaştırdım” kutusunu işaretlerse yayımlanır. Bunun için resmî kaynak bağlantısının `mevzuat.gov.tr` ya da `resmigazete.gov.tr` adresinde olması gerekir. Doğrulanmamış metin sitede gösterilmez.
- **Makale ↔ madde bağlantısı:** Bir makaleye “TBK m. 49” gibi atıflar eklenebilir. Makalenin altında listelenir, kanun sayfasında `#madde-49` çapasına bağlanır ve kanun sayfasında “Bu kanuna atıf yapan yazılar” bölümünde görünür.
- **Yönetim paneli (`/yonetim`):** genel bakış, makale ve mevzuat yönetimi, parola değiştirme, açık oturumları kapatma.
- **SEO:** Türkçe adresler (`/makaleler`, `/mevzuat`), `sitemap.xml`, `robots.txt`, Open Graph etiketleri. Eski `/articles`, `/laws` ve `/admin` adresleri kalıcı olarak yeni adreslere yönlendirilir.

## Güvenlik

- Her yönetim sayfası ve her yazma işlemi, sunucuda veritabanı üzerinden oturumu doğrular (`requireAdmin`). `proxy.ts` yalnızca çerezsiz istekleri erkenden yönlendirir.
- Parolalar Node'un yerleşik `scrypt` işleviyle özetlenir (N=2¹⁵, r=8, p=1). Oturum belirteci veritabanında yalnızca SHA-256 özeti olarak tutulur.
- Üretimde çerez adı `__Host-muessir_oturum`'dur: `Secure`, `httpOnly`, `SameSite=Lax`, ömrü 7 gün.
- Kaba kuvvet koruması: aynı e-posta için 15 dakikada 5, aynı IP için 20 başarısız denemeden sonra giriş kilitlenir.
- Makale HTML'i kaydederken ve gösterirken beyaz listeyle temizlenir. Mevzuat metni HTML olarak yorumlanmaz.
- Güvenlik başlıkları: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`. Yönetim sayfaları `noindex` ve `no-store` başlıklarıyla sunulur.
- Herkese açık kayıt yoktur. Yönetici hesabı yalnızca komut satırından oluşturulur.

## Kurulum (yerel)

Gereksinim: Node.js 20.9+ ve bir PostgreSQL veritabanı.

```bash
npm install
cp .env.example .env          # DATABASE_URL ve DIRECT_URL değerlerini girin
npm run db:migrate            # tabloları oluşturur
npm run db:seed               # 12 kanunluk başlangıç kataloğu
npm run yonetici:olustur -- eposta@alanadi.com "Ad Soyad"   # parola gizli olarak sorulur
npm run dev
```

Ardından `http://localhost:3000/yonetim` adresinden giriş yapın.

## Yayına alma (Vercel + Supabase)

Adım adım yayına alma rehberi için [YAYINA-ALMA.md](YAYINA-ALMA.md) dosyasına bakın. Özetle:

1. Supabase'den `DATABASE_URL` (Transaction pooler, 6543), `DIRECT_URL` (Session pooler, 5432) ve kök sertifikayı (`prod-ca-2021.crt` → `DATABASE_CA_CERT`) alın.
2. Bunları ve `NEXT_PUBLIC_SITE_URL` değişkenini Vercel'e ekleyin; fonksiyon bölgesini veritabanıyla aynı bölgeye ayarlayın.
3. Dağıtın. Migration'lar ve başlangıç kataloğu derleme sırasında otomatik uygulanır (`vercel.json` → `npm run vercel-build`).
4. Kendi bilgisayarınızda yönetici hesabını oluşturun: `npm run yonetici:olustur -- eposta@alanadi.com "Ad Soyad"`.
5. `https://alanadiniz/api/health` adresi `{"ok":true,"database":"ok"}` döndürmelidir.

> **Neden kök sertifika?** Supabase'in sertifikası kendi kök sertifikasıyla imzalıdır. Node bu kök sertifikayı tanımadığı için yalnızca `sslmode=require` kullanıldığında bağlantı “self-signed certificate in certificate chain” hatasıyla kurulamaz. `DATABASE_CA_CERT` tanımlandığında bağlantı hem şifrelenir hem de sunucunun kimliği doğrulanır.

### Eski Supabase verisini taşıma

Yeni tablolar (`article`, `law`, …), eski tablolarla (`articles`, `laws`, `admin_users`) çakışmayacak adlar taşır; aynı veritabanında yan yana durabilirler. `npm run veri:aktar` eski makaleleri ve mevzuat metinlerini yeni tablolara kopyalar ve eski tablolara dokunmaz. Aynı kısa adlı kayıt zaten varsa onu atlar, yani tekrar çalıştırmak güvenlidir. Eski “doğrulandı” işaretleri taşınmaz; her metnin yeni sistemde yeniden doğrulanması gerekir. Aktarımı kontrol ettikten sonra eski tabloları Supabase'de silebilirsiniz.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi / sunucu |
| `npm run lint` · `npm run typecheck` · `npm test` | Kalite kontrolleri |
| `npm run db:migrate` | Bekleyen migration'ları uygular |
| `npm run db:seed` | Başlangıç mevzuat kataloğu (tekrar çalıştırmak güvenlidir) |
| `npm run db:studio` | Prisma Studio ile veritabanını görüntüler |
| `npm run yonetici:olustur -- e-posta "Ad"` | Yönetici oluşturur ya da parolasını sıfırlar (tüm oturumları kapatır) |
| `npm run veri:aktar` | Eski Supabase tablolarından veri aktarır |
| `npm run mevzuat:aktar` | Kanunların güncel metnini Mevzuat Bilgi Sistemi'nden alır, denetler ve kaydeder (`-- --kuru` ile yalnızca dosyaya yazar, `-- kisa-ad` ile tek kanun) |
| `npm run resmi-gazete:aktar` | Resmî Gazete sayılarını aktarır (bağımsız değişkensiz: son üç gün; `-- 2026-11-01` tek gün; `-- 2026-10-01 2026-10-31` aralık) |

Şema değişikliği yaptığınızda `npx prisma migrate dev --name aciklama` komutuyla yeni migration oluşturun.

## Sürekli entegrasyon

`.github/workflows/ci.yml` her gönderimde şunları çalıştırır: lint, tip kontrolü, birim testleri, gerçek PostgreSQL üzerinde migration, şema ile migration'ların birebir eşleşme kontrolü, seed, derleme ve duman testi.

## Hukuki not

Bu yazılım hukuki danışmanlık sunmaz ve mevzuat metinlerinin doğruluğunu ya da güncelliğini garanti etmez. Metinleri yayımlamadan önce Mevzuat Bilgi Sistemi ve Resmî Gazete üzerinden doğrulayın.
