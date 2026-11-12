/** Araç çubuğu simgeleri (24x24, çizgi). */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Svg({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden {...P}>{children}</svg>;
}

export const Icons = {
  undo: <Svg><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>,
  redo: <Svg><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>,
  bold: <Svg><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" strokeWidth={2.2} /></Svg>,
  italic: <Svg><path d="M14 5h-4M14 19h-4M14.5 5l-5 14" /></Svg>,
  underline: <Svg><path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" /></Svg>,
  strike: <Svg><path d="M4 12h16M16.5 7.5C16 5.6 14.2 4.5 12 4.5c-2.6 0-4.5 1.4-4.5 3.4 0 1.5 1 2.4 2.6 3.1M7.5 16.2c.5 2 2.4 3.3 4.8 3.3 2.7 0 4.6-1.4 4.6-3.6 0-.8-.2-1.4-.6-1.9" /></Svg>,
  sup: <Svg><path d="m4 7 8 10M12 7l-8 10M16 4.5a1.8 1.8 0 0 1 3.4.8c0 1.6-3.4 2.4-3.4 4.2h3.6" /></Svg>,
  sub: <Svg><path d="m4 5 8 10M12 5 4 15M16 14.5a1.8 1.8 0 0 1 3.4.8c0 1.6-3.4 2.4-3.4 4.2h3.6" /></Svg>,
  highlight: <Svg><path d="m9 11-5 5v3h3l5-5M9 11l4.5-4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L13 15M9 11l4 4" /><path d="M14 21h7" strokeWidth={3} className="text-bronze" stroke="currentColor" /></Svg>,
  clear: <Svg><path d="M6 5h12M10 5 7.5 19M14 5l-1 5M4 20 20 4" /></Svg>,
  alignLeft: <Svg><path d="M4 6h16M4 10h10M4 14h16M4 18h10" /></Svg>,
  alignCenter: <Svg><path d="M4 6h16M7 10h10M4 14h16M7 18h10" /></Svg>,
  alignRight: <Svg><path d="M4 6h16M10 10h10M4 14h16M10 18h10" /></Svg>,
  alignJustify: <Svg><path d="M4 6h16M4 10h16M4 14h16M4 18h16" /></Svg>,
  bullet: <Svg><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></Svg>,
  ordered: <Svg><path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4.2 14.2a1.4 1.4 0 0 1 2.6.6c0 1.2-2.8 1.8-2.8 3.2h3" /></Svg>,
  indent: <Svg><path d="M11 6h9M11 12h9M11 18h9M4 8.5 7 12l-3 3.5" /></Svg>,
  outdent: <Svg><path d="M11 6h9M11 12h9M11 18h9M7 8.5 4 12l3 3.5" /></Svg>,
  quote: <Svg><path d="M7 7c-1.7 1-3 2.8-3 5v5h5v-5H6M17 7c-1.7 1-3 2.8-3 5v5h5v-5h-3" /></Svg>,
  callout: <Svg><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M8 9.5h8M8 13.5h5" /></Svg>,
  hr: <Svg><path d="M4 12h16" /><path d="M8 7h8M8 17h8" strokeOpacity={0.35} /></Svg>,
  link: <Svg><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>,
  footnote: <Svg><path d="M4 6h9M4 10.5h9M4 19.5h7" /><path d="M4 15.5h16" strokeOpacity={0.4} strokeDasharray="2 2" /><path d="M17 4h1.6v6M16.4 10h3.2" /></Svg>,
  image: <Svg><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5.5-5 4 3.5 2.5-2 4 3.5" /></Svg>,
  table: <Svg><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10" /></Svg>,
  special: <Svg><path d="M7 19h3v-2.5A6.5 6.5 0 1 1 14 16.5V19h3" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></Svg>,
  expand: <Svg><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>,
  shrink: <Svg><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></Svg>,
  help: <Svg><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17h.01" /></Svg>,
  word: <Svg><path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z" /><path d="M14 3.5V9h5.5M8 12.5l1.3 5 1.7-4 1.7 4 1.3-5" /></Svg>,
  trash: <Svg><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5" /></Svg>,
  chevron: <Svg><path d="m7 10 5 5 5-5" /></Svg>,
};
