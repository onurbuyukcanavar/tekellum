import { describe, expect, it } from 'vitest';
import {
  addDays, cleanItemHtml, decodeHtml, indexUrl, isDateKey, issueSlug, parseIndex, parseIssueSlug, textOf, titleCaseTr, todayKey,
} from '@/lib/gazette/source';

// Gerçek fihrist sayfalarının (resmigazete.gov.tr/eskiler/…) sadeleştirilmiş yapısı.
const INDEX = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1254"></head><body>
<table><tr><td><p align=center><b><span>11 Kasım 2026</span></b><b><span> Tarihli ve 33427 Sayılı Resmî
 Gazete</span></b></p></td><td><p><b>MEVZUAT</b></p></td></tr>
<tr><td colspan=2><a href="20261111.pdf"><img src="reader_128.jpg"></a></td></tr></table>
<p><b><u>YÜRÜTME VE İDARE BÖLÜMÜ</u></b></p>
<p>&nbsp;</p>
<p><b>CUMHURBAŞKANI KARARI</b></p>
<p>–– <a href="20261111-1.pdf">Birleşmiş Milletler Güvenlik Konseyi Kararlarına İlişkin Karar</a></p>
<p><b>YÖNETMELİK</b></p>
<p>–– <a href="20261111-2.htm">Piri Reis Üniversitesi Ön Lisans ve Lisans Eğitim-Öğretim ve
 Sınav Yönetmeliğinde Değişiklik Yapılmasına Dair Yönetmelik</a></p>
