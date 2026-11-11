/**
 * Üretimde __Host- öneki: çerez yalnızca HTTPS'te, bu alan adına ve "/" yoluna bağlı kalır.
 * Proxy dosyası da kullandığı için bu modül sunucuya özel bağımlılık içermez.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-tekellum_oturum' : 'tekellum_oturum';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
