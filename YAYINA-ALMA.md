# Müessir'i yayına alma rehberi

Üç hizmet kullanılır: **GitHub** (kod; hazır), **Supabase** (veritabanı) ve **Vercel** (siteyi çalıştıran sunucu). Kendi bilgisayarınızda yalnızca bir kez, yönetici hesabını oluşturmak için komut çalıştırırsınız. Toplam süre yaklaşık 30–45 dakikadır.

---

## 1. Supabase: veritabanını hazırlayın

1. [supabase.com](https://supabase.com) adresinde oturum açın. Eski sürüm için oluşturduğunuz bir proje varsa onu kullanabilirsiniz; yoksa **New project** düğmesine basın.
   - **Name:** `muessir`
   - **Database Password:** Güçlü bir parola belirleyin ve güvenli bir yere kaydedin. **Yalnızca harf ve rakam kullanın.** `@ # / ? %` gibi karakterler bağlantı adresini bozar.
   - **Region:** *Central EU (Frankfurt)*. Türkiye'ye en yakın bölge budur.
2. Proje hazır olunca sayfanın üstündeki **Connect** düğmesine basın ve iki adresi kopyalayın:
   - **Transaction pooler** (adresin sonunda `:6543/postgres`) → bu **`DATABASE_URL`** olacak.
   - **Session pooler** (adresin sonunda `:5432/postgres`) → bu **`DIRECT_URL`** olacak.
   - Her iki adreste `[YOUR-PASSWORD]` yazan yere, köşeli parantezler dahil, kendi parolanızı yazın.
3. **Project Settings → Database → SSL Configuration → Download certificate** ile `prod-ca-2021.crt` dosyasını indirin. Not Defteri ya da TextEdit ile açın; `-----BEGIN CERTIFICATE-----` satırından `-----END CERTIFICATE-----` satırına kadar tüm içerik **`DATABASE_CA_CERT`** olacak.

## 2. Vercel: ortam değişkenlerini girin

**Vercel'de proje zaten varsa:** Projeyi açın, **Settings → Environment Variables** bölümüne gidin.
**Henüz yoksa:** Önce 3. adımı yapın. Ardından [vercel.com](https://vercel.com) adresinde **Add New → Project** ile `muessir` deposunu içe aktarın ve **Deploy** düğmesine basmadan önce aşağıdaki değişkenleri **Environment Variables** bölümüne girin.

| Değişken | Değer |
| --- | --- |
| `DATABASE_URL` | Transaction pooler adresi (6543) |
| `DIRECT_URL` | Session pooler adresi (5432) |
| `DATABASE_CA_CERT` | `prod-ca-2021.crt` dosyasının tüm içeriği |
| `NEXT_PUBLIC_SITE_URL` | Sitenin adresi, ör. `https://muessir.vercel.app` (alan adı bağlayınca güncellenir) |

- Eski `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` değişkenlerini silin; artık kullanılmıyorlar.
- **Settings → Functions → Function Region** ayarını **Frankfurt (fra1)** yapın. Sunucu veritabanıyla aynı bölgede olunca sayfalar belirgin biçimde hızlı açılır.

> Vercel'de bir değişkeni değiştirdiğinizde bu değişiklik yalnızca **yeni** dağıtımlarda geçerli olur. Değişkeni sonradan düzelttiyseniz **Deployments → son dağıtım → ⋯ → Redeploy** yapın.

## 3. Kodu ana dala alın

GitHub'da **Pull requests → “Prisma + Tiptap düzenine geçiş” → Merge pull request → Confirm merge** adımlarını izleyin.

Vercel siteyi kendiliğinden yeniden dağıtır. Derleme sırasında veritabanı tabloları oluşturulur ve 12 kanunluk katalog yüklenir. Dağıtımın **Build Logs** bölümünde şu satırları görmelisiniz:

```
All migrations have been successfully applied.
Mevzuat kataloğu: 12 yeni kayıt eklendi
```

## 4. Siteyi kontrol edin

- `https://SITENIZ/api/health` → `{"ok":true,"database":"ok",…}`
- `https://SITENIZ/mevzuat` → 12 kanun listelenir.

## 5. Yönetici hesabınızı oluşturun (kendi bilgisayarınızda, bir kez)

1. Kurulu değilse [nodejs.org](https://nodejs.org) adresinden **LTS** sürümünü ve [git-scm.com](https://git-scm.com) adresinden Git'i kurun.
2. Bir terminal açın (Windows'ta PowerShell, Mac'te Terminal):
   ```bash
   git clone https://github.com/onurbuyukcanavar/muessir.git
   cd muessir
   npm install
   ```
3. Ayar dosyasını oluşturun. Windows'ta `copy .env.example .env`, Mac'te `cp .env.example .env` komutunu çalıştırın. Ardından `.env` dosyasını açıp `DATABASE_URL`, `DIRECT_URL` ve `DATABASE_CA_CERT` değerlerini 1. adımdaki gibi doldurun.
4. Yönetici hesabını oluşturun:
   ```bash
   npm run yonetici:olustur -- eposta@adresiniz.com "Onur"
   ```
   Parola iki kez sorulur ve yazarken ekranda görünmez. En az 12 karakter olmalıdır.
5. `https://SITENIZ/yonetim` adresinden giriş yapın.

Eski Supabase sürümünde içerik girdiyseniz aynı klasörde `npm run veri:aktar` komutunu çalıştırın. Eski tablolara dokunmaz ve tekrar çalıştırmak güvenlidir.

`.env` dosyası veritabanı parolanızı içerir; kimseyle paylaşmayın. Git bu dosyayı zaten yok sayar.

## 6. Alan adı bağlayın (isteğe bağlı)

1. Vercel'de **Settings → Domains → Add** ile alan adınızı girin.
2. Vercel'in gösterdiği DNS kayıtlarını, alan adını aldığınız firmanın panelinde (GoDaddy, Natro, İsimtescil vb.) ekleyin. Yayılması birkaç dakika ile birkaç saat sürebilir.
3. `NEXT_PUBLIC_SITE_URL` değişkenini `https://alanadiniz.com` olarak güncelleyin ve **Redeploy** yapın.

## 7. İlk içerik

- **Yönetim → Mevzuat:** Bir kanunu açın. Metnini Mevzuat Bilgi Sistemi'nden yapıştırın ve “resmî kaynakla karşılaştırdım” kutusunu işaretleyip kaydedin. Kutu işaretlenmeden metin sitede görünmez.
- **Yönetim → Makaleler → Yeni makale:** Yazın ya da Word dosyası içe aktarın, ilgili kanun maddelerini ekleyin, **Yayında** seçip kaydedin.

---

## Bilmeniz gerekenler

- **Supabase ücretsiz planı**, 7 gün boyunca hiç etkinlik görmeyen projeyi duraklatır; bu durumda site veritabanına ulaşamaz. Bunu önlemenin iki yolu var:
  - UptimeRobot gibi ücretsiz bir izleme hizmetiyle `https://SITENIZ/api/health` adresini günde birkaç kez yoklatın. Bu hem duraklamayı önler hem de site çökerse size e-posta gönderir.
  - Pro plana geçin (aylık 25 $). Pro planda duraklama olmaz ve günlük yedek alınır.
- **Yedekleme:** Ücretsiz planda otomatik yedek yoktur. İçerik biriktikçe ya Pro plana geçin ya da düzenli olarak `pg_dump` ile yedek alın.

## Sorun giderme

| Belirti | Neden / çözüm |
| --- | --- |
| `self-signed certificate in certificate chain` | `DATABASE_CA_CERT` eksik ya da eksik kopyalanmış. BEGIN/END satırları dahil tamamını yapıştırıp Redeploy yapın. |
| `password authentication failed` | Parola yanlış ya da özel karakter içeriyor. Supabase'de **Database → Reset database password** ile yalnızca harf ve rakamdan oluşan yeni bir parola belirleyin ve iki adresi güncelleyin. |
| `Tenant or user not found` | Adres eksik kopyalanmış. Kullanıcı adı `postgres.PROJEKODU` biçiminde olmalıdır. |
| `/api/health` → `"database":"erisilemiyor"` | Değişkenler girildi ama Redeploy yapılmadı ya da Supabase projesi duraklatılmış (Supabase panelinde **Resume project**). |
| Giriş sayfası açılıyor ama giriş olmuyor | 5. adım yapılmamış olabilir. 5 hatalı denemeden sonra giriş 15 dakika kilitlenir. |
| Parolanızı unuttunuz | 5. adımdaki komutu aynı e-postayla tekrar çalıştırın; parola sıfırlanır ve tüm oturumlar kapanır. |
