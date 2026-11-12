'use client';

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Callout, Figure, Footnote, type FigureSize } from '@/lib/editor/extensions';
import { findMatches, type Match } from '@/lib/editor/find';
import { uploadImage } from '@/lib/editor/image-upload';
import { importWordDocument } from '@/lib/editor/word-import';
import { Icons } from './editor/icons';

type Props = {
  initialContent: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

type Panel = null | 'link' | 'footnote' | 'find' | 'help';
type Notice = { tone: 'ok' | 'warn'; text: string } | null;

const MAX_DOCX_BYTES = 15 * 1024 * 1024;

const SPECIAL_CHARS: Array<[string, string]> = [
  ['§', 'Paragraf işareti (madde)'], ['¶', 'Pilcrow'], ['“', 'Açılış tırnağı'], ['”', 'Kapanış tırnağı'],
  ['‘', 'Tek açılış tırnağı'], ['’', 'Tek kapanış tırnağı / kesme'], ['«', 'Açılış köşeli tırnak'], ['»', 'Kapanış köşeli tırnak'],
  ['–', 'Kısa tire (aralık: 5–10)'], ['—', 'Uzun tire'], ['…', 'Üç nokta'], ['•', 'Madde imi'],
  ['°', 'Derece'], ['±', 'Artı eksi'], ['×', 'Çarpı'], ['÷', 'Bölü'], ['≤', 'Küçük eşit'], ['≥', 'Büyük eşit'],
  ['≠', 'Eşit değil'], ['≈', 'Yaklaşık'], ['%', 'Yüzde'], ['‰', 'Binde'], ['½', 'Yarım'], ['¼', 'Çeyrek'],
  ['¾', 'Dörtte üç'], ['¹', 'Üst simge 1'], ['²', 'Üst simge 2'], ['³', 'Üst simge 3'], ['₺', 'Türk lirası'], ['€', 'Avro'],
  ['$', 'Dolar'], ['£', 'Sterlin'], ['©', 'Telif'], ['®', 'Tescilli'], ['™', 'Ticari marka'], ['†', 'Hançer'],
  ['‡', 'Çift hançer'], ['→', 'Sağ ok'], ['←', 'Sol ok'], ['⇒', 'Çift sağ ok'], ['✓', 'Onay'], ['№', 'Numara'],
];

const SHORTCUTS: Array<[string, string]> = [
  ['Kalın / İtalik / Altı çizili', 'Ctrl+B / Ctrl+I / Ctrl+U'],
  ['Üstü çizili', 'Ctrl+Shift+S'],
  ['Üst simge / Alt simge', 'Ctrl+. / Ctrl+,'],
  ['Vurgu (fosforlu kalem)', 'Ctrl+Shift+H'],
  ['Normal metin', 'Ctrl+Alt+0'],
  ['Başlık 1 / 2 / 3', 'Ctrl+Alt+1 / 2 / 3'],
  ['Madde işaretli / numaralı liste', 'Ctrl+Shift+8 / Ctrl+Shift+7'],
  ['Liste girintisi artır / azalt', 'Tab / Shift+Tab'],
  ['Alıntı', 'Ctrl+Shift+B'],
  ['Sola / ortaya / sağa / iki yana yasla', 'Ctrl+Shift+L / E / R / J'],
  ['Bağlantı', 'Ctrl+K'],
  ['Dipnot ekle', 'Ctrl+Alt+D'],
  ['Bul ve değiştir', 'Ctrl+F'],
  ['Satır sonu (paragraf açmadan)', 'Shift+Enter'],
  ['Geri al / Yinele', 'Ctrl+Z / Ctrl+Y'],
  ['Tam ekrandan çık', 'Esc'],
];

/** Editöre özel klavye kısayolları (başlık numaraları araç çubuğundaki adlarla aynı). */
function shortcuts(open: (p: Panel) => void) {
  return Extension.create({
    name: 'tekellumShortcuts',
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        'Mod-Alt-0': () => this.editor.commands.setParagraph(),
        'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 2 }),
        'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 3 }),
        'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 4 }),
        'Mod-k': () => { open('link'); return true; },
        'Mod-Alt-d': () => { open('footnote'); return true; },
        'Mod-f': () => { open('find'); return true; },
      };
    },
  });
}

