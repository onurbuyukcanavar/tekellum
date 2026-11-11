import { DOMParser } from '@xmldom/xmldom';
import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { ConvertError } from './model';

export type XmlElement = Element;

/** ZIP arşivini açar; bozuk/ZIP olmayan dosyada anlaşılır hata verir. */
export function unzip(bytes: Uint8Array, what: string): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes);
  } catch {
    throw new ConvertError(`${what} açılamadı: dosya bozuk ya da bu türde değil.`);
  }
}

export function zip(files: Record<string, Uint8Array | string>): Uint8Array {
  const input: Zippable = {};
  for (const [name, data] of Object.entries(files)) input[name] = typeof data === 'string' ? strToU8(data) : data;
  return zipSync(input, { level: 6 });
}

/** Arşivde adı büyük/küçük harf duyarsız eşleşen dosyayı bulur. */
export function findEntry(files: Record<string, Uint8Array>, name: string): Uint8Array | undefined {
  if (files[name]) return files[name];
  const lower = name.toLowerCase();
  const key = Object.keys(files).find((k) => k.toLowerCase() === lower);
  return key ? files[key] : undefined;
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}

export function parseXml(text: string, what: string): Document {
  const errors: string[] = [];
  const doc = new DOMParser({
    onError: (level: string, msg: string) => {
      if (level === 'fatalError') errors.push(msg);
    },
  }).parseFromString(text, 'text/xml');
  if (errors.length || !doc.documentElement) throw new ConvertError(`${what} okunamadı: XML yapısı bozuk.`);
  return doc as unknown as Document;
}

export function childElements(el: Element | Document | null | undefined, name?: string): Element[] {
  const out: Element[] = [];
  if (!el) return out;
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!name || localName(n as Element) === name)) out.push(n as Element);
  }
  return out;
}

export function firstChild(el: Element | Document | null | undefined, name: string): Element | null {
  return childElements(el, name)[0] ?? null;
}

export function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^.*:/, '');
}

/** Ad alanı önekinden bağımsız öznitelik okuma (ör. w:val → "val"). */
export function attr(el: Element | null | undefined, name: string): string | null {
  if (!el) return null;
  if (el.hasAttribute(name)) return el.getAttribute(name);
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if ((a.localName || a.name.replace(/^.*:/, '')) === name) return a.value;
  }
  return null;
}

export function num(value: string | null | undefined, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Java Color.getRGB() işaretli ARGB tamsayısı → #rrggbb (tam saydamsa undefined) */
export function argbToHex(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const u = n >>> 0;
  if (u >>> 24 === 0 && u !== 0) return undefined;
  return `#${(u & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** #rrggbb → Java işaretli ARGB */
export function hexToArgb(hex: string): number {
  const v = parseInt(hex.replace('#', ''), 16) & 0xffffff;
  return (0xff000000 | v) | 0;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  if (typeof atob === 'function') {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(clean, 'base64'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  return Buffer.from(bytes).toString('base64');
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** XML 1.0'da geçersiz kontrol karakterlerini atar (\t \n hariç). */
export function stripInvalidXml(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
