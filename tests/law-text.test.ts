import { describe, expect, it } from 'vitest';
import { parseLawText, provisionAnchor } from '@/lib/law-text';

describe('parseLawText', () => {
  const text = `BİRİNCİ KISIM
Genel Hükümler

MADDE 1- (1) Sözleşme, tarafların iradelerini karşılıklı ve birbirine uygun olarak açıklamalarıyla kurulur.
(2) İrade açıklaması, açık veya örtülü olabilir.
MADDE 49- (1) Kusurlu ve hukuka aykırı bir fiille başkasına zarar veren, bu zararı gidermekle yükümlüdür.
GEÇİCİ MADDE 1- Geçiş hükmü.
Ek Madde 2 — Ek hüküm.`;

  it('maddeleri bağlantı çapalarıyla ayırır (önek kullanmayan eski metin)', () => {
    const blocks = parseLawText(text);
    const articles = blocks.filter((b) => b.kind === 'article');
    expect(articles.map((a) => a.kind === 'article' && a.anchor)).toEqual(['madde-1', 'madde-49', 'gecici-madde-1', 'ek-madde-2']);
    expect(blocks[0]).toEqual({ kind: 'section', id: 'bolum-1', text: 'BİRİNCİ KISIM' });
    expect(blocks[1]).toEqual({ kind: 'paragraph', text: 'Genel Hükümler' });
  });
  it('madde metnini etiketten ayırır, sonraki fıkraları maddeye bağlar', () => {
    const [first] = parseLawText('MADDE 49- (1) Zarar.\n(2) Devamı.');
    expect(first).toEqual({ kind: 'article', anchor: 'madde-49', label: 'MADDE 49', titles: [], paragraphs: ['(1) Zarar.', '(2) Devamı.'] });
  });
  it('aynı çapa tekrar ederse benzersizleştirir', () => {
    const blocks = parseLawText('MADDE 3- a\nMADDE 3- b');
    expect(blocks.map((b) => b.kind === 'article' && b.anchor)).toEqual(['madde-3', 'madde-3-2']);
  });
});

describe('provisionAnchor', () => {
  it('ilk sayıyı çapaya çevirir', () => {
    expect(provisionAnchor('49')).toBe('madde-49');
    expect(provisionAnchor('49-52')).toBe('madde-49');
    expect(provisionAnchor('m. 166/1')).toBe('madde-166');
    expect(provisionAnchor('68/a')).toBe('madde-68-a');
    expect(provisionAnchor('128/ç')).toBe('madde-128-c');
    expect(provisionAnchor('Geçici 1')).toBe('gecici-madde-1');
    expect(provisionAnchor('ek madde 3')).toBe('ek-madde-3');
    expect(provisionAnchor('genel')).toBeNull();
  });
});
