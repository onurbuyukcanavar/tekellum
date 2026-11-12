import { describe, expect, it } from 'vitest';
import { daysOn, judicialRecess, upcomingDays } from '@/lib/calendar/days';
import { describeWeather } from '@/lib/weather/codes';

describe('günlük takvim', () => {
  it('resmî tatilleri ve yarım günleri bulur', () => {
    expect(daysOn('2026-10-29').map((d) => [d.title, d.kind])).toEqual([['Cumhuriyet Bayramı', 'resmi-tatil']]);
    expect(daysOn('2026-10-28')[0].kind).toBe('yarim-gun');
    expect(daysOn('2027-03-09')[0].title).toBe('Ramazan Bayramı (1. gün)');
    expect(daysOn('2026-11-12')).toEqual([]);
  });

  it('aynı güne düşen günleri önem sırasıyla verir', () => {
    // 2027'de 19 Mayıs Kurban Bayramı'nın 4. gününe denk geliyor.
    expect(daysOn('2027-05-19').map((d) => d.title)).toEqual(['Atatürk\'ü Anma, Gençlik ve Spor Bayramı', 'Kurban Bayramı (4. gün)']);
  });

  it('hesaplanan günler: Anneler Günü mayısın 2. pazarı', () => {
    expect(daysOn('2027-05-09').map((d) => d.title)).toContain('Anneler Günü');
    expect(daysOn('2026-06-21').map((d) => d.title)).toContain('Babalar Günü');
  });

  it('yaklaşan günler: bayram günleri tek satırda birleşir, yıl sonunu aşar', () => {
    const up = upcomingDays('2027-03-07', 3);
    expect(up[0]).toMatchObject({ title: 'Ramazan Bayramı arifesi', until: 1 });
    expect(up[1]).toMatchObject({ title: 'Dünya Kadınlar Günü', until: 1 }); // arife ile aynı gün
    expect(up[2]).toMatchObject({ title: 'Ramazan Bayramı', date: '2027-03-09', endDate: '2027-03-11', until: 2 });
    expect(upcomingDays('2026-12-30', 2).map((d) => d.date)).toEqual(['2027-01-01', '2027-01-04']);
  });

  it('adli tatil durumu', () => {
    expect(judicialRecess('2026-07-19')).toMatchObject({ active: false, startsIn: 1 });
    expect(judicialRecess('2026-07-20')).toMatchObject({ active: true, daysLeft: 42 });
    expect(judicialRecess('2026-08-31')).toMatchObject({ active: true, daysLeft: 0 });
    expect(judicialRecess('2026-09-01')).toMatchObject({ active: false });
  });

  it('hava durumu kodları Türkçe', () => {
    expect(describeWeather(0).text).toBe('Açık');
    expect(describeWeather(63).icon).toBe('yagmur');
    expect(describeWeather(1234).text).toBe('—');
  });
});
