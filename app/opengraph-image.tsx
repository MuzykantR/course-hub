import { ImageResponse } from 'next/og';

// One site-wide link preview. The site is closed, so per-page previews would either leak
// content to crawlers or show the login page — a branded card is the honest option.
export const alt = 'Python HSE Hub — занятия, задачи, решения и доклады курса по Python';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLE = 'Python HSE Hub';
const SUBTITLE = 'Занятия, задачи, решения и доклады курса';
const BADGE = 'py';

/** Inter Bold subset with exactly the glyphs we draw (Cyrillic included). */
async function loadFont(): Promise<ArrayBuffer> {
  const text = encodeURIComponent(TITLE + SUBTITLE + BADGE);
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@700&text=${text}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  }).then((r) => r.text());
  const url = /src: url\((.+?)\) format/.exec(css)?.[1];
  if (!url) throw new Error('font url not found');
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: '#FAFAFB',
        backgroundImage:
          'linear-gradient(to right, rgba(25,26,35,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(25,26,35,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        fontFamily: 'Inter',
        color: '#191A23',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 120,
          height: 120,
          borderRadius: 28,
          border: '6px solid #191A23',
          background: '#B9FF66',
          boxShadow: '0 12px 0 #191A23',
          fontSize: 56,
        }}
      >
        {BADGE}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 96, letterSpacing: -3 }}>{TITLE}</div>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '14px 28px',
            borderRadius: 999,
            border: '5px solid #191A23',
            background: '#FFFFFF',
            boxShadow: '0 8px 0 #191A23',
            fontSize: 38,
          }}
        >
          {SUBTITLE}
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Inter', data: await loadFont(), weight: 700, style: 'normal' }] },
  );
}
