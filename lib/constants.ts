export const SITE_NAME = 'Müessir';
export const SITE_TAGLINE = 'Veritas Et Iustitia';
export const SITE_DESCRIPTION =
  'Hukuk, düşünce ve metin üzerine kişisel yayın platformu; makaleler, çalışma notları ve mevzuat kütüphanesi.';

export const ARTICLE_CATEGORIES = ['Hukuk', 'Felsefe', 'Tarih', 'Siyaset', 'Toplum', 'Kitaplık', 'Diğer'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** Mevzuatın "doğrulandı" sayılabilmesi için resmî kaynak bu alan adlarından birinde olmalıdır. */
export const OFFICIAL_SOURCE_HOSTS = ['mevzuat.gov.tr', 'resmigazete.gov.tr'] as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}