<p><b>TBMM KARARI</b></p>
<p><a href="20261111-3.htm">1475 Sayıştayda Boş Bulunan Üyelik İçin Yapılan Seçime Dair Karar</a></p>
<p><b><u>İLÂN BÖLÜMÜ</u></b></p>
<p><a href="http://www.resmigazete.gov.tr/main.aspx?home=http://www.resmigazete.gov.tr/ilanlar/eskiilanlar/2026/11/20261111.htm&main=http://www.resmigazete.gov.tr/ilanlar/eskiilanlar/2026/11/20261111-2.htm">a - Yargı İlânları</a></p>
<p><a href="http://www.resmigazete.gov.tr/main.aspx?home=x&main=http://www.resmigazete.gov.tr/ilanlar/eskiilanlar/2026/11/20261111-5.htm">– T.C. Merkez Bankasınca Belirlenen Döviz Kurları</a></p>
<p>Resmî Gazete'nin kurumsal mobil uygulaması Android ve Apple marketlerde yerini almıştır.</p>
</body></html>`;

const URL_11 = indexUrl('2026-11-11');

describe('tarih ve adresler', () => {
  it('fihrist adresini kurar', () => {
    expect(URL_11).toBe('https://www.resmigazete.gov.tr/eskiler/2026/11/20261111.htm');
    expect(indexUrl('2025-12-31', 2)).toBe('https://www.resmigazete.gov.tr/eskiler/2025/12/20251231M2.htm');
  });

  it('sayı adreslerini üretir ve çözer', () => {
    expect(issueSlug('2026-11-11')).toBe('2026-11-11');
    expect(issueSlug('2026-10-27', 1)).toBe('2026-10-27-mukerrer');
    expect(issueSlug('2025-12-31', 2)).toBe('2025-12-31-mukerrer-2');
    expect(parseIssueSlug('2025-12-31-mukerrer-2')).toEqual({ date: '2025-12-31', supplement: 2 });
    expect(parseIssueSlug('2026-10-27-mukerrer')).toEqual({ date: '2026-10-27', supplement: 1 });
    expect(parseIssueSlug('2026-10-27-mukerrer-1')).toBeNull();
    expect(parseIssueSlug('2026-02-30')).toBeNull();
    expect(parseIssueSlug('../etc')).toBeNull();
  });

  it('tarih yardımcıları', () => {
    expect(isDateKey('2024-02-29')).toBe(true);
    expect(isDateKey('2025-02-29')).toBe(false);
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    // 21:30 UTC, Türkiye'de ertesi gün 00:30'dur.
    expect(todayKey(new Date('2026-11-10T21:30:00Z'))).toBe('2026-11-11');
  });
});

describe('karakter kodlaması', () => {
  it('windows-1254 Türkçe karakterleri doğru çözer', () => {
    // "Şığİ" → windows-1254: DE FD F0 DD
    const bytes = new Uint8Array([0x3c, 0x70, 0x3e, 0xde, 0xfd, 0xf0, 0xdd, 0x3c, 0x2f, 0x70, 0x3e]);
    expect(decodeHtml(bytes)).toBe('<p>Şığİ</p>');
  });

  it('UTF-8 bildirilen sayfayı UTF-8 çözer', () => {
    const bytes = new TextEncoder().encode('<meta charset="utf-8"><p>Şığİ</p>');
    expect(decodeHtml(bytes)).toContain('Şığİ');
  });
});

describe('fihrist ayrıştırma', () => {
  const parsed = parseIndex(INDEX, URL_11);

  it('sayı numarasını ve PDF bağlantısını bulur', () => {
    expect(parsed.published).toBe(true);
    expect(parsed.number).toBe(33427);
    expect(parsed.supplement).toBe(0);
    expect(parsed.pdfUrl).toBe('https://www.resmigazete.gov.tr/eskiler/2026/11/20261111.pdf');
  });

  it('bölüm, kategori, başlık ve türleri çıkarır', () => {
    expect(parsed.items.map((i) => [i.section, i.category, i.kind, i.code])).toEqual([
      ['Yürütme ve İdare Bölümü', 'Cumhurbaşkanı Kararı', 'PDF', '1'],
      ['Yürütme ve İdare Bölümü', 'Yönetmelik', 'METIN', '2'],
      ['Yürütme ve İdare Bölümü', 'TBMM Kararı', 'METIN', '3'],
      ['İlân Bölümü', '', 'ILAN', 'ilan-2'],
      ['İlân Bölümü', '', 'ILAN', 'ilan-5'],
    ]);
    expect(parsed.items[1].title).toBe('Piri Reis Üniversitesi Ön Lisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliğinde Değişiklik Yapılmasına Dair Yönetmelik');
    expect(parsed.items[1].sourceUrl).toBe('https://www.resmigazete.gov.tr/eskiler/2026/11/20261111-2.htm');
    expect(parsed.items[3].title).toBe('Yargı İlânları');
    expect(parsed.items[3].sourceUrl).toBe('https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/2026/11/20261111-2.htm');
    expect(parsed.items[4].title).toBe('T.C. Merkez Bankasınca Belirlenen Döviz Kurları');
  });

  it('mükerrer sayıyı tanır', () => {
    const html = INDEX.replace('Sayılı Resmî\n Gazete', 'Sayılı Resmî Gazete - 2. Mükerrer').replaceAll('20261111-', '20251231M2-');
    const p = parseIndex(html, indexUrl('2025-12-31', 2));
    expect(p.supplement).toBe(2);
    expect(p.items[0].sourceUrl).toBe('https://www.resmigazete.gov.tr/eskiler/2025/12/20251231M2-1.pdf');
    expect(p.items[0].code).toBe('1');
  });

  it('yayımlanmayan günü ayırt eder ve oradaki sayıyı sayı numarası sanmaz', () => {
    const html = `<body><p>T.C. Resmî Gazete</p><p>29 Ekim 2026 PERŞEMBE</p><p>15/7/2018 tarihli ve 30479 sayılı Resmî Gazete'de
      yayımlanan "Resmî Gazete Hakkında Cumhurbaşkanlığı Kararnamesi" uyarınca bugün Resmî Gazete yayımlanmamaktadır.</p></body>`;
    const p = parseIndex(html, indexUrl('2026-10-29'));
    expect(p.published).toBe(false);
    expect(p.number).toBeNull();
    expect(p.items).toEqual([]);
  });

  it('büyük harfli başlıkları Türkçe kurallarıyla düzeltir', () => {
    expect(titleCaseTr('YÜRÜTME VE İDARE BÖLÜMÜ')).toBe('Yürütme ve İdare Bölümü');
    expect(titleCaseTr('HÂKİMLER VE SAVCILAR KURULU KARARLARI')).toBe('Hâkimler ve Savcılar Kurulu Kararları');
    expect(titleCaseTr('TBMM KARARI')).toBe('TBMM Kararı');
  });
});

// Gerçek madde sayfalarının (Word çıktısı) sadeleştirilmiş yapısı.
const ITEM = `<html><head><style>p.Metin{}</style></head><body><div class=Section1><div><div>
<table class=MsoNormalTable><tr><td width=607 valign=top><div>
<table class=MsoNormalTable width=586>
 <tr>
  <td width=195><p class=MsoNormal>11 Kasım 2026 ÇARŞAMBA</p></td>
  <td width=195><p class=MsoNormal align=center><b>Resmî Gazete</b></p></td>
  <td width=195><p align=right>Sayı : 33427</p></td>
 </tr>
 <tr><td colspan=3><p align=center><b><span style="font-size:9pt">YÖNETMELİK</span></b></p></td></tr>
 <tr><td colspan=3>
  <p class=Balk11pt>Piri Reis Üniversitesinden:</p>
  <p class=OrtaBalkBold>PİRİ REİS ÜNİVERSİTESİ ÖN LİSANS VE LİSANS</p>
  <p class=Metin style="text-indent:42.5pt"><b>MADDE 1-</b> Yönetmeliğin 31 inci maddesi değiştirilmiştir.<o:p></o:p></p>
  <p class=Metin>&nbsp;</p>
  <table class=MsoTableGrid border=1>
   <tr><td width=80><p class=Metin align=center><u>Başarı Harfi</u></p></td><td><p class=Metin align=center><u>Puan</u></p></td></tr>
   <tr><td><p class=Metin align=center>AA</p></td><td><p class=Metin align=center>90-100</p></td></tr>
  </table>
  <p class=Metin><img src="20261111-2_dosyalar/image001.png" width=10><script>alert(1)</script>
   <a href="javascript:alert(1)">tıkla</a> <span onclick="x()">son</span></p>
  <p class=Metin align=right><b>Rektör</b></p>
 </td></tr>
