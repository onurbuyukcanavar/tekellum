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

Supabase'i yalnızca PostgreSQL sunucusu olarak kullanmaya devam edebilirsiniz; artık Supabase Auth ya da API anahtarına gerek yoktur.

1. **Supabase → Project Settings → Database → Connection string** bölümünden iki bağlantıyı alın:
   - `DATABASE_URL`: **Transaction pooler** (6543 portu). Uygulama bunu kullanır.
   - `DIRECT_URL`: **Session pooler** (5432 portu) ya da doğrudan bağlantı. Migration'lar bunu kullanır.
2. **Vercel → Project → Settings → Environment Variables** bölümüne `DATABASE_URL`, `DIRECT_URL` ve `NEXT_PUBLIC_SITE_URL` (son HTTPS adresi) değişkenlerini ekleyin. Eski `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` değişkenleri silinebilir.
3. Dağıtın. `vercel.json`, derleme sırasında bekleyen migration'ları otomatik uygular (`npm run vercel-build`).
4. Kendi bilgisayarınızda `.env` dosyasına aynı `DIRECT_URL` değerini yazıp bir kez çalıştırın:
   ```bash
   npm run db:seed
   npm run yonetici:olustur -- eposta@alanadi.com "Ad Soyad"
   npm run veri:aktar        # yalnızca eski Supabase sürümünde içerik girdiyseniz
   ```
5. `https://alanadiniz/api/health` adresi `{"ok":true,"database":"ok"}` döndürmelidir.

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

Şema değişikliği yaptığınızda `npx prisma migrate dev --name aciklama` komutuyla yeni migration oluşturun.

## Sürekli entegrasyon

`.github/workflows/ci.yml` her gönderimde şunları çalıştırır: lint, tip kontrolü, birim testleri, gerçek PostgreSQL üzerinde migration, şema ile migration'ların birebir eşleşme kontrolü, seed, derleme ve duman testi.

## Hukuki not

Bu yazılım hukuki danışmanlık sunmaz ve mevzuat metinlerinin doğruluğunu ya da güncelliğini garanti etmez. Metinleri yayımlamadan önce Mevzuat Bilgi Sistemi ve Resmî Gazete üzerinden doğrulayın.
