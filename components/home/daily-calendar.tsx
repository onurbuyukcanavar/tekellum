import { daysOn, judicialRecess, KIND_LABEL, upcomingDays, type DayKind } from '@/lib/calendar/days';
import { todayKey } from '@/lib/gazette/source';
import { WeatherWidget } from './weather';

const KIND_STYLE: Record<DayKind, string> = {
  'resmi-tatil': 'border-bronze/50 bg-bronze/10 text-bronze',
  'yarim-gun': 'border-bronze/40 bg-bronze/5 text-bronze',
  dini: 'border-line-strong text-ink-soft',
  hukuk: 'border-navy/30 bg-navy/5 text-navy',
  anma: 'border-line-strong text-ink-soft',
};

function dateParts(key: string) {
  const d = new Date(`${key}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', ...o }).format(d);
  return { day: f({ day: 'numeric' }), month: f({ month: 'long' }), year: f({ year: 'numeric' }), weekday: f({ weekday: 'long' }) };
}

function shortDate(key: string) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00Z`));
}

function untilLabel(n: number) {
  return n === 1 ? 'yarın' : `${n} gün sonra`;
}

export function DailyCalendar() {
  const today = todayKey();
  const { day, month, year, weekday } = dateParts(today);
  const events = daysOn(today);
  const upcoming = upcomingDays(today, 3);
  const recess = judicialRecess(today);
  const isWeekend = ['Cumartesi', 'Pazar'].includes(weekday);

  return (
    <aside aria-labelledby="takvim-baslik" className="rounded-2xl border border-line bg-paper-raised shadow-sm">
      <div className="flex items-start gap-5 border-b border-line px-6 pt-6 pb-5">
        <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-line text-center">
          <span className="w-full bg-navy py-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-paper">{month.slice(0, 3)}</span>
          <span className="py-1 font-serif text-3xl leading-tight text-navy">{day}</span>
        </div>
        <div className="min-w-0">
          <h2 id="takvim-baslik" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">Bugün</h2>
          <p className="mt-1 font-serif text-xl leading-snug text-navy">{day} {month} {year}</p>
          <p className="text-sm text-muted">{weekday}{isWeekend && !events.some((e) => e.kind === 'resmi-tatil') ? ' · hafta sonu' : ''}</p>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.title}>
                <span className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wider ${KIND_STYLE[e.kind]}`}>
                  {KIND_LABEL[e.kind]}
                </span>
                <p className="font-serif text-lg leading-snug text-navy">{e.title}</p>
                {e.note && <p className="text-xs text-muted">{e.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Bugün için kayıtlı özel bir gün yok.</p>
        )}

        {recess.active && (
          <p className="rounded-lg border border-navy/20 bg-navy/5 px-3 py-2 text-sm text-navy">
            <strong className="font-semibold">Adli tatil</strong> sürüyor · {recess.daysLeft === 0 ? 'bugün son gün' : `bitimine ${recess.daysLeft} gün`}
          </p>
        )}

        {upcoming.length > 0 && (
          <div>
            <h3 className="mb-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">Yaklaşan</h3>
            <ul className="space-y-1.5 text-sm">
              {upcoming.map((u) => (
                <li key={u.date + u.title} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-ink">
                    {u.title}
                    <span className="block text-xs text-muted">
                      {shortDate(u.date)}{u.endDate ? ` – ${shortDate(u.endDate)}` : ''} · {KIND_LABEL[u.kind]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{untilLabel(u.until)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-line px-6 py-5">
        <h3 className="mb-3 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">Hava durumu</h3>
        <WeatherWidget />
      </div>
    </aside>
  );
}
