const TURKISH_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', i: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
};

/** Türkçe karakterleri koruyarak (ş→s, ı→i …) URL'ye uygun kısa ad üretir. */
export function slugify(input: string, maxLength = 120): string {
  const mapped = input.replace(/[çÇğĞıIİiöÖşŞüÜâÂîÎûÛ]/g, (ch) => TURKISH_MAP[ch] ?? ch);
  return mapped
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}
