/**
 * Ana sayfadaki günlük takvim için önemli günler.
 *
 * - Sabit tarihli resmî tatiller: 2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun.
 * - Adli tatil: 20 Temmuz – 31 Ağustos (HMK m. 102; İYUK m. 61).
 * - Dinî bayram ve geceler: Diyanet İşleri Başkanlığı dinî günler takvimi. Bunlar hicrî takvime bağlı
 *   olduğundan her yıl elle eklenir; RELIGIOUS_COVERAGE_END sonrasında liste boş kalır (README'de not var).
 */

export type DayKind = 'resmi-tatil' | 'yarim-gun' | 'dini' | 'hukuk' | 'anma';
export type ImportantDay = { date: string; title: string; kind: DayKind; note?: string };

export const KIND_LABEL: Record<DayKind, string> = {
  'resmi-tatil': 'Resmî tatil',
  'yarim-gun': 'Yarım gün',
  dini: 'Dinî gün',
  hukuk: 'Hukuk',
  anma: 'Anma / kutlama',
};

/** Her yıl aynı gün (AA-GG). */
const FIXED: Array<Omit<ImportantDay, 'date'> & { md: string }> = [
  { md: '01-01', title: 'Yılbaşı', kind: 'resmi-tatil' },
  { md: '03-08', title: 'Dünya Kadınlar Günü', kind: 'anma' },
  { md: '03-12', title: 'İstiklal Marşı\'nın Kabulü ve Mehmet Akif Ersoy\'u Anma Günü', kind: 'anma' },
  { md: '03-18', title: 'Çanakkale Zaferi ve Şehitleri Anma Günü', kind: 'anma' },
  { md: '04-05', title: 'Avukatlar Günü', kind: 'hukuk' },
  { md: '04-23', title: 'Ulusal Egemenlik ve Çocuk Bayramı', kind: 'resmi-tatil' },
  { md: '04-25', title: 'Anayasa Mahkemesi\'nin kuruluş yıl dönümü', kind: 'hukuk' },
  { md: '05-01', title: 'Emek ve Dayanışma Günü', kind: 'resmi-tatil' },
  { md: '05-19', title: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', kind: 'resmi-tatil' },
  { md: '07-15', title: 'Demokrasi ve Millî Birlik Günü', kind: 'resmi-tatil' },
  { md: '07-20', title: 'Adli tatil başlıyor', kind: 'hukuk', note: 'Adli tatil 31 Ağustos\'a kadar sürer.' },
  { md: '08-30', title: 'Zafer Bayramı', kind: 'resmi-tatil' },
  { md: '08-31', title: 'Adli tatilin son günü', kind: 'hukuk' },
  { md: '09-01', title: 'Yeni adli yıl başlıyor', kind: 'hukuk' },
  { md: '10-28', title: 'Cumhuriyet Bayramı arifesi', kind: 'yarim-gun', note: 'Öğleden sonra tatil.' },
  { md: '10-29', title: 'Cumhuriyet Bayramı', kind: 'resmi-tatil' },
  { md: '11-10', title: 'Atatürk\'ü Anma Günü', kind: 'anma', note: 'Saat 09.05\'te saygı duruşu.' },
  { md: '11-24', title: 'Öğretmenler Günü', kind: 'anma' },
  { md: '12-10', title: 'İnsan Hakları Günü', kind: 'hukuk' },
];

const HALF = 'Öğleden sonra tatil.';

/** Diyanet İşleri Başkanlığı dinî günler takvimi (2026–2027). */
const RELIGIOUS: ImportantDay[] = [
  { date: '2026-01-15', title: 'Miraç Kandili', kind: 'dini' },
  { date: '2026-02-02', title: 'Berat Kandili', kind: 'dini' },
  { date: '2026-03-16', title: 'Kadir Gecesi', kind: 'dini' },
  { date: '2026-03-19', title: 'Ramazan Bayramı arifesi', kind: 'yarim-gun', note: HALF },
  { date: '2026-03-20', title: 'Ramazan Bayramı (1. gün)', kind: 'resmi-tatil' },
  { date: '2026-03-21', title: 'Ramazan Bayramı (2. gün)', kind: 'resmi-tatil' },
  { date: '2026-03-22', title: 'Ramazan Bayramı (3. gün)', kind: 'resmi-tatil' },
  { date: '2026-05-26', title: 'Kurban Bayramı arifesi', kind: 'yarim-gun', note: HALF },
  { date: '2026-05-27', title: 'Kurban Bayramı (1. gün)', kind: 'resmi-tatil' },
  { date: '2026-05-28', title: 'Kurban Bayramı (2. gün)', kind: 'resmi-tatil' },
  { date: '2026-05-29', title: 'Kurban Bayramı (3. gün)', kind: 'resmi-tatil' },
  { date: '2026-05-30', title: 'Kurban Bayramı (4. gün)', kind: 'resmi-tatil' },
  { date: '2026-06-16', title: 'Hicrî Yılbaşı', kind: 'dini' },
  { date: '2026-06-25', title: 'Aşure Günü', kind: 'dini' },
  { date: '2026-08-24', title: 'Mevlid Kandili', kind: 'dini' },
  { date: '2026-12-10', title: 'Regaib Kandili · Üç ayların başlangıcı', kind: 'dini' },
  { date: '2027-01-04', title: 'Miraç Kandili', kind: 'dini' },
  { date: '2027-01-22', title: 'Berat Kandili', kind: 'dini' },
  { date: '2027-02-08', title: 'Ramazan ayının başlangıcı', kind: 'dini' },
  { date: '2027-03-05', title: 'Kadir Gecesi', kind: 'dini' },
  { date: '2027-03-08', title: 'Ramazan Bayramı arifesi', kind: 'yarim-gun', note: HALF },
  { date: '2027-03-09', title: 'Ramazan Bayramı (1. gün)', kind: 'resmi-tatil' },
  { date: '2027-03-10', title: 'Ramazan Bayramı (2. gün)', kind: 'resmi-tatil' },
  { date: '2027-03-11', title: 'Ramazan Bayramı (3. gün)', kind: 'resmi-tatil' },
  { date: '2027-05-15', title: 'Kurban Bayramı arifesi', kind: 'yarim-gun', note: HALF },
  { date: '2027-05-16', title: 'Kurban Bayramı (1. gün)', kind: 'resmi-tatil' },
  { date: '2027-05-17', title: 'Kurban Bayramı (2. gün)', kind: 'resmi-tatil' },
  { date: '2027-05-18', title: 'Kurban Bayramı (3. gün)', kind: 'resmi-tatil' },
  { date: '2027-05-19', title: 'Kurban Bayramı (4. gün)', kind: 'resmi-tatil' },
  { date: '2027-06-06', title: 'Hicrî Yılbaşı', kind: 'dini' },
  { date: '2027-06-15', title: 'Aşure Günü', kind: 'dini' },
  { date: '2027-08-13', title: 'Mevlid Kandili', kind: 'dini' },
  { date: '2027-11-29', title: 'Üç ayların başlangıcı', kind: 'dini' },
  { date: '2027-12-02', title: 'Regaib Kandili', kind: 'dini' },
  { date: '2027-12-24', title: 'Miraç Kandili', kind: 'dini' },
];

/** Dinî günler listesinin geçerli olduğu son tarih. */
export const RELIGIOUS_COVERAGE_END = '2027-12-31';

const KIND_ORDER: DayKind[] = ['resmi-tatil', 'yarim-gun', 'hukuk', 'dini', 'anma'];

function parse(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function addDays(key: string, days: number) {
  const d = parse(key);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}
export function daysBetween(from: string, to: string) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** Ayın n. pazarı (Anneler Günü, Babalar Günü). */
function nthSunday(year: number, month: number, n: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (7 - first.getUTCDay()) % 7;
  return fmt(new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7)));
}

