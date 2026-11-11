'use client';

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { useRef, useState } from 'react';

type Props = {
  initialContent: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export function RichTextEditor({ initialContent, onChange, invalid, describedBy }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto'] },
      }),
      Placeholder.configure({ placeholder: 'Makalenizi buraya yazın ya da bir Word dosyası içe aktarın…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose-tekellum !text-[1.05rem]',
        'aria-label': 'Makale metni',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  async function importDocx(file: File | undefined) {
    if (!file || !editor) return;
    setImportMessage(null);
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setImportMessage({ tone: 'warn', text: 'Lütfen .docx uzantılı bir Word dosyası seçin. Eski .doc biçimi desteklenmiyor.' });
      return;
    }
    if (file.size > MAX_DOCX_BYTES) {
      setImportMessage({ tone: 'warn', text: 'Word dosyası en fazla 10 MB olabilir.' });
      return;
    }
    if (!editor.isEmpty && !window.confirm('Mevcut metin Word dosyasının içeriğiyle değiştirilecek. Devam edilsin mi?')) return;
    setImporting(true);
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        // Görseller aktarılmaz (gömülü base64 görseller veritabanını şişirir).
        { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) },
      );
      const html = result.value.replace(/<img[^>]*>/gi, '');
      if (!html.trim()) throw new Error('Word dosyasında aktarılabilir metin bulunamadı.');
      editor.commands.setContent(html, { emitUpdate: true });
      setImportMessage(
        result.messages.length
          ? { tone: 'warn', text: 'Belge aktarıldı. Bazı özel biçimler (görseller, dipnotlar, sayfa düzeni) birebir aktarılmamış olabilir; lütfen kontrol edin.' }
          : { tone: 'ok', text: 'Belge aktarıldı. Yayımlamadan önce metni gözden geçirin.' },
      );
    } catch (error) {
      setImportMessage({ tone: 'warn', text: error instanceof Error ? error.message : 'Word dosyası okunamadı.' });
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className={`overflow-hidden rounded-lg border bg-paper-raised ${invalid ? 'border-danger' : 'border-line-strong'} focus-within:border-bronze focus-within:ring-2 focus-within:ring-bronze/25`}>
      <Toolbar editor={editor} onImport={() => fileInput.current?.click()} importing={importing} />
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => void importDocx(e.target.files?.[0])}
        data-testid="docx-input"
      />
      <EditorContent editor={editor} className="tiptap-content" />
      {importMessage && (
        <p className={`mx-4 mb-4 ${importMessage.tone === 'ok' ? 'notice-ok' : 'notice-warn'}`} role="status">{importMessage.text}</p>
      )}
    </div>
  );
}

function Toolbar({ editor, onImport, importing }: { editor: Editor | null; onImport: () => void; importing: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
            link: e.isActive('link'),
            table: e.isActive('table'),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !state) {
    return <div className="h-12 border-b border-line bg-paper" aria-hidden />;
  }

  const chain = () => editor.chain().focus();

  function openLink() {
    setLinkValue((editor!.getAttributes('link').href as string) ?? '');
    setLinkOpen(true);
  }
  function applyLink(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault();
    const href = linkValue.trim();
    if (!href) chain().extendMarkRange('link').unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: /^(https?:|mailto:)/i.test(href) ? href : `https://${href}` }).run();
    setLinkOpen(false);
  }

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-paper">
      <div role="toolbar" aria-label="Metin biçimlendirme" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <Btn label="Kalın (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}><b>K</b></Btn>
        <Btn label="İtalik (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}><i className="font-serif">İ</i></Btn>
        <Btn label="Altı çizili (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}><u>A</u></Btn>
        <Btn label="Üstü çizili" active={state.strike} onClick={() => chain().toggleStrike().run()}><s>Ç</s></Btn>
        <Sep />
        <Btn label="Başlık" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>Başlık</Btn>
        <Btn label="Alt başlık" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>Alt başlık</Btn>
        <Btn label="Normal paragraf" onClick={() => chain().setParagraph().run()}>Normal</Btn>
        <Sep />
        <Btn label="Madde işaretli liste" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>• Liste</Btn>
        <Btn label="Numaralı liste" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>1. Liste</Btn>
        <Btn label="Alıntı" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>❝ Alıntı</Btn>
        <Btn label="Bağlantı" active={state.link} onClick={openLink}>Bağlantı</Btn>
        <Btn label="Ayırıcı çizgi" onClick={() => chain().setHorizontalRule().run()}>―</Btn>
        <Btn label="Tablo ekle" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Tablo</Btn>
        <Sep />
        <Btn label="Geri al (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>↶</Btn>
        <Btn label="Yinele (Ctrl+Y)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>↷</Btn>
        <span className="flex-1" />
        <button type="button" onClick={onImport} disabled={importing} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-bronze hover:text-bronze disabled:opacity-60">
          {importing ? 'Aktarılıyor…' : 'Word (.docx) içe aktar'}
        </button>
      </div>

      {state.table && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-line px-2 py-1.5 text-xs" role="toolbar" aria-label="Tablo">
          <span className="mr-1 text-muted">Tablo:</span>
          <Btn label="Üste satır" onClick={() => chain().addRowBefore().run()}>+ Satır ↑</Btn>
          <Btn label="Alta satır" onClick={() => chain().addRowAfter().run()}>+ Satır ↓</Btn>
          <Btn label="Sola sütun" onClick={() => chain().addColumnBefore().run()}>+ Sütun ←</Btn>
          <Btn label="Sağa sütun" onClick={() => chain().addColumnAfter().run()}>+ Sütun →</Btn>
          <Btn label="Satırı sil" onClick={() => chain().deleteRow().run()}>− Satır</Btn>
          <Btn label="Sütunu sil" onClick={() => chain().deleteColumn().run()}>− Sütun</Btn>
          <Btn label="Başlık satırı" onClick={() => chain().toggleHeaderRow().run()}>Başlık satırı</Btn>
          <Btn label="Tabloyu sil" onClick={() => chain().deleteTable().run()}>Tabloyu sil</Btn>
        </div>
      )}

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
          <label htmlFor="link-url" className="text-xs text-muted">Bağlantı adresi</label>
          <input
            id="link-url"
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink(e as unknown as React.FormEvent);
              if (e.key === 'Escape') setLinkOpen(false);
            }}
            placeholder="https://"
            className="field-input !w-auto flex-1 !py-1.5 text-sm"
          />
          <button type="button" className="btn !px-3 !py-1.5" onClick={applyLink}>Uygula</button>
          <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => setLinkOpen(false)}>Vazgeç</button>
        </div>
      )}
    </div>
  );
}

function Btn({ children, label, active, disabled, onClick }: {
  children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-8 rounded-md px-2 py-1 text-sm transition disabled:opacity-35 ${
        active ? 'bg-navy text-paper' : 'text-ink-soft hover:bg-line/60 hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-line" aria-hidden />;
}
