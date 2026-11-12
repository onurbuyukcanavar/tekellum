import type { Node as PMNode } from '@tiptap/pm/model';

export type Match = { from: number; to: number };

const fold = (s: string, caseSensitive: boolean) => (caseSensitive ? s : s.toLocaleLowerCase('tr'));

/**
 * Belgedeki eşleşmeleri bulur. Her paragraf ayrı ele alınır; kalın/italik gibi biçim sınırları aramayı bölmez.
 * Türkçe büyük/küçük harf dönüşümü (İ/i, I/ı) dikkate alınır.
 */
export function findMatches(doc: PMNode, query: string, caseSensitive = false): Match[] {
  if (!query) return [];
  const needle = fold(query, caseSensitive);
  const out: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    const map: number[] = [];
    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) map.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        // Dipnot gibi satır içi düğümler aramada eşleşmeyi böler.
        map.push(-1);
        text += '\u0000';
      }
    });
    const hay = fold(text, caseSensitive);
    let i = hay.indexOf(needle);
    while (i !== -1) {
      const from = map[i];
      const last = map[i + needle.length - 1];
      if (from >= 0 && last >= 0 && last - from === needle.length - 1) out.push({ from, to: last + 1 });
      i = hay.indexOf(needle, i + Math.max(1, needle.length));
    }
    return false;
  });
  return out;
}
