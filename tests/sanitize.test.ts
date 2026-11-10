import { describe, expect, it } from 'vitest';
import { htmlToPlainText, readingMinutes, sanitizeArticleHtml } from '@/lib/sanitize';

describe('sanitizeArticleHtml', () => {
  it('betik ve olay işleyicilerini atar', () => {
    const out = sanitizeArticleHtml('<p onclick="x()">Merhaba<script>alert(1)</script><img src=x onerror=alert(1)></p>');
    expect(out).toBe('<p>Merhaba</p>');
  });
  it('javascript: bağlantılarını etkisizleştirir', () => {
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });
  it('dış bağlantılara güvenli rel/target ekler', () => {
    expect(sanitizeArticleHtml('<a href="https://ornek.com">x</a>')).toBe(
      '<a href="https://ornek.com" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });
  it('h1 başlıkları h2 yapar, stil özniteliklerini atar', () => {
    expect(sanitizeArticleHtml('<h1 style="color:red">Başlık</h1>')).toBe('<h2>Başlık</h2>');
  });
  it('Tiptap tablolarını korur', () => {
    const html = '<table style="min-width:75px"><colgroup><col style="min-width:25px"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>A</p></th></tr></tbody></table>';
    expect(sanitizeArticleHtml(html)).toBe('<table><colgroup><col /></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>A</p></th></tr></tbody></table>');
  });
  it('iframe ve style etiketlerini tamamen kaldırır', () => {
    expect(sanitizeArticleHtml('<iframe src="https://x"></iframe><style>p{}</style><p>ok</p>')).toBe('<p>ok</p>');
  });
});

describe('htmlToPlainText / readingMinutes', () => {
  it('etiketsiz metin ve okuma süresi üretir', () => {
    expect(htmlToPlainText('<p>Bir&nbsp;iki</p><p>üç</p>')).toBe('Bir iki üç');
    expect(htmlToPlainText('<p><br></p>')).toBe('');
    expect(readingMinutes(`<p>${'kelime '.repeat(600)}</p>`)).toBe(3);
  });
});
