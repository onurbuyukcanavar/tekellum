import { mergeAttributes, Node } from '@tiptap/core';

export type FigureSize = 'tam' | 'orta' | 'kucuk';
export type CalloutVariant = 'not' | 'onemli';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (text: string) => ReturnType;
    };
    figure: {
      insertFigure: (attrs: { src: string; alt?: string; caption?: string; width?: number; height?: number; size?: FigureSize }) => ReturnType;
    };
    callout: {
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
    };
  }
}

/**
 * Dipnot: metin içinde numaralı üst simge. Dipnot metni öznitelikte tutulur; yayında numaralanıp yazının sonunda listelenir.
 * HTML: <sup data-footnote="Dipnot metni"></sup>
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote') ?? '',
        renderHTML: (attrs) => ({ 'data-footnote': attrs.text }),
      },
    };
  },

  parseHTML() {
    // Üst simge işaretinden (sup) önce denenmeli; yoksa boş <sup> üst simge sanılıp atılır.
    return [{ tag: 'sup[data-footnote]', priority: 1000 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { class: 'footnote-ref', title: HTMLAttributes['data-footnote'] })];
  },

  renderText() {
    return '';
  },

  addCommands() {
    return {
      insertFootnote: (text) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { text } }),
    };
  },
});

/** Görsel + isteğe bağlı altyazı. HTML: <figure data-image data-size="orta"><img src alt width height><figcaption>…</figcaption></figure> */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      width: { default: null },
      height: { default: null },
      size: { default: 'tam' as FigureSize },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-image]',
        priority: 1000,
        getAttrs: (el) => {
          const img = el.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? '',
            width: Number(img.getAttribute('width')) || null,
            height: Number(img.getAttribute('height')) || null,
            caption: el.querySelector('figcaption')?.textContent?.trim() ?? '',
            size: (el.getAttribute('data-size') as FigureSize) || 'tam',
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (el) => ({
          src: el.getAttribute('src') ?? '',
          alt: el.getAttribute('alt') ?? '',
          width: Number(el.getAttribute('width')) || null,
          height: Number(el.getAttribute('height')) || null,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption, width, height, size } = node.attrs;
    const img = ['img', { src, alt, ...(width ? { width } : {}), ...(height ? { height } : {}), loading: 'lazy' }];
    return caption
      ? ['figure', { 'data-image': '', 'data-size': size }, img, ['figcaption', {}, caption]]
      : ['figure', { 'data-image': '', 'data-size': size }, img];
  },

  addCommands() {
    return {
      insertFigure: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }),
    };
  },
});

/** Not kutusu: metin içinde vurgulanan çerçeveli blok. HTML: <aside data-callout="not">…</aside> */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'not' as CalloutVariant,
        parseHTML: (el) => (el.getAttribute('data-callout') === 'onemli' ? 'onemli' : 'not'),
        renderHTML: (attrs) => ({ 'data-callout': attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout]', priority: 1000 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      toggleCallout: (variant = 'not') => ({ editor, commands }) => {
        if (editor.isActive(this.name)) {
          if (editor.isActive(this.name, { variant })) return commands.lift(this.name);
          return commands.updateAttributes(this.name, { variant });
        }
        return commands.wrapIn(this.name, { variant });
      },
    };
  },
});
