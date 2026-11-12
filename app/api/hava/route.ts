import { NextResponse, type NextRequest } from 'next/server';

/**
 * Ziyaretçinin konumuna göre hava durumu (Open-Meteo, anahtarsız).
 * Konum: ?lat&lon (tarayıcı izniyle) yoksa Vercel'in IP tabanlı yaklaşık konumu, o da yoksa İstanbul.
 * Koordinatlar ~1 km'ye yuvarlanır ve hiçbir yerde saklanmaz.
 */
const FALLBACK = { lat: 41.01, lon: 28.98, place: 'İstanbul' };

function coord(value: string | null, max: number) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 100) / 100 : null;
}

function header(req: NextRequest, name: string) {
  const v = req.headers.get(name);
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
}

export async function GET(req: NextRequest) {
  const qLat = coord(req.nextUrl.searchParams.get('lat'), 90);
  const qLon = coord(req.nextUrl.searchParams.get('lon'), 180);

  let lat = FALLBACK.lat, lon = FALLBACK.lon, place: string | null = FALLBACK.place, source: 'cihaz' | 'ip' | 'varsayilan' = 'varsayilan';
  if (qLat != null && qLon != null) {
    lat = qLat; lon = qLon; place = null; source = 'cihaz';
  } else {
    const hLat = coord(header(req, 'x-vercel-ip-latitude'), 90);
    const hLon = coord(header(req, 'x-vercel-ip-longitude'), 180);
    if (hLat != null && hLon != null) {
      lat = hLat; lon = hLon; source = 'ip';
      place = header(req, 'x-vercel-ip-city');
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Europe/Istanbul',
    forecast_days: '1',
  }).toString();

  try {
    const res = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const c = data.current ?? {};
    const d = data.daily ?? {};
    const body = {
      place,
      source,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      code: c.weather_code,
      isDay: c.is_day === 1,
      max: d.temperature_2m_max?.[0],
      min: d.temperature_2m_min?.[0],
      rainChance: d.precipitation_probability_max?.[0],
      time: c.time,
    };
    if (typeof body.temperature !== 'number' || typeof body.code !== 'number') throw new Error('Eksik veri');
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, max-age=600' } });
  } catch (error) {
    console.error('Hava durumu alınamadı', error);
    return NextResponse.json({ error: 'Hava durumu şu anda alınamıyor.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
