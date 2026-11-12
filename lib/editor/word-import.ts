'use client';

import { uploadImage } from './image-upload';

export type WordImportResult = { html: string; images: number; failedImages: number; footnotes: number; warnings: boolean };

/**
 * .docx dosyasını editörün anladığı HTML'e çevirir:
 * görseller siteye yüklenir, Word dipnotları ve sonnotları editör dipnotlarına dönüştürülür.
 */
export async function importWordDocument(file: File, onProgress?: (msg: string) => void): Promise<WordImportResult> {
  const mammoth = await import('mammoth');
  let images = 0, failedImages = 0;
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          onProgress?.(`Görseller yükleniyor (${images + failedImages + 1})…`);
          const bytes = await image.readAsArrayBuffer();
          const uploaded = await uploadImage(new Blob([bytes], { type: image.contentType }));
          images++;
          return { src: uploaded.src, width: String(uploaded.width), height: String(uploaded.height) } as { src: string };
        } catch {
          failedImages++;
          return { src: '' };
        }
      }),
    },
  );

  const doc = new DOMParser().parseFromString(`<body>${result.value}</body>`, 'text/html');
  doc.querySelectorAll('img').forEach((img) => { if (!img.getAttribute('src')) img.remove(); });

  // Dipnot metinlerini topla: <li id="footnote-1"><p>Metin <a href="#footnote-ref-1">↑</a></p></li>
  const notes = new Map<string, string>();
  doc.querySelectorAll('li[id^="footnote-"], li[id^="endnote-"]').forEach((li) => {
    li.querySelectorAll('a[href^="#footnote-ref-"], a[href^="#endnote-ref-"]').forEach((a) => a.remove());
    notes.set(li.id, (li.textContent ?? '').replace(/\s+/g, ' ').trim());
    const list = li.parentElement;
    li.remove();
    if (list && !list.children.length) list.remove();
  });

  let footnotes = 0;
  doc.querySelectorAll('a[href^="#footnote-"], a[href^="#endnote-"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1);
    const text = notes.get(id);
    if (text == null) return;
    const sup = doc.createElement('sup');
    sup.setAttribute('data-footnote', text);
    const host = a.parentElement?.tagName === 'SUP' ? a.parentElement : a;
    host.replaceWith(sup);
    footnotes++;
  });

  return { html: doc.body.innerHTML, images, failedImages, footnotes, warnings: result.messages.some((m) => m.type === 'warning') };
}
