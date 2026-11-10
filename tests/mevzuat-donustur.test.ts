import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { articleLabels, convertMevzuatHtml, coverage, mbsTextUrl, parseMbsUrl, rawBodyText } from '../scripts/mevzuat/donustur.mjs';
import { buildLawToc, parseLawText } from '@/lib/law-text';
import { renderLawHtml } from '@/lib/law-render';

const html = readFileSync(new URL('./fixtures/mbs-ornek.html', import.meta.url), 'utf8');

describe('MBS HTML dönüştürücü', () => {
  const text = convertMevzuatHtml(html);
  const lines = text.split('\n');

  it('bölüm başlıklarını adlarıyla birleştirir, madde başlıklarını işaretler', () => {
    expect(lines).toContain('# ÖRNEK KANUNU');
    expect(lines).toContain('# BİRİNCİ KISIM — Genel Hükümler');
    expect(lines).toContain('## A. Sözleşmenin kurulması');
    expect(lines).toContain('## 1. Genel olarak');
    expect(lines).toContain('## Karşı dava şartları');
    expect(lines).toContain('## İflas daireleri:');
  });

  it('Word span parçalarını birleştirir, künye satırlarını başlık yapmaz', () => {
    expect(lines).toContain('MADDE 1- Sözleşme, iradelerin açıklanmasıyla kurulur.');
    expect(lines).toContain('İrade açıklaması, açık veya örtülü olabilir.');
    expect(lines).toContain('Kanun Numarası : 9999');
  });

  it('<pre> içindeki maddeleri kaçırmaz (HMK örneği)', () => {
    expect(lines).toContain('MADDE 2- (1) Karşı dava açılabilmesi için; a) bağlantı bulunmalıdır.');
  });

  it('tabloları satır satır, dipnotları ayrı bölümde verir', () => {
    expect(lines).toContain('Sütun A | Sütun B');
    expect(lines).toContain('1 | 2');
    const notes = lines.indexOf('# Dipnotlar');
    expect(notes).toBeGreaterThan(lines.indexOf('GEÇİCİ MADDE 1- Geçiş hükmü.'));
    expect(lines[notes + 1]).toBe('[1] 1/1/2021 tarihli ve 7000 sayılı Kanun ile eklenmiştir.');
  });

  it('madde etiketlerini sırayla bulur', () => {
    expect(articleLabels(text)).toEqual(['MADDE 1', 'MADDE 2', 'MADDE 68/a', 'GEÇİCİ MADDE 1']);
  });

  it('ham metindeki hiçbir kelimeyi kaybetmez', () => {
    expect(coverage(rawBodyText(html), text)).toBe(1);
  });
});

describe('mevzuat ayrıştırma ve görüntüleme', () => {
  const blocks = parseLawText(convertMevzuatHtml(html));
  const articles = blocks.filter((b) => b.kind === 'article');

  it('maddeleri başlıkları ve fıkralarıyla gruplar, çapaları doğru üretir', () => {
    expect(articles.map((a) => a.kind === 'article' && a.anchor)).toEqual(['madde-1', 'madde-2', 'madde-68-a', 'gecici-madde-1']);
    const first = articles[0];
    expect(first.kind === 'article' && first.titles).toEqual(['A. Sözleşmenin kurulması', '1. Genel olarak']);
    expect(first.kind === 'article' && first.paragraphs).toEqual([
      'Sözleşme, iradelerin açıklanmasıyla kurulur.',
      'İrade açıklaması, açık veya örtülü olabilir.',
    ]);
  });

  it('dipnot bölümündeki satırları madde saymaz', () => {
    expect(blocks.filter((b) => b.kind === 'note')).toHaveLength(1);
  });

  it('içindekileri ve madde sayısını çıkarır', () => {
    const toc = buildLawToc(blocks);
    expect(toc.articleCount).toBe(4);
    expect(toc.sections.map((s) => s.text)).toEqual(['ÖRNEK KANUNU', 'BİRİNCİ KISIM — Genel Hükümler', 'Dipnotlar']);
  });

  it('HTML üretirken metni kaçışlar', () => {
    const out = renderLawHtml(parseLawText('MADDE 1- <script>alert(1)</script> & "tırnak"'));
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;tırnak&quot;');
    expect(out).not.toContain('<script>');
    expect(out).toContain('<section class="law-article" id="madde-1">');
  });
});

describe('MBS bağlantıları', () => {
  it('yalnızca mevzuat.gov.tr bağlantılarını kabul eder', () => {
    expect(parseMbsUrl('https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2004&MevzuatTur=1&MevzuatTertip=3')).toEqual({ no: '2004', tur: '1', tertip: '3' });
    expect(parseMbsUrl('https://mevzuat.gov.tr.kotu.com/mevzuat?MevzuatNo=1&MevzuatTertip=5')).toBeNull();
    expect(parseMbsUrl('https://www.mevzuat.gov.tr/')).toBeNull();
    expect(mbsTextUrl({ no: '6098', tur: '1', tertip: '5' })).toBe(
      'https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetayIframe?MevzuatTur=1&MevzuatNo=6098&MevzuatTertip=5',
    );
  });
});
