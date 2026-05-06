import React from 'react';

// ── Icon base ────────────────────────────────────────────────────────────────
export const Icon = ({ d, size = 16, fill = 'none', stroke = 'currentColor', sw = 1.6, className = 'icon' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

// ── Icon set ─────────────────────────────────────────────────────────────────
export const Icons = {
  dashboard: <Icon d={<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>} />,
  station:   <Icon d={<><path d="M12 21V11"/><circle cx="12" cy="7" r="3"/><path d="M5 21h14"/><path d="M8 21l1-4h6l1 4"/></>} />,
  alerts:    <Icon d={<><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
  measure:   <Icon d={<><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 5-6"/></>} />,
  map:       <Icon d={<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>} />,
  mapping:   <Icon d={<><path d="M4 7h12"/><path d="M16 7l-3-3"/><path d="M16 7l-3 3"/><path d="M20 17H8"/><path d="M8 17l3-3"/><path d="M8 17l3 3"/></>} />,
  history:   <Icon d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>} />,
  compare:   <Icon d={<><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></>} />,
  settings:  <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>} />,
  search:    <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  bell:      <Icon d={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>} />,
  plus:      <Icon d="M12 5v14M5 12h14" />,
  filter:    <Icon d={<><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></>} />,
  download:  <Icon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />,
  refresh:   <Icon d={<><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></>} />,
  more:      <Icon d={<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5"  cy="12" r="1"/></>} />,
  edit:      <Icon d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  trash:     <Icon d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></>} />,
  check:     <Icon d="M20 6L9 17l-5-5" />,
  close:     <Icon d="M18 6L6 18M6 6l12 12" />,
  thermo:    <Icon d={<><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></>} />,
  drop:      <Icon d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  wind:      <Icon d={<><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M17.73 2.27A2.5 2.5 0 1 1 19.5 6.5H2"/><path d="M14.83 16.83A2 2 0 1 0 16 20.5H2"/></>} />,
  gauge:     <Icon d={<><path d="M12 14L8 10"/><circle cx="12" cy="14" r="9"/><path d="M3 14h2"/><path d="M19 14h2"/><path d="M12 5V3"/></>} />,
  sun:       <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} />,
  moon:      <Icon d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />,
  battery:   <Icon d={<><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></>} />,
  chevron:   <Icon d="M9 18l6-6-6-6" />,
  back:      <Icon d="M15 18l-6-6 6-6" />,
  live:      <Icon d={<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>} />,
  menu:      <Icon d="M4 6h16M4 12h16M4 18h16" />,
  user:      <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
};

// ── Chip ─────────────────────────────────────────────────────────────────────
export const Chip = ({ tone = 'neutral', mono = false, dot = true, children }) => (
  <span className={'chip ' + (mono ? 'chip-mono' : '')} data-tone={tone}>
    {dot ? <span className="dot" /> : null}
    {children}
  </span>
);

// ── Sparkline ─────────────────────────────────────────────────────────────────
export const Spark = ({ values, color = 'currentColor', w = 120, h = 40, fill = true }) => {
  if (!values || !values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 8) - 4]);

  const getCurve = (pts) => {
    return pts.map((p, i) => {
      if (i === 0) return `M ${p[0]},${p[1]}`;
      const prev = pts[i - 1];
      const cp1x = prev[0] + (p[0] - prev[0]) / 2;
      return `C ${cp1x},${prev[1]} ${cp1x},${p[1]} ${p[0]},${p[1]}`;
    }).join(' ');
  };

  const linePath = getCurve(pts);
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;

  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {fill && <path d={areaPath} fill={color} opacity="0.12" />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Wind direction arrow ──────────────────────────────────────────────────────
export const WindArrow = ({ deg = 0 }) => {
  const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return <span className="wind-arrow">{arrows[idx]}</span>;
};

// ── Status dot ───────────────────────────────────────────────────────────────
export const StatusDot = ({ tone = 'ok' }) => <span className="status-dot" data-tone={tone} />;

// ── Format helpers ────────────────────────────────────────────────────────────
export const fmt = {
  temp:  (v) => v == null ? '—' : `${Number(v).toFixed(1)}°`,
  pct:   (v) => v == null ? '—' : `${Math.round(v)}%`,
  wind:  (v) => v == null ? '—' : `${Math.round(v)}`,
  press: (v) => v == null ? '—' : `${Math.round(v)}`,
  rain:  (v) => v == null ? '—' : `${Number(v).toFixed(1)}`,
  val:   (v, d = 1) => v == null ? '—' : Number(v).toFixed(d),
};
