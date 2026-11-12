import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Word (.docx) dosyalarından gelen uzun makaleler için sunucu işlemi gövde sınırı.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Dönüştürücünün yazı tipleri ve PDF okuyucu çalışanı: değişmeyen statik dosyalar.
      { source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }] },
      { source: '/vendor/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/yonetim/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
  async redirects() {
    // Eski (Supabase sürümü) İngilizce adresler kalıcı olarak yeni Türkçe adreslere yönlendirilir.
    return [
      // Eski adres (muessir.vercel.app) kalıcı olarak yeni ada yönlenir; API uçları (zamanlanmış görevler) hariç.
      {
        source: '/:path((?!api/).*)',
        has: [{ type: 'host', value: 'muessir.vercel.app' }],
        destination: 'https://tekellum.vercel.app/:path',
        permanent: true,
      },
      { source: '/articles/:slug', destination: '/makaleler/:slug', permanent: true },
      { source: '/articles', destination: '/makaleler', permanent: true },
      { source: '/laws/:slug', destination: '/mevzuat/:slug', permanent: true },
      { source: '/laws', destination: '/mevzuat', permanent: true },
      { source: '/admin', destination: '/yonetim', permanent: true },
    ];
  },
};

export default nextConfig;
