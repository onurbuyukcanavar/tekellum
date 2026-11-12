import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { buildToc } from '@/lib/toc';

describe('içindekiler', () => {
  it('h2/h3 başlıklarını bulur, Türkçe karakterlerden kararlı kimlik üretir', () => {
    const { html, toc } = buildToc(sanitizeArticleHtml(
      '<h1>Giriş</h1><p>a</p><h3>Ölçüt ve <em>Şartlar</em></h3><h4>Alt not</h4><h2>Sonuç &amp; Değerlendirme</h2>',
    ));
    expect(toc).toEqual([
      { id: 'giris', text: 'Giriş', level: 2 },
      { id: 'olcut-ve-sartlar', text: 'Ölçüt ve Şartlar', level: 3 },
      { id: 'sonuc-degerlendirme', text: 'Sonuç & Değerlendirme', level: 2 },
    ]);
    expect(html).toContain('<h2 id="giris">Giriş</h2>');
    expect(html).toContain('<h3 id="olcut-ve-sartlar">Ölçüt ve <em>Şartlar</em></h3>');
    expect(html).toContain('<h4>Alt not</h4>');
  });

  it('aynı başlıkları ayırır, boş başlıkları atlar', () => {
    const { toc } = buildToc(sanitizeArticleHtml('<h2>Değerlendirme</h2><h2> </h2><h2>Değerlendirme</h2><h2>§§</h2>'));
    expect(toc.map((t) => t.id)).toEqual(['degerlendirme', 'degerlendirme-2', 'bolum-3']);
  });

  it('kullanıcının yazdığı id özniteliği temizlenir, yalnızca bizim kimliğimiz kalır', () => {
    const { html } = buildToc(sanitizeArticleHtml('<h2 id="x" onclick="alert(1)">Başlık</h2>'));
    expect(html).toBe('<h2 id="baslik">Başlık</h2>');
  });
});
