import React, { useState, useEffect } from 'react';
import { Icons, Chip } from './primitives.jsx';

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function AdminSidebar({ active, onNavigate, alertCount, isOpen, setOpen, user }) {
  const items = [
    { id: 'dashboard',  label: 'Dashboard',         icon: Icons.dashboard },
    { id: 'stations',   label: 'Stations',          icon: Icons.station },
    { id: 'live',       label: 'Live & cache',      icon: Icons.live },
    { id: 'measures',   label: 'Mesures',           icon: Icons.measure },
    { id: 'history',    label: 'Historique',        icon: Icons.history },
  ];
  const items2 = [
    { id: 'alerts',     label: 'Alertes',           icon: Icons.alerts,  badge: alertCount || null, tone: 'danger' },
    { id: 'mappings',   label: 'Mappings capteurs', icon: Icons.mapping },
  ];

  if (user?.role === 'admin') {
    items2.push({ id: 'users', label: 'Utilisateurs', icon: Icons.user });
  }
  const Item = ({ it }) => (
    <div className="nav-item" data-active={active === it.id} onClick={() => onNavigate(it.id)}>
      {it.icon}
      <span>{it.label}</span>
      {it.badge != null ? <span className="badge" data-tone={it.tone}>{it.badge}</span> : null}
    </div>
  );
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">A</div>
          <div className="brand-name">Admin · Réseau</div>
          <button className="mobile-close" onClick={() => setOpen(false)}>{Icons.close}</button>
        </div>
        <nav className="nav">
          <div className="nav-section-label">Observation</div>
          {items.map(it => <Item key={it.id} it={it} />)}
          <div className="nav-section-label">Opérations</div>
          {items2.map(it => <Item key={it.id} it={it} />)}
        </nav>
      </aside>
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
export function AdminTopbar({ crumbs, onBack, theme, onToggleTheme, onMenuClick, onLogout }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMenuClick}>{Icons.menu}</button>
      
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <span className="sep">/</span> : null}
            <span className={i === crumbs.length - 1 ? 'here' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      
      <div className="topbar-actions" style={{ marginLeft: 'auto' }}>
        <span className="live-pill hidden-xs"><span className="pulse" />ADMIN</span>
        
        <button className="icon-btn" onClick={onToggleTheme} title="Changer le thème">
          {theme === 'dark' ? Icons.sun : Icons.moon}
        </button>

        <button className="icon-btn" onClick={onLogout} title="Déconnexion">
          ❌
        </button>

        <button className="btn btn-ghost" onClick={onBack} style={{ gap: 6 }}>
          {Icons.back} <span className="hidden-xs">Retour au site</span>
        </button>
      </div>
    </header>
  );
}

// ── Alerts list ───────────────────────────────────────────────────────────────
export function AlertsList({ items = [], compact = false, onResolve, onDelete }) {
  if (!items.length) return <div style={{ padding: 20, color: 'var(--text-2)', textAlign: 'center' }}>Aucune alerte</div>;
  const levelOf = (a) => a.resolvedAt ? 'info' : (a.metric === 'offline' ? 'danger' : 'warn');
  return (
    <div>
      {items.map(a => (
        <div key={a.id} className="alert-row">
          <span className="alert-bar" data-tone={levelOf(a)} />
          <div>
            <div className="alert-title">
              {a.metric}
              <Chip tone={a.resolvedAt ? 'neutral' : levelOf(a)} dot={false}>
                {a.resolvedAt ? 'RÉSOLUE' : 'ACTIVE'}
              </Chip>
              {!compact && <Chip tone="neutral" dot={false} mono>#{a.id}</Chip>}
            </div>
            <div className="alert-meta">
              <span>{a.siteName}</span>
              <span>·</span>
              <span>{a.message}</span>
              {!compact && (
                <>
                  <span>·</span>
                  <span className="mono">valeur: {a.value ?? '—'}</span>
                  <span>·</span>
                  <span className="mono">seuil: {a.threshold ?? '—'}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString('fr') : '—'}
            </span>
            {!a.resolvedAt && onResolve && (
              <button className="btn btn-ghost" style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
                onClick={() => onResolve(a.id)}>
                {Icons.check} Résoudre
              </button>
            )}
            {onDelete && (
              <button className="icon-btn" style={{ width: 26, height: 26 }}
                onClick={() => onDelete(a.id)}>
                {Icons.trash}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chart (pro SVG version with curves & gradients) ──────────────────────────
export function Chart({ series = [], label, color = '#6366f1', bars = false }) {
  const W = 880, H = 220;
  const PAD_X = 40, PAD_T = 30, PAD_B = 30;
  
  if (!series.length) return null;
  
  const vals = series.map(p => (typeof p === 'object' ? Object.values(p).find(v => typeof v === 'number') ?? 0 : p));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = (max - min) || 1;
  const count = vals.length;
  const step = (W - PAD_X * 2) / Math.max(count - 1, 1);
  
  const yOf = v => H - PAD_B - ((v - min) / range) * (H - PAD_T - PAD_B);
  const pts = vals.map((v, i) => [PAD_X + i * step, yOf(v)]);

  // Smooth Bezier path helper
  const getCurve = (pts) => {
    if (pts.length < 2) return '';
    const d = pts.map((p, i) => {
      if (i === 0) return `M ${p[0]},${p[1]}`;
      const prev = pts[i - 1];
      const cp1x = prev[0] + (p[0] - prev[0]) / 2;
      const cp2x = prev[0] + (p[0] - prev[0]) / 2;
      return `C ${cp1x},${prev[1]} ${cp2x},${p[1]} ${p[0]},${p[1]}`;
    });
    return d.join(' ');
  };

  const linePath = getCurve(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${H - PAD_B} L ${pts[0][0]},${H - PAD_B} Z`;
  const gradId = `grad-${label?.replace(/\s/g, '') || Math.random().toString(36).substr(2, 5)}`;

  return (
    <div className="chart-container">
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = H - PAD_B - p * (H - PAD_T - PAD_B);
          return (
            <React.Fragment key={i}>
              <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="var(--line-strong)" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={PAD_X - 10} y={y + 3} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">
                {(min + p * range).toFixed(1)}
              </text>
            </React.Fragment>
          );
        })}

        {bars ? (
          pts.map((p, i) => (
            <rect key={i} x={p[0] - step / 3} y={p[1]} width={Math.max(step / 1.6, 2)} height={H - PAD_B - p[1]}
                  fill={color} opacity="0.8" rx="2" />
          ))
        ) : (
          <>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Glow effect */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.1" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