export function RichTextEditor({ initialContent, onChange, invalid, describedBy }: Props) {
  const docxInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const insertImages = useCallback(async (editor: Editor, files: File[], at?: number) => {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(f.name));
    if (!images.length) return false;
    setNotice(null);
    for (const [i, file] of images.entries()) {
      setBusy(images.length > 1 ? `Görsel yükleniyor (${i + 1}/${images.length})…` : 'Görsel yükleniyor…');
      try {
        const { src, width, height } = await uploadImage(file);
        const attrs = { src, width, height, alt: '', caption: '', size: 'tam' as FigureSize };
        if (at != null && i === 0) editor.chain().focus().insertContentAt(at, { type: 'figure', attrs }).run();
        else editor.chain().focus().insertFigure(attrs).run();
      } catch (error) {
        setNotice({ tone: 'warn', text: error instanceof Error ? error.message : 'Görsel yüklenemedi.' });
      }
    }
    setBusy(null);
    return true;
  }, []);

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      code: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto'] },
    }),
    Placeholder.configure({ placeholder: 'Makalenizi buraya yazın, bir Word dosyası içe aktarın ya da görsel sürükleyip bırakın…' }),
    CharacterCount,
    // Sola yaslama varsayılandır; ayrıca yazılmaz (gereksiz stil birikmesin).
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'], defaultAlignment: null }),
    Extension.create({
      name: 'solaYaslaKisayolu',
      priority: 1001,
      addKeyboardShortcuts() {
        return { 'Mod-Shift-l': () => this.editor.commands.unsetTextAlign() };
      },
    }),
    Highlight,
    Subscript,
    Superscript,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Footnote,
    Figure,
    Callout,
    shortcuts(setPanel),
  ], []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose-tekellum !text-[1.05rem]',
        'aria-label': 'Makale metni',
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'true',
        lang: 'tr',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        // Word'den kopyalanan metinler görsel olarak da gelir; HTML varsa metin tercih edilir.
        if (!files.length || event.clipboardData?.getData('text/html')) return false;
        const ed = editorRef.current;
        if (!ed) return false;
        event.preventDefault();
        void insertImages(ed, files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        const ed = editorRef.current;
        if (!ed) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(ed, files, pos);
        return true;
      },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name === 'footnote') { setPanel('footnote'); return false; }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    // Araç çubuğu ve sayaçlar editör durumunu ilk işlemle birlikte okur; içerik değiştirmeyen bir işlem gönderilir.
    onCreate: ({ editor }) => { editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false)); },
  });

  const editorRef = useRef<Editor | null>(null);
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // Esc: önce açık paneli kapatır, panel yoksa tam ekrandan çıkar.
  useEffect(() => {
    if (!fullscreen && !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role=menu]')) return;
      if (panel) setPanel(null);
      else setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, panel]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  async function importDocx(file: File | undefined) {
    if (!file || !editor) return;
    setNotice(null);
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setNotice({ tone: 'warn', text: 'Lütfen .docx uzantılı bir Word dosyası seçin. Eski .doc biçimini Word\'de “Farklı Kaydet → .docx” ile dönüştürebilirsiniz.' });
      return;
    }
    if (file.size > MAX_DOCX_BYTES) {
      setNotice({ tone: 'warn', text: 'Word dosyası en fazla 15 MB olabilir.' });
      return;
    }
    if (!editor.isEmpty && !window.confirm('Mevcut metin Word dosyasının içeriğiyle değiştirilecek. Devam edilsin mi?')) return;
    setBusy('Word belgesi okunuyor…');
    try {
      const r = await importWordDocument(file, setBusy);
      if (!r.html.replace(/<[^>]+>/g, '').trim() && !r.images) throw new Error('Word dosyasında aktarılabilir içerik bulunamadı.');
      editor.commands.setContent(r.html, { emitUpdate: true });
      const parts = ['Belge aktarıldı'];
      if (r.images) parts.push(`${r.images} görsel`);
      if (r.footnotes) parts.push(`${r.footnotes} dipnot`);
      const extra = r.failedImages ? ` ${r.failedImages} görsel aktarılamadı.` : '';
      setNotice({
        tone: r.failedImages || r.warnings ? 'warn' : 'ok',
        text: `${parts.join(' · ')}.${extra} Hizalama ve sayfa düzeni gibi bazı biçimler aktarılmaz; yayımlamadan önce metni gözden geçirin.`,
      });
    } catch (error) {
      setNotice({ tone: 'warn', text: error instanceof Error ? error.message : 'Word dosyası okunamadı.' });
    } finally {
      setBusy(null);
      if (docxInput.current) docxInput.current.value = '';
    }
  }

  return (
    <div
      className={fullscreen
        ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper'
        : `overflow-visible rounded-lg border bg-paper-raised ${invalid ? 'border-danger' : 'border-line-strong'} focus-within:border-bronze focus-within:ring-2 focus-within:ring-bronze/25`}
      data-fullscreen={fullscreen || undefined}
    >
      <Toolbar
        editor={editor}
        panel={panel}
        setPanel={setPanel}
        busy={busy}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        onImportWord={() => docxInput.current?.click()}
        onPickImage={() => imageInput.current?.click()}
      />
      <input ref={docxInput} type="file" hidden accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => void importDocx(e.target.files?.[0])} data-testid="docx-input" />
      <input ref={imageInput} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => { if (editor && e.target.files) void insertImages(editor, Array.from(e.target.files)); e.target.value = ''; }} data-testid="image-input" />

      <div className={fullscreen ? 'flex-1 overflow-y-auto' : ''}>
        <div className={fullscreen ? 'mx-auto max-w-3xl py-6' : ''}>
          {(busy || notice) && (
            <div className="px-4 pt-3">
              {busy && <p className="notice text-sm" role="status">{busy}</p>}
              {notice && !busy && (
                <p className={`${notice.tone === 'ok' ? 'notice-ok' : 'notice-warn'} flex items-start justify-between gap-3 text-sm`} role="status">
                  <span>{notice.text}</span>
                  <button type="button" className="shrink-0 text-xs underline" onClick={() => setNotice(null)}>Kapat</button>
                </p>
              )}
            </div>
          )}
          <EditorContent editor={editor} className="tiptap-content" />
          <FootnoteList editor={editor} onEdit={(pos) => {
            if (!editor) return;
            editor.chain().focus().setNodeSelection(pos).run();
            setPanel('footnote');
          }} />
        </div>
      </div>
      <StatusBar editor={editor} />
    </div>
  );
}

