import type { LawBlock } from './law-text';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Ayrıştırılmış mevzuatı HTML parçasına çevirir. Metnin tamamı kaçışlanır; yalnızca bu fonksiyonun
 * ürettiği etiketler HTML olarak yorumlanır (mevzuat metni hiçbir zaman HTML olarak işlenmez).
 */
export function renderLawHtml(blocks: LawBlock[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case 'section':
        out.push(`<h2 class="law-section" id="${block.id}">${escapeHtml(block.text)}</h2>`);
        break;
      case 'heading':
        out.push(`<h3 class="law-title">${escapeHtml(block.text)}</h3>`);
        break;
      case 'note':
        out.push(`<p class="law-note">${escapeHtml(block.text)}</p>`);
        break;
      case 'paragraph':
        out.push(`<p>${escapeHtml(block.text)}</p>`);
        break;
      case 'article': {
        const titles = block.titles.map((t) => `<h3 class="law-title">${escapeHtml(t)}</h3>`).join('');
        const [first = '', ...rest] = block.paragraphs;
        const label = `<a class="law-label" href="#${block.anchor}">${escapeHtml(block.label)}</a>`;
        const body = [`<p>${label}${first ? ` ${escapeHtml(first)}` : ''}</p>`, ...rest.map((p) => `<p>${escapeHtml(p)}</p>`)].join('');
        out.push(`<section class="law-article" id="${block.anchor}">${titles}${body}</section>`);
        break;
      }
    }
  }
  return out.join('\n');
}
