'use client';

import { useCallback, useEffect, useState } from 'react';
import { describeWeather, type WeatherIcon } from '@/lib/weather/codes';

type Weather = {
  place: string | null; source: 'cihaz' | 'ip' | 'varsayilan';
  temperature: number; feelsLike: number; humidity: number; wind: number; code: number; isDay: boolean;
  max?: number; min?: number; rainChance?: number;
};

const STORE_KEY = 'tekellum-konum';
const round = (n: number) => Math.round(n);

function readSaved(): { lat: number; lon: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    return v && typeof v.lat === 'number' && typeof v.lon === 'number' ? v : null;
  } catch { return null; }
}

function Icon({ icon, isDay }: { icon: WeatherIcon; isDay: boolean }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const cloud = <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 11.1 3.5 3.5 0 0 0 7 18Z" {...common} />;
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-bronze" aria-hidden>
      {icon === 'acik' && (isDay
        ? <g {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g>
        : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" {...common} />)}
      {icon === 'parcali' && <g {...common}>{isDay ? <path d="M8 4v1M3.8 5.8l.7.7M2 10h1M12.2 5.8l-.7.7M5 10a3 3 0 0 1 5.6-1.5" /> : <path d="M10.5 3.5A4 4 0 0 0 5 9" />}<path d="M8 19h9a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.3 12.6 3.2 3.2 0 0 0 8 19Z" /></g>}
      {icon === 'bulutlu' && cloud}
      {icon === 'sis' && <g {...common}><path d="M4 9h16M3 13h18M5 17h14" /></g>}
      {icon === 'yagmur' && <g {...common}><path d="M7 15h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 8.1 3.5 3.5 0 0 0 7 15Z" /><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" /></g>}
      {icon === 'kar' && <g {...common}><path d="M7 15h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 8.1 3.5 3.5 0 0 0 7 15Z" /><path d="M9 19h.01M12 21h.01M15 19h.01" strokeWidth={2.5} /></g>}
      {icon === 'firtina' && <g {...common}><path d="M7 14h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 7.1 3.5 3.5 0 0 0 7 14Z" /><path d="m12.5 15-2 3.5h3l-2 3.5" /></g>}
    </svg>
  );
}

export function WeatherWidget() {
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [usingDevice, setUsingDevice] = useState(false);

  const load = useCallback(async (coords: { lat: number; lon: number } | null) => {
    setError(null);
    try {
      const qs = coords ? `?lat=${coords.lat.toFixed(2)}&lon=${coords.lon.toFixed(2)}` : '';
      const res = await fetch(`/api/hava${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Hava durumu alınamadı.');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hava durumu alınamadı.');
    }
  }, []);

  useEffect(() => {
    const saved = readSaved();
    // Kayıtlı konum yalnızca bu tarayıcıda tutulur; ilk yüklemede bir kez okunur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setUsingDevice(true);
    void load(saved);
  }, [load]);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setError('Tarayıcınız konum paylaşımını desteklemiyor.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 };
        try { localStorage.setItem(STORE_KEY, JSON.stringify(coords)); } catch { /* gizli sekme */ }
        setUsingDevice(true);
        setLocating(false);
        void load(coords);
      },
      () => { setLocating(false); setError('Konum izni verilmedi; yaklaşık konum kullanılıyor.'); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  };

  const forget = () => {
    try { localStorage.removeItem(STORE_KEY); } catch { /* yok say */ }
    setUsingDevice(false);
    void load(null);
  };

  if (!data && !error) {
    return <div className="h-[92px] animate-pulse rounded-lg bg-line/40" aria-label="Hava durumu yükleniyor" />;
  }

  const w = data ? describeWeather(data.code) : null;
  const placeLabel = data ? (data.source === 'cihaz' ? 'Konumunuz' : data.place || 'Yaklaşık konumunuz') : '';

  return (
    <div aria-live="polite">
      {data && w && (
        <div className="flex items-center gap-4">
          <Icon icon={w.icon} isDay={data.isDay} />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-3xl leading-none text-navy">{round(data.temperature)}°</span>
              <span className="truncate text-sm text-ink-soft">{w.text}</span>
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              {placeLabel}
              {data.max != null && data.min != null && <> · {round(data.min)}° / {round(data.max)}°</>}
              {data.rainChance != null && data.rainChance >= 20 && <> · yağış %{data.rainChance}</>}
            </p>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-muted">{error}</p>}
      <p className="mt-2 text-xs">
        {usingDevice
          ? <button type="button" onClick={forget} className="text-muted underline decoration-line-strong underline-offset-2 hover:text-navy">Yaklaşık konuma dön</button>
          : <button type="button" onClick={useMyLocation} disabled={locating} className="text-muted underline decoration-line-strong underline-offset-2 hover:text-navy">{locating ? 'Konum alınıyor…' : 'Konumumu kullan'}</button>}
      </p>
    </div>
  );
}