/* ------------------------------------------------------------------ araç çubuğu */

function Toolbar({ editor, panel, setPanel, busy, fullscreen, onToggleFullscreen, onImportWord, onPickImage }: {
  editor: Editor | null; panel: Panel; setPanel: (p: Panel) => void; busy: string | null; fullscreen: boolean;
  onToggleFullscreen: () => void; onImportWord: () => void; onPickImage: () => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const sel = e.state.selection;
      const selectedNode = sel instanceof NodeSelection ? sel.node.type.name : null;
      return {
        block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p',
        bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
        sup: e.isActive('superscript'), sub: e.isActive('subscript'), highlight: e.isActive('highlight'),
        center: e.isActive({ textAlign: 'center' }),
        right: e.isActive({ textAlign: 'right' }), justify: e.isActive({ textAlign: 'justify' }),
        left: !e.isActive({ textAlign: 'center' }) && !e.isActive({ textAlign: 'right' }) && !e.isActive({ textAlign: 'justify' }),
        bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), listItem: e.isActive('listItem'),
        canSink: e.can().sinkListItem('listItem'), canLift: e.can().liftListItem('listItem'),
        quote: e.isActive('blockquote'), callout: e.isActive('callout'), calloutVariant: e.getAttributes('callout').variant as string | undefined,
        link: e.isActive('link'), table: e.isActive('table'),
        canMerge: e.can().mergeCells(), canSplit: e.can().splitCell(),
        figure: selectedNode === 'figure', footnote: selectedNode === 'footnote',
        canUndo: e.can().undo(), canRedo: e.can().redo(),
      };
    },
  });

  if (!editor || !s) return <div className="h-12 border-b border-line bg-paper" aria-hidden />;
  const chain = () => editor.chain().focus();

  return (
    <div className={`${fullscreen ? '' : 'sticky top-0 rounded-t-lg'} z-20 border-b border-line bg-paper`}>
      <div role="toolbar" aria-label="Metin biçimlendirme" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <Btn label="Geri al (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>{Icons.undo}</Btn>
        <Btn label="Yinele (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>{Icons.redo}</Btn>
        <Sep />
        <label className="sr-only" htmlFor="editor-blok">Paragraf stili</label>
        <select
          id="editor-blok"
          value={s.block}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') chain().setParagraph().run();
            else chain().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
          }}
          className="h-8 rounded-md border border-line bg-paper-raised px-2 text-sm text-ink focus:border-bronze focus:outline-none"
          title="Paragraf stili"
        >
          <option value="p">Normal metin</option>
          <option value="h2">Başlık 1</option>
          <option value="h3">Başlık 2</option>
          <option value="h4">Başlık 3</option>
        </select>
        <Sep />
        <Btn label="Kalın (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>{Icons.bold}</Btn>
        <Btn label="İtalik (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>{Icons.italic}</Btn>
        <Btn label="Altı çizili (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>{Icons.underline}</Btn>
        <Btn label="Üstü çizili (Ctrl+Shift+S)" active={s.strike} onClick={() => chain().toggleStrike().run()}>{Icons.strike}</Btn>
        <Btn label="Üst simge (Ctrl+.)" active={s.sup} onClick={() => chain().toggleSuperscript().run()}>{Icons.sup}</Btn>
        <Btn label="Alt simge (Ctrl+,)" active={s.sub} onClick={() => chain().toggleSubscript().run()}>{Icons.sub}</Btn>
        <Btn label="Vurgula (Ctrl+Shift+H)" active={s.highlight} onClick={() => chain().toggleHighlight().run()}>{Icons.highlight}</Btn>
        <Btn label="Biçimlendirmeyi temizle" onClick={() => chain().unsetAllMarks().unsetTextAlign().run()}>{Icons.clear}</Btn>
        <Sep />
        <Btn label="Sola yasla (Ctrl+Shift+L)" active={s.left} onClick={() => chain().unsetTextAlign().run()}>{Icons.alignLeft}</Btn>
        <Btn label="Ortala (Ctrl+Shift+E)" active={s.center} onClick={() => chain().setTextAlign('center').run()}>{Icons.alignCenter}</Btn>
        <Btn label="Sağa yasla (Ctrl+Shift+R)" active={s.right} onClick={() => chain().setTextAlign('right').run()}>{Icons.alignRight}</Btn>
        <Btn label="İki yana yasla (Ctrl+Shift+J)" active={s.justify} onClick={() => chain().setTextAlign('justify').run()}>{Icons.alignJustify}</Btn>
        <Sep />
        <Btn label="Madde işaretli liste" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>{Icons.bullet}</Btn>
        <Btn label="Numaralı liste" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>{Icons.ordered}</Btn>
        <Btn label="Girintiyi artır (Tab)" disabled={!s.canSink} onClick={() => chain().sinkListItem('listItem').run()}>{Icons.indent}</Btn>
        <Btn label="Girintiyi azalt (Shift+Tab)" disabled={!s.canLift} onClick={() => chain().liftListItem('listItem').run()}>{Icons.outdent}</Btn>
        <Sep />
        <Btn label="Alıntı (Ctrl+Shift+B)" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>{Icons.quote}</Btn>
        <Menu label="Not kutusu" active={s.callout} icon={Icons.callout}>
          {(close) => (
            <div className="w-56 p-1">
              <MenuItem active={s.callout && s.calloutVariant === 'not'} onClick={() => { chain().toggleCallout('not').run(); close(); }}>
                <span className="font-medium">Not</span><span className="block text-xs text-muted">Bilgi notu, açıklama</span>
              </MenuItem>
              <MenuItem active={s.callout && s.calloutVariant === 'onemli'} onClick={() => { chain().toggleCallout('onemli').run(); close(); }}>
                <span className="font-medium text-bronze">Önemli</span><span className="block text-xs text-muted">Uyarı, dikkat çekilecek husus</span>
              </MenuItem>
              {s.callout && <MenuItem onClick={() => { chain().lift('callout').run(); close(); }}>Kutuyu kaldır</MenuItem>}
            </div>
          )}
        </Menu>
        <Btn label="Ayırıcı çizgi" onClick={() => chain().setHorizontalRule().run()}>{Icons.hr}</Btn>
        <Sep />
        <Btn label="Bağlantı (Ctrl+K)" active={s.link || panel === 'link'} onClick={() => setPanel(panel === 'link' ? null : 'link')}>{Icons.link}</Btn>
        <Btn label="Dipnot ekle (Ctrl+Alt+D)" active={panel === 'footnote'} onClick={() => setPanel(panel === 'footnote' ? null : 'footnote')}>{Icons.footnote}</Btn>
        <Btn label="Görsel ekle" disabled={!!busy} onClick={onPickImage}>{Icons.image}</Btn>
        <Menu label="Tablo ekle" active={s.table} icon={Icons.table}>
          {(close) => <TableGrid onPick={(rows, cols) => { chain().insertTable({ rows, cols, withHeaderRow: true }).run(); close(); }} />}
        </Menu>
        <Menu label="Özel karakter" icon={Icons.special}>
          {(close) => (
            <div className="grid w-max grid-cols-[repeat(8,2rem)] gap-0.5 p-2">
              {SPECIAL_CHARS.map(([ch, name]) => (
                <button key={ch} type="button" title={name} aria-label={name} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { chain().insertContent(ch).run(); close(); }}
                  className="flex h-8 items-center justify-center rounded font-serif text-lg text-ink hover:bg-line/60 hover:text-navy">
                  {ch}
                </button>
              ))}
            </div>
          )}
        </Menu>
        <Sep />
        <Btn label="Bul ve değiştir (Ctrl+F)" active={panel === 'find'} onClick={() => setPanel(panel === 'find' ? null : 'find')}>{Icons.search}</Btn>
        <Btn label={fullscreen ? 'Tam ekrandan çık (Esc)' : 'Tam ekran yazım'} active={fullscreen} onClick={onToggleFullscreen}>{fullscreen ? Icons.shrink : Icons.expand}</Btn>
        <Btn label="Klavye kısayolları" active={panel === 'help'} onClick={() => setPanel(panel === 'help' ? null : 'help')}>{Icons.help}</Btn>
        <span className="flex-1" />
        <button type="button" onClick={onImportWord} disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-bronze hover:text-bronze disabled:opacity-60">
          {Icons.word}<span>Word içe aktar</span>
        </button>
      </div>

      {s.table && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-line px-2 py-1.5 text-xs" role="toolbar" aria-label="Tablo">
          <span className="mr-1 font-medium text-muted">Tablo</span>
          <TextBtn onClick={() => chain().addRowBefore().run()}>+ Satır üste</TextBtn>
          <TextBtn onClick={() => chain().addRowAfter().run()}>+ Satır alta</TextBtn>
          <TextBtn onClick={() => chain().addColumnBefore().run()}>+ Sütun sola</TextBtn>
          <TextBtn onClick={() => chain().addColumnAfter().run()}>+ Sütun sağa</TextBtn>
          <Sep />
          <TextBtn onClick={() => chain().deleteRow().run()}>Satırı sil</TextBtn>
          <TextBtn onClick={() => chain().deleteColumn().run()}>Sütunu sil</TextBtn>
          <Sep />
          <TextBtn disabled={!s.canMerge} onClick={() => chain().mergeCells().run()}>Hücreleri birleştir</TextBtn>
          <TextBtn disabled={!s.canSplit} onClick={() => chain().splitCell().run()}>Hücreyi böl</TextBtn>
          <TextBtn onClick={() => chain().toggleHeaderRow().run()}>Başlık satırı</TextBtn>
          <TextBtn onClick={() => chain().toggleHeaderColumn().run()}>Başlık sütunu</TextBtn>
          <Sep />
          <TextBtn danger onClick={() => chain().deleteTable().run()}>Tabloyu sil</TextBtn>
        </div>
      )}

      {s.figure && <FigurePanel editor={editor} />}
      {panel === 'link' && <LinkPanel editor={editor} onClose={() => setPanel(null)} />}
      {panel === 'footnote' && <FootnotePanel editor={editor} editing={s.footnote} onClose={() => setPanel(null)} />}
      {panel === 'find' && <FindPanel editor={editor} onClose={() => setPanel(null)} />}
      {panel === 'help' && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Klavye kısayolları</p>
            <button type="button" className="text-xs text-muted underline" onClick={() => setPanel(null)}>Kapat</button>
          </div>
          <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {SHORTCUTS.map(([a, b]) => (
              <div key={a} className="flex justify-between gap-4 border-b border-line/60 py-1">
                <dt className="text-ink-soft">{a}</dt><dd className="shrink-0 font-mono text-xs text-muted">{b}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">Mac&apos;te Ctrl yerine ⌘ tuşunu kullanın. Görselleri editöre sürükleyip bırakabilir ya da yapıştırabilirsiniz.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ paneller */

function PanelRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function LinkPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [value, setValue] = useState(() => (editor.getAttributes('link').href as string) ?? '');
  const apply = () => {
    const href = value.trim();
    const c = editor.chain().focus().extendMarkRange('link');
    if (!href) c.unsetLink().run();
    else c.setLink({ href: /^(https?:|mailto:)/i.test(href) ? href : href.includes('@') && !href.includes('/') ? `mailto:${href}` : `https://${href}` }).run();
    onClose();
  };
  return (
    <PanelRow label="Bağlantı">
      <label htmlFor="link-url" className="text-xs text-muted">Bağlantı adresi</label>
      <input id="link-url" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } if (e.key === 'Escape') onClose(); }}
        className="field-input !w-auto min-w-48 flex-1 !py-1.5 text-sm" />
      <button type="button" className="btn !px-3 !py-1.5" onClick={apply}>Uygula</button>
      {editor.isActive('link') && <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); }}>Bağlantıyı kaldır</button>}
      <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={onClose}>Vazgeç</button>
    </PanelRow>
  );
}

