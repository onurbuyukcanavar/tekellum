import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('Türkçe karakterleri doğru çevirir', () => {
    expect(slugify('Şirketler Hukukunda Ölçülülük İlkesi')).toBe('sirketler-hukukunda-olcululuk-ilkesi');
    expect(slugify('IŞIK ve ığdır ĞÜÇ')).toBe('isik-ve-igdir-guc');
  });
  it('baştaki ve sondaki tireleri ve fazla boşlukları temizler', () => {
    expect(slugify('-test-')).toBe('test');
    expect(slugify('  çok   boşluklu  —  başlık ')).toBe('cok-bosluklu-baslik');
  });
  it('yalnızca noktalama içeren girdide boş döner', () => {
    expect(slugify('!!! ???')).toBe('');
  });
  it('uzunluğu sınırlar ve sonda tire bırakmaz', () => {
    const s = slugify('a'.repeat(119) + ' b', 120);
    expect(s.length).toBeLessThanOrEqual(120);
    expect(s.endsWith('-')).toBe(false);
  });
});
