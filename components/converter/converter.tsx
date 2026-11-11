'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { getTool, MAX_FILE_BYTES, OUTPUT_LABEL, OUTPUT_MIME, type ToolId } from '@/lib/convert/tools';

type Status = 'bekliyor' | 'isleniyor' | 'tamam' | 'hata';
type Item = {
  id: string;
  file: File;
  status: Status;
  error?: string;
  output?: { name: string; url: string; size: number; bytes: Uint8Array; notes: string[] };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && (error as { name?: string }).name === 'ConvertError') return (error as Error).message;
  console.error(error);
  return 'Dönüştürme sırasında beklenmeyen bir hata oluştu. Dosyanın bozuk olmadığından emin olup tekrar deneyin.';
}

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

let counter = 0;

export function Converter({ toolId }: { toolId: ToolId }) {
  const tool = getTool(toolId)!;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [combined, setCombined] = useState<{ status: Status; error?: string; url?: string; name?: string; size?: number }>({ status: 'bekliyor' });
  const [outName, setOutName] = useState(tool.id === 'pdf-birlestir' ? 'birlestirilmis' : 'gorseller');
  const [zipping, setZipping] = useState(false);
  const urls = useRef(new Set<string>());
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const makeUrl = (bytes: Uint8Array, type: string) => {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
    urls.current.add(url);
    return url;
  };

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const convertOne = useCallback(async (item: Item) => {
    update(item.id, { status: 'isleniyor', error: undefined });
    try {
      const [{ convertFile }, { browserEnv }] = await Promise.all([import('@/lib/convert/pipelines'), import('@/lib/convert/browser')]);
      const bytes = new Uint8Array(await item.file.arrayBuffer());
      const out = await convertFile(tool.id, { name: item.file.name, bytes }, browserEnv);
      const url = makeUrl(out.bytes, OUTPUT_MIME[tool.output]);
      update(item.id, { status: 'tamam', output: { name: out.name, url, size: out.bytes.length, bytes: out.bytes, notes: out.notes } });
    } catch (error) {
      update(item.id, { status: 'hata', error: messageOf(error) });
    }
  }, [tool.id, tool.output]);

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const fresh: Item[] = [];
    const rejected: Item[] = [];
    for (const file of list) {
      const id = `f${++counter}`;
      const okExt = tool.accept.some((ext) => file.name.toLowerCase().endsWith(ext)) || (tool.id === 'gorsel-pdf' && file.type.startsWith('image/'));
      if (!okExt) rejected.push({ id, file, status: 'hata', error: `Bu araç ${tool.accept.join(', ')} dosyalarını kabul eder.` });
      else if (file.size > MAX_FILE_BYTES) rejected.push({ id, file, status: 'hata', error: `Dosya çok büyük (${formatSize(file.size)}); en fazla ${formatSize(MAX_FILE_BYTES)}.` });
      else fresh.push({ id, file, status: 'bekliyor' });
    }
    setItems((cur) => [...cur, ...fresh, ...rejected]);
    setCombined({ status: 'bekliyor' });
    if (!tool.combine) {
      for (const item of fresh) queue.current = queue.current.then(() => convertOne(item));
    }
  };

  const remove = (id: string) => {
    setItems((list) => {
      const it = list.find((x) => x.id === id);
      if (it?.output) { URL.revokeObjectURL(it.output.url); urls.current.delete(it.output.url); }
      return list.filter((x) => x.id !== id);
    });
    setCombined({ status: 'bekliyor' });
  };

  const move = (id: string, dir: -1 | 1) => {
    setItems((list) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setCombined({ status: 'bekliyor' });
  };

  const runCombine = async () => {
    const valid = items.filter((i) => i.status !== 'hata');
    if (tool.id === 'pdf-birlestir' && valid.length < 2) {
      setCombined({ status: 'hata', error: 'Birleştirmek için en az iki PDF seçin.' });
      return;
    }
    if (!valid.length) return;
    setCombined({ status: 'isleniyor' });
    try {
      const { combineFiles } = await import('@/lib/convert/pipelines');
      const name = (outName.trim() || 'belge').replace(/[\\/:*?"<>|]+/g, '-');
      let out;
      if (tool.id === 'gorsel-pdf') {
        const { normalizeImage } = await import('@/lib/convert/browser');
        const images = [];
        for (const it of valid) images.push(await normalizeImage(it.file));
        out = await combineFiles(tool.id, [], images, name);
      } else {
        const files = await Promise.all(valid.map(async (it) => ({ name: it.file.name, bytes: new Uint8Array(await it.file.arrayBuffer()) })));
        out = await combineFiles(tool.id, files, null, name);
      }
      const url = makeUrl(out.bytes, 'application/pdf');
      setCombined({ status: 'tamam', url, name: out.name, size: out.bytes.length });
    } catch (error) {
      setCombined({ status: 'hata', error: messageOf(error) });
    }
  };

  const downloadAll = async () => {
    const done = items.filter((i) => i.output);
    if (!done.length) return;
    setZipping(true);
    try {
      const { zipOutputs } = await import('@/lib/convert/browser');
      const zipBytes = await zipOutputs(done.map((i) => ({ name: i.output!.name, bytes: i.output!.bytes })));
      const url = makeUrl(zipBytes, 'application/zip');
      download(url, `donusturulen-belgeler.zip`);
    } finally {
      setZipping(false);
    }
  };

  const doneCount = items.filter((i) => i.status === 'tamam').length;
  const busy = items.some((i) => i.status === 'isleniyor') || combined.status === 'isleniyor';

  return (
    <div className="space-y-6">
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging ? 'border-bronze bg-bronze/5' : 'border-line-strong bg-paper-raised hover:border-bronze/70'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-bronze" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="mt-4 font-serif text-xl text-navy">Dosya seçin ya da buraya sürükleyin</span>
        <span className="mt-2 text-sm text-muted">
          {tool.accept.filter((a) => a !== '.jpeg' && a !== '.heif').join(', ')} · birden fazla dosya seçebilirsiniz
        </span>
        <span className="btn mt-6 pointer-events-none">Dosya seç</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          // .udf gibi özel uzantılar mobil dosya seçicide gri görünmesin diye accept yalnızca bilinen türlerde verilir.
          accept={tool.inputAccept}
          className="sr-only"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
      </label>

      <p className="flex items-start gap-2 text-sm text-muted">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Dosyalarınız sunucuya yüklenmez; dönüştürme tamamen bu cihazda, tarayıcınızın içinde yapılır.
      </p>

      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper-raised" aria-live="polite">
          {items.map((it, idx) => (
            <li key={it.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink" title={it.file.name}>{tool.combine ? `${idx + 1}. ` : ''}{it.file.name}</p>
                <p className="mt-0.5 text-sm">
                  {it.status === 'bekliyor' && <span className="text-muted">{tool.combine ? formatSize(it.file.size) : 'Sırada…'}</span>}
                  {it.status === 'isleniyor' && <span className="text-bronze">Dönüştürülüyor…</span>}
                  {it.status === 'tamam' && it.output && <span className="text-ok-ink">Hazır · {it.output.name} · {formatSize(it.output.size)}</span>}
                  {it.status === 'hata' && <span className="text-danger">{it.error}</span>}
                </p>
                {it.output?.notes.length ? (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted">{it.output.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {it.status === 'tamam' && it.output && (
                  <>
                    <button type="button" className="btn" onClick={() => download(it.output!.url, it.output!.name)}>İndir</button>
                    {tool.output === 'pdf' && <a className="btn-secondary" href={it.output.url} target="_blank" rel="noopener">Önizle</a>}
                  </>
                )}
                {it.status === 'hata' && !tool.combine && tool.accept.some((ext) => it.file.name.toLowerCase().endsWith(ext)) && it.file.size <= MAX_FILE_BYTES && (
                  <button type="button" className="btn-secondary" onClick={() => convertOne(it)}>Tekrar dene</button>
                )}
                {tool.combine && (
                  <>
                    <button type="button" className="btn-secondary px-3" aria-label="Yukarı taşı" disabled={idx === 0 || busy} onClick={() => move(it.id, -1)}>↑</button>
                    <button type="button" className="btn-secondary px-3" aria-label="Aşağı taşı" disabled={idx === items.length - 1 || busy} onClick={() => move(it.id, 1)}>↓</button>
                  </>
                )}
                <button type="button" className="btn-secondary px-3" aria-label={`${it.file.name} dosyasını kaldır`} disabled={it.status === 'isleniyor'} onClick={() => remove(it.id)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!tool.combine && doneCount > 1 && (
        <div className="flex justify-end">
          <button type="button" className="btn-secondary" disabled={zipping} onClick={downloadAll}>
            {zipping ? 'Hazırlanıyor…' : `Tümünü indir (${doneCount} dosya, ZIP)`}
          </button>
        </div>
      )}

      {tool.combine && items.length > 0 && (
        <div className="card space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor={`${inputId}-ad`} className="field-label">Çıktı dosyasının adı</label>
              <div className="flex items-center gap-2">
                <input id={`${inputId}-ad`} className="field-input" value={outName} onChange={(e) => { setOutName(e.target.value); setCombined({ status: 'bekliyor' }); }} />
                <span className="text-sm text-muted">.pdf</span>
              </div>
            </div>
            <button type="button" className="btn" disabled={busy} onClick={runCombine}>
              {combined.status === 'isleniyor' ? 'Hazırlanıyor…' : tool.id === 'pdf-birlestir' ? 'PDF\'leri birleştir' : 'PDF oluştur'}
            </button>
          </div>
          {combined.status === 'hata' && <p className="notice-warn" role="alert">{combined.error}</p>}
          {combined.status === 'tamam' && combined.url && (
            <div className="notice-ok flex flex-wrap items-center justify-between gap-3" role="status">
              <span>Hazır: {combined.name} · {formatSize(combined.size ?? 0)}</span>
              <span className="flex gap-2">
                <button type="button" className="btn" onClick={() => download(combined.url!, combined.name!)}>İndir</button>
                <a className="btn-secondary" href={combined.url} target="_blank" rel="noopener">Önizle</a>
              </span>
            </div>
          )}
          <p className="text-xs text-muted">Sırayı ↑ ↓ düğmeleriyle değiştirebilirsiniz; {tool.id === 'gorsel-pdf' ? 'her görsel ayrı bir A4 sayfası olur.' : 'PDF\'ler bu sırayla art arda eklenir.'}</p>
        </div>
      )}

      {items.length > 0 && !busy && (
        <div className="flex justify-center">
          <button type="button" className="link-quiet text-sm text-muted" onClick={() => inputRef.current?.click()}>+ Başka dosya ekle</button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{busy ? 'Dönüştürülüyor' : ''}</span>
      <noscript><p className="notice-warn">Dönüştürücü tarayıcınızda çalışır; JavaScript&apos;i etkinleştirin.</p></noscript>
      {/* Çıktı türü bilgisi */}
      <p className="sr-only">Çıktı biçimi: {OUTPUT_LABEL[tool.output]}</p>
    </div>
  );
}