function FootnotePanel({ editor, editing, onClose }: { editor: Editor; editing: boolean; onClose: () => void }) {
  const current = editing ? ((editor.state.selection as NodeSelection).node.attrs.text as string) : '';
  const [text, setText] = useState(current);
  const [lastKey, setLastKey] = useState(`${editing}:${current}`);
  if (lastKey !== `${editing}:${current}`) { setLastKey(`${editing}:${current}`); setText(current); }

  const save = () => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (editing) editor.chain().focus().updateAttributes('footnote', { text: t }).run();
    else editor.chain().focus().insertFootnote(t).run();
    onClose();
  };
  return (
    <div className="border-t border-line px-3 py-2.5" role="group" aria-label="Dipnot">
      <label htmlFor="dipnot-metni" className="mb-1 block text-xs text-muted">
        {editing ? 'Dipnotu düzenle' : 'Dipnot metni — imlecin bulunduğu yere numaralı dipnot eklenir; yayında yazının sonunda listelenir.'}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea id="dipnot-metni" autoFocus rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') onClose(); }}
          placeholder="Örn. Yargıtay 3. HD, 12.03.2024, 2023/1234 E., 2024/567 K."
          className="field-input flex-1 !py-1.5 text-sm" />
        <div className="flex gap-2">
          <button type="button" className="btn !px-3 !py-1.5" onClick={save} disabled={!text.trim()}>{editing ? 'Güncelle' : 'Ekle'}</button>
          {editing && <button type="button" className="btn-secondary !px-3 !py-1.5 text-danger" onClick={() => { editor.chain().focus().deleteSelection().run(); onClose(); }}>Sil</button>}
          <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={onClose}>Vazgeç</button>
        </div>
      </div>
    </div>
  );
}

