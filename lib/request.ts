import 'server-only';
import { headers } from 'next/headers';

/** İstemci IP adresi (Vercel ve çoğu ters vekil x-forwarded-for başlığını doldurur). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || h.get('x-real-ip') || 'bilinmiyor').slice(0, 64);
}
