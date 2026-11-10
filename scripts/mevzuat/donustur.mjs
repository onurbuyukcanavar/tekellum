/**
 * Mevzuat Bilgi Sistemi'nin (mevzuat.gov.tr) kanun metni HTML'ini Müessir'in sade metin biçimine çevirir.
 *
 * Çıktı biçimi (satır başına bir blok):
 *   # BİRİNCİ KISIM — Genel Hükümler      → bölüm başlığı (içindekilerde görünür)
 *   ## A. Sözleşmenin kurulması            → madde başlığı
 *   MADDE 1- Sözleşme, …                    → madde
 *   (diğer satırlar)                        → fıkra / paragraf
 *   [3] 17/1/2019 tarihli …                 → dipnot ("# Dipnotlar" başlığı altında)
 *
 * MBS metinleri Word'den dışa aktarılmıştır ve sınıf adları kanundan kanuna değişir; bu yüzden
 * başlıklar sınıf adına değil, metnin konumuna ve biçimine göre belirlenir.
 */
import * as cheerio from 'cheerio';

export const ARTICLE_RE =
  /^((?:EK |GEÇİCİ |MÜKERRER |Ek |Geçici |Mükerrer )?(?:MADDE|Madde))\s*(\d+(?:\s*\/\s*[A-Za-zÇĞİÖŞÜçğıöşü])?(?:\s*\/\s*\d+)?)\s*[-–—.:]?/;
const META_RE = /^(Kanun Numarası|Kabul Tarihi|Yayımlandığı (Resm[iî] Gazete|Düstur))(?=[\s:]|$)/;
const HEADING_CLASS_RE = /balk|basl|ksmblm/i;

const clean = (s) =>
  s
    .replace(/ /g, ' ')
    .replace(/[​‎‏﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isUpperHeading = (t) => {
  const letters = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/g, '');
  return letters.length >= 3 && t === t.toLocaleUpperCase('tr-TR') && t.length <= 120;
};

/** HTML → ham bloklar (metin + biçim ipuçları). */
function extractBlocks(html) {
  const $ = cheerio.load(html);
  $('script, style, link, meta, img').remove();
  $('br').replaceWith(' ');
  const blocks = [];
  // Word dışa aktarımları metni p, h1-h6, pre, li, blockquote ve (yaprak) div etiketlerine dağıtır;
  // HMK'nın bazı maddeleri örneğin <pre> içindedir. İç içe bloklar yalnızca bir kez okunur.
  const BLOCK = 'p, h1, h2, h3, h4, h5, h6, pre, li, blockquote, div, table';
  $('body')
    .find(BLOCK)
    .each((_, el) => {
      const node = $(el);
      if (el.tagName !== 'table' && node.parents('table').length) return; // tablo hücreleri tablo olarak işlenir
      if (el.tagName === 'div' && node.find(BLOCK).length) return; // kapsayıcı div: içindekiler ayrıca okunur
      if (el.tagName !== 'div' && el.tagName !== 'table' && node.parents('p, h1, h2, h3, h4, h5, h6, pre, li, blockquote').length) return;
      if (el.tagName === 'table') {
        const rows = [];
        node.find('tr').each((__, tr) => {
          const cells = $(tr)
            .find('td, th')
            .map((___, td) => clean($(td).text()))
            .get();
          if (cells.some(Boolean)) rows.push(cells.join(' | '));
        });
        if (rows.length) blocks.push({ kind: 'table', rows });
        return;
      }
      const text = clean(node.text());
      if (!text) return;
      const cls = node.attr('class') || '';
      const boldText = clean(node.find('b, strong').text());
      blocks.push({
        kind: 'p',
        text,
        tag: el.tagName,
        headingHint: /^h[1-6]$/.test(el.tagName) || HEADING_CLASS_RE.test(cls),
        fullyBold: boldText.length > 0 && boldText.replace(/\s/g, '') === text.replace(/\s/g, ''),
        footnote: /footnote/i.test(cls) || node.parents('[id^="ftn"], [style*="mso-element:footnote"]').length > 0,
      });
    });
  return blocks;
}

/** Ham blokları sade metin satırlarına çevirir. */
export function convertMevzuatHtml(html) {
  const raw = extractBlocks(html);
  const isArticle = (b) => b && b.kind === 'p' && !b.footnote && ARTICLE_RE.test(b.text);

  // 1) Başlık olabilecek blokları işaretle.
  for (let i = 0; i < raw.length; i += 1) {
    const b = raw[i];
    if (b.kind !== 'p' || b.footnote || isArticle(b) || META_RE.test(b.text)) continue;
    const short = b.text.length <= 200;
    const endsLikeSentence = /[.;,]$/.test(b.text) && !/\[\d+\]$/.test(b.text);
    if (short && (b.headingHint || b.fullyBold) && !endsLikeSentence) b.heading = true;
    if (short && isUpperHeading(b.text)) b.heading = true;
  }
  // 2) Bir maddeden hemen önce gelen, cümle gibi bitmeyen kısa satırlar da madde başlığıdır.
  for (let i = 0; i < raw.length; i += 1) {
    if (!isArticle(raw[i])) continue;
    for (let j = i - 1; j >= 0; j -= 1) {
      const b = raw[j];
      if (b.kind !== 'p' || b.footnote || isArticle(b) || META_RE.test(b.text)) break;
      if (b.heading) continue;
      const cleanEnd = b.text.replace(/\s*\[\d+\]$/, '');
      if (b.text.length <= 160 && !/[.;,]$/.test(cleanEnd)) b.heading = true;
      else break;
    }
  }

  // 3) Satırları üret.
  const lines = [];
  let footnotesStarted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const b = raw[i];
    if (b.kind === 'table') {
      for (const row of b.rows) lines.push(row);
      continue;
    }
    if (b.footnote) {
      if (!footnotesStarted) {
        lines.push('# Dipnotlar');
        footnotesStarted = true;
      }
      lines.push(b.text);
      continue;
    }
    if (!b.heading) {
      lines.push(b.text);
      continue;
    }
    if (isUpperHeading(b.text)) {
      // "BİRİNCİ KISIM" + hemen ardından gelen ad satırı → tek bölüm başlığı;
      // ad satırı doğrudan bir maddeden önce geliyorsa o satır madde başlığıdır, birleştirilmez.
      const next = raw[i + 1];
      if (next && next.kind === 'p' && next.heading && !isUpperHeading(next.text) && !isArticle(raw[i + 2])) {
        lines.push(`# ${b.text} — ${next.text}`);
        i += 1;
      } else {
        lines.push(`# ${b.text}`);
      }
    } else {
      lines.push(`## ${b.text}`);
    }
  }
  return lines.join('\n');
}