function FigurePanel({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes('figure') as { src: string; alt: string; caption: string; size: FigureSize };
  const update = (patch: Partial<typeof attrs>) => editor.chain().updateAttributes('figure', patch).run();
  return (
    <PanelRow label="Görsel">
      <span className="text-xs font-medium text-muted">Görsel</span>
      <input aria-label="Altyazı" placeholder="Altyazı (isteğe bağlı)" defaultValue={attrs.caption} key={`c-${attrs.src}`}
        onBlur={(e) => update({ caption: e.target.value.trim() })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
        className="field-input !w-auto min-w-40 flex-1 !py-1.5 text-sm" />
      <input aria-label="Alternatif metin" placeholder="Alternatif metin (görme engelliler için)" defaultValue={attrs.alt} key={`a-${attrs.src}`}
        onBlur={(e) => update({ alt: e.target.value.trim() })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
        className="field-input !w-auto min-w-40 flex-1 !py-1.5 text-sm" />
      <div className="flex overflow-hidden rounded-md border border-line-strong text-xs" role="group" aria-label="Boyut">
        {([['kucuk', 'Küçük'], ['orta', 'Orta'], ['tam', 'Tam']] as const).map(([v, l]) => (
          <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => update({ size: v })} aria-pressed={attrs.size === v}
            className={`px-2.5 py-1.5 ${attrs.size === v ? 'bg-navy text-paper' : 'text-ink-soft hover:bg-line/60'}`}>{l}</button>
        ))}
      </div>
      <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-danger hover:bg-line/60" onClick={() => editor.chain().focus().deleteSelection().run()}>
        {Icons.trash} Sil
      </button>
    </PanelRow>
  );
}

function FindPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [replace, setReplace] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    editor.on('update', bump);
    return () => { editor.off('update', bump); };
  }, [editor]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo<Match[]>(() => findMatches(editor.state.doc, query, caseSensitive), [editor, query, caseSensitive, version]);
  const current = matches.length ? Math.min(index, matches.length - 1) : -1;

  const select = (i: number) => {
    const m = matches[i];
    if (!m) return;
    setIndex(i);
    const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, m.from, m.to)).scrollIntoView();
    editor.view.dispatch(tr);
  };
  const step = (dir: 1 | -1) => matches.length && select((current + dir + matches.length) % matches.length);
  const replaceOne = () => {
    const m = matches[current];
    if (!m) return;
    editor.chain().focus().insertContentAt({ from: m.from, to: m.to }, replace).run();
  };
  const replaceAll = () => {
    if (!matches.length) return;
    const tr = editor.state.tr;
    for (const m of [...matches].reverse()) {
      if (replace) tr.insertText(replace, m.from, m.to);
      else tr.delete(m.from, m.to);
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm" role="search" aria-label="Bul ve değiştir">
      <input aria-label="Aranacak metin" autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} placeholder="Bul"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') onClose(); }}
        className="field-input !w-auto min-w-36 flex-1 !py-1.5 text-sm" />
      <span className="min-w-16 text-xs tabular-nums text-muted" aria-live="polite">{query ? (matches.length ? `${current + 1} / ${matches.length}` : 'Sonuç yok') : ''}</span>
      <TextBtn disabled={!matches.length} onClick={() => step(-1)}>↑ Önceki</TextBtn>
      <TextBtn disabled={!matches.length} onClick={() => step(1)}>↓ Sonraki</TextBtn>
      <input aria-label="Yerine konacak metin" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Değiştir"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="field-input !w-auto min-w-36 flex-1 !py-1.5 text-sm" />
      <TextBtn disabled={!matches.length} onClick={replaceOne}>Değiştir</TextBtn>
      <TextBtn disabled={!matches.length} onClick={replaceAll}>Tümünü değiştir</TextBtn>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} /> Büyük/küçük harf
      </label>
      <button type="button" className="text-xs text-muted underline" onClick={onClose}>Kapat</button>
    </div>
  );
}

