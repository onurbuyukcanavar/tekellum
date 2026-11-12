import { describe, expect, it } from 'vitest';
import { renderArticleHtml } from '@/lib/article-render';
import { sanitizeArticleHtml } from '@/lib/sanitize';

const IMG = '/gorsel/cm1abcdefghijklmnopqrstu';

describe('makale HTML kuralları', () => {
  it('hizalama, vurgu, üst/alt simge ve not kutusu korunur', () => {
    const out = sanitizeArticleHtml(
      '<p style="text-align: center; color: red">Orta</p><h2 style="text-align:justify">B</h2><p><mark>v</mark> x<sup>2</sup> H<sub>2</sub>O</p>'
      + '<aside data-callout="onemli" onclick="x()"><p>Dikkat</p></aside><aside data-callout="saldiri"><p>n</p></aside>',
    );
    expect(out).toContain('<p style="text-align:center">Orta</p>');
    expect(out).toContain('<h2 style="text-align:justify">B</h2>');
    expect(out).toContain('<mark>v</mark>');
    expect(out).toContain('<aside data-callout="onemli"><p>Dikkat</p></aside>');
    expect(out).toContain('<aside data-callout="not"><p>n</p></aside>');
    expect(out).not.toMatch(/color|onclick/);
  });

  it('yalnızca sitenin kendi görselleri kabul edilir', () => {
    const out = sanitizeArticleHtml(
      `<figure data-image data-size="orta"><img src="${IMG}" alt="Şema" width="800" height="600" onerror="x"><figcaption>Şekil 1</figcaption></figure>`
      + '<p><img src="https://izleyici.example/p.gif"><img src="javascript:alert(1)"></p>',
    );
    expect(out).toContain(`<img src="${IMG}" alt="Şema" loading="lazy" width="800" height="600" />`);
    expect(out).toContain('<figcaption>Şekil 1</figcaption>');
    expect(out).not.toContain('example');
    expect(out).not.toContain('javascript');
  });
});

describe('yayın görünümü', () => {
  it('dipnotları sırayla numaralar ve sona listeler', () => {
    const { html, footnoteCount } = renderArticleHtml(
      '<h2>Giriş</h2><p>Birinci<sup data-footnote="Yargıtay 3. HD, 2024/1 E."></sup> ve ikinci<sup data-footnote="Bkz. https://www.resmigazete.gov.tr/x &lt;b&gt;"></sup>.</p>',
    );
    expect(footnoteCount).toBe(2);
    expect(html).toContain('<sup class="fn-ref" id="dipnot-ref-1"><a href="#dipnot-1" aria-label="Dipnot 1">1</a></sup>');
    expect(html).toContain('<li id="dipnot-1">Yargıtay 3. HD, 2024/1 E. <a href="#dipnot-ref-1"');
    expect(html).toContain('<a href="https://www.resmigazete.gov.tr/x" target="_blank" rel="noopener noreferrer">');
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
    expect(html.indexOf('Dipnotlar')).toBeGreaterThan(html.indexOf('ikinci'));
  });

  it('boş dipnotu ve görseli kalmamış figürü atar, tabloyu kaydırma kabına alır', () => {
    const { html } = renderArticleHtml(
      '<p>a<sup data-footnote=" "></sup></p><figure data-image data-size="tam"><img src="https://dis.example/x.png"><figcaption>c</figcaption></figure><table><tbody><tr><td>1</td></tr></tbody></table>',
    );
    expect(html).not.toContain('fn-ref');
    expect(html).not.toContain('<figure');
    expect(html).toContain('<div class="table-wrap"><table>');
    expect(html).toContain('</table></div>');
  });

  it('hizalanmış başlıklar da içindekilere girer; Dipnotlar başlığı girmez', () => {
    const { toc } = renderArticleHtml('<h2 style="text-align:center">Ortalı Başlık</h2><h3>Alt</h3><p>x<sup data-footnote="n"></sup></p>');
    expect(toc.map((t) => t.id)).toEqual(['ortali-baslik', 'alt']);
  });
});
