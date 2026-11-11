const longDate = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-11-11" → "11 Kasım 2026 Çarşamba" */
export function formatGazetteDate(key: string, withWeekday = true): string {
  const date = new Date(`${key}T00:00:00Z`);
  if (!withWeekday) return shortDate.format(date);
  const parts = longDate.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return `${shortDate.format(date)} ${weekday}`;
}

export function supplementLabel(supplement: number): string {
  if (!supplement) return '';
  return supplement === 1 ? 'Mükerrer' : `${supplement}. Mükerrer`;
}
