import { describe, expect, it } from 'vitest';
import { isOfficialSourceUrl } from '@/lib/official-source';
import { articleInputSchema, lawInputSchema, loginSchema } from '@/lib/validation';

const baseArticle = {
  title: 'Haksız Fiilde Kusur', slug: '', excerpt: '', content: '<p>x</p>', category: 'Hukuk',
  author: 'Tekellüm', status: 'TASLAK', featured: false, lawRefs: [],
};

describe('articleInputSchema', () => {
  it('kısa ad boşsa başlıktan üretir', () => {
    expect(articleInputSchema.parse(baseArticle).slug).toBe('haksiz-fiilde-kusur');
  });
  it('elle girilen kısa adı Türkçe karakterleri koruyarak düzeltir', () => {
    expect(articleInputSchema.parse({ ...baseArticle, slug: 'Şirket Ölçütü' }).slug).toBe('sirket-olcutu');
  });
  it('geçersiz kategori ve durumu reddeder', () => {
    expect(articleInputSchema.safeParse({ ...baseArticle, category: 'Yok' }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...baseArticle, status: 'published' }).success).toBe(false);
  });
  it('boş başlığı reddeder', () => {
    const r = articleInputSchema.safeParse({ ...baseArticle, title: '   ' });
    expect(r.success).toBe(false);
  });
});

describe('lawInputSchema / resmî kaynak', () => {
  it('https dışı bağlantıyı reddeder', () => {
    const r = lawInputSchema.safeParse({ title: 'TBK', officialUrl: 'http://mevzuat.gov.tr/x' });
    expect(r.success).toBe(false);
  });
  it('resmî kaynak alan adlarını tanır', () => {
    expect(isOfficialSourceUrl('https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098')).toBe(true);
    expect(isOfficialSourceUrl('https://www.resmigazete.gov.tr/eskiler/2011/02/20110204-1.htm')).toBe(true);
    expect(isOfficialSourceUrl('https://mevzuat.gov.tr.kotu-site.com/')).toBe(false);
    expect(isOfficialSourceUrl('https://lexpera.com.tr/x')).toBe(false);
    expect(isOfficialSourceUrl('http://www.mevzuat.gov.tr/')).toBe(false);
  });
});

describe('loginSchema', () => {
  it('e-postayı küçük harfe çevirir', () => {
    expect(loginSchema.parse({ email: '  Onur@Ornek.COM ', password: 'x' }).email).toBe('onur@ornek.com');
  });
});
