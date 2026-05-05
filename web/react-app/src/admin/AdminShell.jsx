import React, { useState, useEffect } from 'react';
import { Icons, Chip } from './primitives.jsx';

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function AdminSidebar({ active, onNavigate, alertCount }) {
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
  const Item = ({ it }) => (
    <div className="nav-item" data-active={active === it.id} onClick={() => onNavigate(it.id)}>
      {it.icon}
      <span>{it.label}</span>
      {it.badge != null ? <span className="badge" data-tone={it.tone}>{it.badge}</span> : null}
    </div>
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">A</div>
        <div className="brand-name">Admin · Réseau</div>
      </div>
      <nav className="nav">
        <div className="nav-section-label">Observation</div>
        {items.map(it => <Item key={it.id} it={it} />)}
        <div className="nav-section-label">Opérations</div>
        {items2.map(it => <Item key={it.id} it={it} />)}
      </nav>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
export function AdminTopbar({ crumbs, onBack }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <span className="sep">/</span> : null}
            <span className={i === crumbs.length - 1 ? 'here' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <span className="live-pill"><span className="pulse" />ADMIN</span>
      <div className="topbar-search">
        {Icons.search}
        <input placeholder="Rechercher…" />
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost" onClick={onBack} style={{ gap: 6 }}>
          {Icons.back} Retour au site
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

// ── Chart (line or bar) ───────────────────────────────────────────────────────
export function Chart({ series = [], label, color = '#38bdf8', bars = false }) {
  const W = 880, H = 180;
  if (!series.length) return null;
  const vals = series.map(p => (typeof p === 'object' ? Object.values(p).find(v => typeof v === 'number') ?? 0 : p));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = (max - min) || 1;
  const step = (W - 40) / Math.max(vals.length - 1, 1);
  const yOf = v => H - 30 - ((v - min) / range) * (H - 50);
  const pts = vals.map((v, i) => [20 + i * step, yOf(v)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = path + ` L${20 + (vals.length - 1) * step},${H - 30} L20,${H - 30} Z`;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{label}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1="20" x2={W - 20} y1={H - 30 - p * (H - 50)} y2={H - 30 - p * (H - 50)}
                stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 4" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <text key={i} x="6" y={H - 30 - p * (H - 50) + 3} fontSize="9" fill="currentColor" opacity="0.5"
                fontFamily="monospace">{(min + p * range).toFixed(1)}</text>
        ))}
        {bars ? pts.map((p, i) => (
          <rect key={i} x={p[0] - step / 3} y={p[1]} width={Math.max(step / 1.6, 2)} height={H - 30 - p[1]}
                fill={color} opacity="0.7" rx="1.5" />
        )) : (
          <>
            <path d={area} fill={color} opacity="0.10" />
            <path d={path} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
