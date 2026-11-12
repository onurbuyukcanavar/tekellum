'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { url: string; title: string; text?: string; heading?: string; className?: string };

/** Paylaşım bağlantıları: her biri ilgili sitenin paylaşım ekranını yeni sekmede açar. */
export function shareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const both = encodeURIComponent(`${title}\n${url}`);
  return {
    whatsapp: `https://wa.me/?text=${both}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    email: `mailto:?subject=${t}&body=${both}`,
  };
}

const btn =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-bronze hover:text-bronze focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze';

export function ShareButtons({ url, title, text, heading = 'Paylaş', className = '' }: Props) {
  const links = shareLinks(url, title);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flash(message: string) {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 4000);
  }

  async function copy(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Pano API'si olmayan ya da izin vermeyen tarayıcılar için eski yöntem.
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let done = false;
      try {
        done = document.execCommand('copy');
      } catch {
        done = false;
      }
      area.remove();
      return done;
    }
  }

  async function copyLink() {
    flash((await copy()) ? 'Bağlantı kopyalandı.' : 'Kopyalanamadı; adres çubuğundan kopyalayabilirsiniz.');
  }

  // Instagram'ın web üzerinden bağlantı paylaşma özelliği yoktur. Telefonda sistemin paylaşım
  // menüsü açılır (Instagram oradan seçilebilir); bilgisayarda bağlantı kopyalanıp Instagram açılır.
  async function instagram() {
    const mobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text || title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    const ok = await copy();
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    flash(ok ? 'Bağlantı kopyalandı; Instagram’da hikâyenize ya da mesajınıza yapıştırabilirsiniz.' : 'Instagram açıldı; bağlantıyı adres çubuğundan kopyalayabilirsiniz.');
  }

  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

  return (
    <div className={`not-prose ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-bronze">{heading}</span>
        <a className={btn} href={links.whatsapp} {...ext} aria-label="WhatsApp ile paylaş" title="WhatsApp">
          <WhatsAppIcon />
        </a>
        <a className={btn} href={links.linkedin} {...ext} aria-label="LinkedIn’de paylaş" title="LinkedIn">
          <LinkedInIcon />
        </a>
        <a className={btn} href={links.x} {...ext} aria-label="X’te (Twitter) paylaş" title="X (Twitter)">
          <XIcon />
        </a>
        <button type="button" className={btn} onClick={instagram} aria-label="Instagram’da paylaş" title="Instagram">
          <InstagramIcon />
        </button>
        <a className={btn} href={links.facebook} {...ext} aria-label="Facebook’ta paylaş" title="Facebook">
          <FacebookIcon />
        </a>
        <a className={btn} href={links.telegram} {...ext} aria-label="Telegram ile paylaş" title="Telegram">
          <TelegramIcon />
        </a>
        <a className={btn} href={links.email} aria-label="E-posta ile gönder" title="E-posta">
          <MailIcon />
        </a>
        <button type="button" className={btn} onClick={copyLink} aria-label="Bağlantıyı kopyala" title="Bağlantıyı kopyala">
          <LinkIcon />
        </button>
      </div>
      <p className="mt-2 min-h-5 text-sm text-muted" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true } as const;

function WhatsAppIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.2-1.6-2.6-2.6l.9-1-1-2z" fill="currentColor" strokeWidth={1} />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg {...svg} fill="currentColor">
      <rect x="3" y="9" width="3.6" height="12" rx=".4" />
      <circle cx="4.8" cy="5.2" r="2.1" />
      <path d="M9.4 9h3.4v1.7c.6-1.1 1.9-2 3.8-2 3.3 0 4.4 2 4.4 5.3V21h-3.6v-6.2c0-1.6-.4-2.8-2-2.8s-2.4 1.2-2.4 2.8V21H9.4z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <path d="M4 4l16 16M20 4l-6.6 6.9M10.4 13.4L4 20" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg {...svg} fill="currentColor">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M21 4L3 11l6 2.2L18 7l-7 7.5L17.5 20z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6l8.5 7 8.5-7" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </svg>
  );
}