/** HTML gövdesinin ham metni (dönüştürmede hiçbir metnin kaybolmadığını denetlemek için). */
export function rawBodyText(html) {
  const $ = cheerio.load(html);
  $('script, style, link, meta, img').remove();
  $('br').replaceWith(' ');
  $('p, h1, h2, h3, h4, h5, h6, pre, li, blockquote, div, tr, td, th').append(' ');
  return clean($('body').text());
}

/** Madde etiketlerini sırasıyla döndürür (karşılaştırma ve denetim için). */
export function articleLabels(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(ARTICLE_RE);
    if (m) out.push(`${m[1].toLocaleUpperCase('tr-TR')} ${m[2].replace(/\s+/g, '')}`);
  }
  return out;
}

/** Türkçe kelime listesi (küçük harf). */
export function words(text) {
  return text.toLocaleLowerCase('tr-TR').match(/[a-zçğıöşüâîû]{2,}/g) || [];
}

/** a'daki kelimelerin (tekrar sayısıyla) b'de bulunma oranı. 1 = hiçbir kelime kaybolmamış. */
export function coverage(aText, bText) {
  const count = (arr) => arr.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
  const a = count(words(aText));
  const b = count(words(bText));
  let hit = 0;
  let total = 0;
  for (const [w, c] of a) {
    total += c;
    hit += Math.min(c, b.get(w) || 0);
  }
  return total ? hit / total : 0;
}

/** MBS bağlantısından kanun numarası, türü ve tertibini çıkarır. */
export function parseMbsUrl(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)mevzuat\.gov\.tr$/i.test(u.hostname)) return null;
    const no = u.searchParams.get('MevzuatNo');
    const tur = u.searchParams.get('MevzuatTur') || '1';
    const tertip = u.searchParams.get('MevzuatTertip');
    if (!no || !tertip || !/^\d+$/.test(no + tur + tertip)) return null;
    return { no, tur, tertip };
  } catch {
    return null;
  }
}

export function mbsTextUrl({ no, tur, tertip }) {
  return `https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetayIframe?MevzuatTur=${tur}&MevzuatNo=${no}&MevzuatTertip=${tertip}`;
}
