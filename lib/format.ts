const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  return dateTimeFormatter.format(new Date(value));
}
