/** WMO hava durumu kodlarının Türkçe karşılığı ve simge türü (Open-Meteo `weather_code`). */
export type WeatherIcon = 'acik' | 'parcali' | 'bulutlu' | 'sis' | 'yagmur' | 'kar' | 'firtina';

const CODES: Record<number, [string, WeatherIcon]> = {
  0: ['Açık', 'acik'],
  1: ['Az bulutlu', 'parcali'],
  2: ['Parçalı bulutlu', 'parcali'],
  3: ['Kapalı', 'bulutlu'],
  45: ['Sisli', 'sis'],
  48: ['Kırağılı sis', 'sis'],
  51: ['Hafif çisenti', 'yagmur'],
  53: ['Çisenti', 'yagmur'],
  55: ['Yoğun çisenti', 'yagmur'],
  56: ['Donan çisenti', 'yagmur'],
  57: ['Yoğun donan çisenti', 'yagmur'],
  61: ['Hafif yağmurlu', 'yagmur'],
  63: ['Yağmurlu', 'yagmur'],
  65: ['Kuvvetli yağmur', 'yagmur'],
  66: ['Donan yağmur', 'yagmur'],
  67: ['Kuvvetli donan yağmur', 'yagmur'],
  71: ['Hafif kar', 'kar'],
  73: ['Kar yağışlı', 'kar'],
  75: ['Yoğun kar', 'kar'],
  77: ['Kar taneleri', 'kar'],
  80: ['Hafif sağanak', 'yagmur'],
  81: ['Sağanak yağış', 'yagmur'],
  82: ['Şiddetli sağanak', 'yagmur'],
  85: ['Kar sağanağı', 'kar'],
  86: ['Yoğun kar sağanağı', 'kar'],
  95: ['Gök gürültülü sağanak', 'firtina'],
  96: ['Dolu ile fırtına', 'firtina'],
  99: ['Kuvvetli dolu ile fırtına', 'firtina'],
};

export function describeWeather(code: number): { text: string; icon: WeatherIcon } {
  const [text, icon] = CODES[code] ?? ['—', 'bulutlu'];
  return { text, icon };
}