</table></div></td></tr></table></div></div></div></body></html>`;

describe('madde metni temizleme', () => {
  const html = cleanItemHtml(ITEM, 'https://www.resmigazete.gov.tr/eskiler/2026/11/20261111-2.htm');

  it('baş bilgi satırını ve tekrar eden kategoriyi atar', () => {
    expect(html).not.toContain('Sayı');
    expect(html).not.toContain('ÇARŞAMBA');
    expect(html).not.toContain('YÖNETMELİK');
    expect(textOf(html).startsWith('Piri Reis Üniversitesinden:')).toBe(true);
  });

  it('yerleşim tablolarını açar, veri tablosunu korur', () => {
    expect(html.match(/<table>/g)).toHaveLength(1);
    expect(html).toContain('<div class="rg-table"><table>');
    expect(html).toContain('<td><p class="rg-c"><u>Başarı Harfi</u></p></td>');
  });

  it('hizalama ve başlık biçimini sınıflara çevirir', () => {
    expect(html).toContain('<p class="rg-b">Piri Reis Üniversitesinden:</p>');
    expect(html).toContain('<p class="rg-c rg-b">PİRİ REİS ÜNİVERSİTESİ ÖN LİSANS VE LİSANS</p>');
    expect(html).toContain('<p class="rg-r"><b>Rektör</b></p>');
    expect(html).toContain('<p><b>MADDE 1-</b> Yönetmeliğin 31 inci maddesi değiştirilmiştir.</p>');
  });

  it('tehlikeli içerik ve gereksiz biçimleri atar, görseli mutlak adrese çevirir', () => {
    expect(html).not.toMatch(/script|javascript:|onclick|style=|width=|o:p|MsoNormal|Section1/i);
    expect(html).toContain('<img src="https://www.resmigazete.gov.tr/eskiler/2026/11/20261111-2_dosyalar/image001.png">');
    expect(html).not.toContain('<a');
    expect(html).not.toMatch(/<p>\s*<\/p>/);
  });

  it('kaynak metnin tamamını korur', () => {
    for (const word of ['MADDE 1-', 'AA', '90-100', 'tıkla', 'son', 'Rektör']) expect(textOf(html)).toContain(word);
  });
});
