import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE, siteUrl } from '@/lib/constants';

/** Paylaşım görselleri (Open Graph): LinkedIn, WhatsApp, X vb. bağlantı önizlemelerinde görünen 1200×630 kart. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const C = { paper: '#faf7f0', raised: '#fffdf8', navy: '#14213d', ink: '#2a2f3a', muted: '#6b6f78', bronze: '#9a7440', line: '#e4dccb' };

type FontDef = { name: string; file: string; weight: 400 | 500 | 600; style: 'normal' | 'italic' };
// Türkçe harfler (İ, Ş, ğ…) "latin-ext" dosyalarında; ayrı aile adıyla kaydedilip yedek olarak sıralanır.
const FONT_FILES: FontDef[] = [
  { name: 'Serif', file: 'source-serif-4-latin-600-normal.woff', weight: 600, style: 'normal' },
  { name: 'SerifX', file: 'source-serif-4-latin-ext-600-normal.woff', weight: 600, style: 'normal' },
  { name: 'Serif', file: 'source-serif-4-latin-400-normal.woff', weight: 400, style: 'normal' },
  { name: 'SerifX', file: 'source-serif-4-latin-ext-400-normal.woff', weight: 400, style: 'normal' },
  { name: 'Serif', file: 'source-serif-4-latin-400-italic.woff', weight: 400, style: 'italic' },
  { name: 'SerifX', file: 'source-serif-4-latin-ext-400-italic.woff', weight: 400, style: 'italic' },
  { name: 'Sans', file: 'inter-latin-500-normal.woff', weight: 500, style: 'normal' },
  { name: 'SansX', file: 'inter-latin-ext-500-normal.woff', weight: 500, style: 'normal' },
  { name: 'Sans', file: 'inter-latin-600-normal.woff', weight: 600, style: 'normal' },
  { name: 'SansX', file: 'inter-latin-ext-600-normal.woff', weight: 600, style: 'normal' },
  // Ok (→) gibi simgeler için son yedek.
  { name: 'Yedek', file: 'LiberationSans-Regular.ttf', weight: 400, style: 'normal' },
];
const SERIF = 'Serif, SerifX, Yedek';
const SANS = 'Sans, SansX, Yedek';

let fontsPromise: Promise<Array<FontDef & { data: Buffer }>> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async (f) => ({ ...f, data: await readFile(join(process.cwd(), 'assets/og', f.file)) })),
  );
  return fontsPromise;
}

function host() {
  try { return new URL(siteUrl()).host; } catch { return 'tekellum.vercel.app'; }
}

/** Uzun başlıkları kelime sınırında kısaltır. */
function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max).replace(/[\s,.;:–-]+$/, '')}…`;
}

function titleSize(t: string) {
  if (t.length > 110) return 46;
  if (t.length > 80) return 54;
  if (t.length > 50) return 62;
  return 74;
}

export type CardInput = {
  eyebrow?: string;
  title: string;
  /** Başlığın altında küçük bir açıklama (isteğe bağlı). */
  subtitle?: string;
  /** Alt satırda solda (ör. yazar · tarih). */
  meta?: string;
  /** Başlık italik bir vurgu satırıyla mı yazılsın (ana sayfa). */
  italicTail?: string;
};

export async function renderCard({ eyebrow, title, subtitle, meta, italicTail }: CardInput) {
  const fonts = await loadFonts();
  const t = clip(title, 150);
  const size = titleSize(t + (italicTail ?? ''));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.paper, padding: 36 }}>
        <div style={{ flex: 1, display: 'flex', background: C.raised, border: `1.5px solid ${C.line}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ width: 12, background: C.bronze }} />
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px 44px 58px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, letterSpacing: 9, color: C.navy }}>
                {SITE_NAME.toLocaleUpperCase('tr')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <div style={{ width: 28, height: 2, background: C.bronze, marginRight: 12 }} />
                <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 15, letterSpacing: 4.5, color: C.muted }}>
                  {/* Latince slogan: Türkçe büyük harf kuralı (i → İ) uygulanmaz. */}
                  {SITE_TAGLINE.toUpperCase()}
                </div>
              </div>
            </div>
            {eyebrow && (
              <div
                style={{
                  display: 'flex', fontFamily: SANS, fontWeight: 600, fontSize: 18, letterSpacing: 3, color: C.bronze,
                  border: `1.5px solid ${C.bronze}`, borderRadius: 999, padding: '8px 20px',
                }}
              >
                {eyebrow.toLocaleUpperCase('tr')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight: 1.12, color: C.navy }}>
              {t}
              {italicTail && (
                <span style={{ fontWeight: 400, fontStyle: 'italic', color: C.bronze, marginLeft: size * 0.25 }}>{italicTail}</span>
              )}
            </div>
            {subtitle && (
              <div style={{ marginTop: 22, fontFamily: SERIF, fontSize: 27, lineHeight: 1.35, color: C.ink, opacity: 0.85 }}>
                {clip(subtitle, 140)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1.5px solid ${C.line}`, paddingTop: 22 }}>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 21, color: C.ink }}>{meta ?? ''}</div>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 19, color: C.muted }}>{host()}</div>
          </div>
        </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
    },
  );
}
