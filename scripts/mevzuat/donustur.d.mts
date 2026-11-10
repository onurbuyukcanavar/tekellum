export const ARTICLE_RE: RegExp;
export function convertMevzuatHtml(html: string): string;
export function rawBodyText(html: string): string;
export function articleLabels(text: string): string[];
export function words(text: string): string[];
export function coverage(aText: string, bText: string): number;
export function parseMbsUrl(url: string): { no: string; tur: string; tertip: string } | null;
export function mbsTextUrl(ref: { no: string; tur: string; tertip: string }): string;