function daysOfYear(year: number): ImportantDay[] {
  const list: ImportantDay[] = FIXED.map(({ md, ...rest }) => ({ ...rest, date: `${year}-${md}` }));
  list.push({ date: nthSunday(year, 5, 2), title: 'Anneler Günü', kind: 'anma' });
  list.push({ date: nthSunday(year, 6, 3), title: 'Babalar Günü', kind: 'anma' });
  list.push(...RELIGIOUS.filter((d) => d.date.startsWith(`${year}-`)));
  return list;
}

function sortDays(a: ImportantDay, b: ImportantDay) {
  return a.date.localeCompare(b.date) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
}

export function daysOn(key: string): ImportantDay[] {
  return daysOfYear(Number(key.slice(0, 4))).filter((d) => d.date === key).sort(sortDays);
}

/** Bugünden sonraki önemli günler (bugün hariç). Ardışık bayram günleri tek satırda birleştirilir. */
export function upcomingDays(key: string, limit = 4, horizon = 150): Array<ImportantDay & { until: number; endDate?: string }> {
  const end = addDays(key, horizon);
  const year = Number(key.slice(0, 4));
  const all = [...daysOfYear(year), ...daysOfYear(year + 1)]
    .filter((d) => d.date > key && d.date <= end)
    .sort(sortDays);

  const merged: Array<ImportantDay & { endDate?: string }> = [];
  for (const d of all) {
    const prev = merged.at(-1);
    const base = d.title.replace(/ \(\d\. gün\)$/, '');
    if (prev && prev.kind === d.kind && prev.title === base && addDays(prev.endDate ?? prev.date, 1) === d.date) {
      prev.endDate = d.date;
      continue;
    }
    merged.push({ ...d, title: base });
  }
  return merged.slice(0, limit).map((d) => ({ ...d, until: daysBetween(key, d.date) }));
}

/** Adli tatil durumu: içindeyse kalan gün, değilse başlangıca kalan gün. */
export function judicialRecess(key: string): { active: boolean; daysLeft: number; startsIn: number } {
  const year = Number(key.slice(0, 4));
  const start = `${year}-07-20`;
  const endKey = `${year}-08-31`;
  if (key >= start && key <= endKey) return { active: true, daysLeft: daysBetween(key, endKey), startsIn: 0 };
  const next = key < start ? start : `${year + 1}-07-20`;
  return { active: false, daysLeft: 0, startsIn: daysBetween(key, next) };
}
