import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/cookie';

/**
 * İyimser ön kontrol: oturum çerezi olmayan istekleri yönetim sayfalarından giriş sayfasına yönlendirir.
 * Asıl yetki kontrolü her sayfada ve her sunucu işleminde veritabanı üzerinden yapılır (requireAdmin).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/yonetim/giris') return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL('/yonetim/giris', request.url);
    url.searchParams.set('sonra', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/yonetim', '/yonetim/:path*'],
};