/* ------------------------------------------------------------------ dipnot listesi ve durum çubuğu */

function FootnoteList({ editor, onEdit }: { editor: Editor | null; onEdit: (pos: number) => void }) {
  const notes = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const out: Array<{ pos: number; text: string }> = [];
      e?.state.doc.descendants((node, pos) => {
        if (node.type.name === 'footnote') out.push({ pos, text: node.attrs.text as string });
      });
      return out;
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  if (!notes?.length) return null;
  return (
    <div className="mx-5 mb-4 border-t border-line pt-3 font-sans text-sm">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-bronze">Dipnotlar</p>
      <ol className="list-decimal space-y-1 pl-6 text-ink-soft">
        {notes.map((n, i) => (
          <li key={`${n.pos}-${i}`}>
            <button type="button" className="text-left hover:text-navy hover:underline" onClick={() => onEdit(n.pos)} title="Düzenlemek için tıklayın">
              {n.text}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatusBar({ editor }: { editor: Editor | null }) {
  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const storage = e.storage.characterCount as { words: () => number; characters: () => number };
      let footnotes = 0, images = 0, tables = 0;
      e.state.doc.descendants((n) => {
        if (n.type.name === 'footnote') footnotes++;
        else if (n.type.name === 'figure') images++;
        else if (n.type.name === 'table') tables++;
      });
      return { words: storage.words(), chars: storage.characters(), footnotes, images, tables };
    },
  });
  if (!stats) return null;
  const fmt = (n: number) => n.toLocaleString('tr-TR');
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-b-lg border-t border-line bg-paper px-4 py-1.5 text-xs text-muted" aria-live="off">
      <span>{fmt(stats.words)} kelime</span>
      <span>{fmt(stats.chars)} karakter</span>
      <span>~{Math.max(1, Math.round(stats.words / 200))} dk okuma</span>
      {stats.footnotes > 0 && <span>{stats.footnotes} dipnot</span>}
      {stats.images > 0 && <span>{stats.images} görsel</span>}
      {stats.tables > 0 && <span>{stats.tables} tablo</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ küçük bileşenler */

function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  const N = 8;
  return (
    <div className="p-2.5">
      <div className="grid grid-cols-[repeat(8,1.25rem)] gap-1" onMouseLeave={() => setHover([0, 0])}>
        {Array.from({ length: N * N }, (_, i) => {
          const r = Math.floor(i / N) + 1, c = (i % N) + 1;
          const on = r <= hover[0] && c <= hover[1];
          return (
            <button key={i} type="button" aria-label={`${r} satır × ${c} sütun`} onMouseEnter={() => setHover([r, c])} onFocus={() => setHover([r, c])}
              onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(r, c)}
              className={`h-5 w-5 rounded-sm border ${on ? 'border-bronze bg-bronze/25' : 'border-line-strong bg-paper-raised'}`} />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted">{hover[0] ? `${hover[0]} × ${hover[1]} tablo (ilk satır başlık)` : 'Boyut seçin'}</p>
    </div>
  );
}

function Menu({ label, icon, active, children }: { label: string; icon: React.ReactNode; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" title={label} aria-label={label} aria-haspopup="true" aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center rounded-md px-1.5 transition ${active ? 'bg-navy text-paper' : 'text-ink-soft hover:bg-line/60 hover:text-navy'}`}>
        {icon}<span className="-ml-0.5 scale-75 opacity-60">{Icons.chevron}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-line bg-paper-raised shadow-lg" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-line/60 ${active ? 'bg-line/50' : ''}`}>
      {children}
    </button>
  );
}

function Btn({ children, label, active, disabled, onClick }: {
  children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active ?? undefined} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 transition disabled:opacity-30 ${
        active ? 'bg-navy text-paper' : 'text-ink-soft hover:bg-line/60 hover:text-navy'
      }`}>
      {children}
    </button>
  );
}

function TextBtn({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs transition disabled:opacity-35 ${danger ? 'text-danger hover:bg-line/60' : 'text-ink-soft hover:bg-line/60 hover:text-navy'}`}>
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-line" aria-hidden />;
}
