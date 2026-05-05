/* global React, Icons, Chip, Spark, WindArrow, StatusDot, fmt, METEO_DATA */

const MD = window.METEO_DATA;
const { useState, useEffect, useRef } = React;

// ============================================================
// Sidebar
// ============================================================
function Sidebar({ active, onNavigate, alertCount, env }) {
  const items = [
    { id: 'dashboard',   label: 'Dashboard',         icon: Icons.dashboard },
    { id: 'stations',    label: 'Stations',          icon: Icons.station, badge: MD.STATIONS.length },
    { id: 'live',        label: 'Live & cache',      icon: Icons.gauge },
    { id: 'measures',    label: 'Mesures',           icon: Icons.measure },
    { id: 'history',     label: 'Historique',        icon: Icons.history },
    { id: 'compare',     label: 'Comparaison',       icon: Icons.compare },
  ];
  const items2 = [
    { id: 'alerts',      label: 'Alertes',           icon: Icons.alerts, badge: alertCount, tone: 'danger' },
    { id: 'mappings',    label: 'Mappings capteurs', icon: Icons.mapping, badge: MD.MAPPINGS.length },
    { id: 'settings',    label: 'Paramètres',        icon: Icons.settings },
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
        <div className="brand-mark">M</div>
        <div className="brand-name">Météo · Admin</div>
        <span className="brand-env">{env}</span>
      </div>
      <nav className="nav">
        <div className="nav-section-label">Observation</div>
        {items.map(it => <Item key={it.id} it={it} />)}
        <div className="nav-section-label">Opérations</div>
        {items2.map(it => <Item key={it.id} it={it} />)}
      </nav>
      <div className="sidebar-foot">
        <div className="avatar">CM</div>
        <div className="user-meta">
          <div className="user-name">Camille Moreau</div>
          <div className="user-role">Opérateur réseau</div>
        </div>
        {Icons.chevron}
      </div>
    </aside>
  );
}

// ============================================================
// Topbar
// ============================================================
function Topbar({ crumbs, onToggleTheme, theme }) {
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
      <span className="live-pill"><span className="pulse"></span>WS · LIVE</span>
      <div className="topbar-search">
        {Icons.search}
        <input placeholder="Rechercher une station, une alerte, un capteur…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" title="Rafraîchir">{Icons.refresh}</button>
        <button className="icon-btn" title="Mode" onClick={onToggleTheme}>
          {theme === 'dark' ? Icons.sun : Icons.moon}
        </button>
        <button className="icon-btn" title="Notifications">
          {Icons.bell}<span className="dot"></span>
        </button>
      </div>
    </header>
  );
}

// ============================================================
// Map of France with station pins
// ============================================================
function StationMap({ stations, onPick }) {
  const W = 720, H = 360;
  const toneColor = { ok: '#4ade80', warn: '#fbbf24', danger: '#f87171', off: '#4a5260' };
  return (
    <div className="map-wrap">
      <svg className="map-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"/>
          </pattern>
          <radialGradient id="pinGlow">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {/* stylized France outline (approximate) */}
        <path
          d="M 230 70 L 280 60 L 330 50 L 380 55 L 430 75 L 470 100 L 500 140 L 510 190 L 530 220 L 540 260 L 510 290 L 470 310 L 430 320 L 380 315 L 330 305 L 280 290 L 240 270 L 200 240 L 175 200 L 165 160 L 175 120 L 200 90 Z M 555 305 L 580 295 L 590 320 L 575 335 L 555 325 Z"
          fill="rgba(56, 189, 248, 0.04)"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {stations.map(s => {
          const [x, y] = MD.projectFR(s.lat, s.lon, W, H);
          const c = toneColor[s.status] || toneColor.ok;
          return (
            <g key={s.id} className="map-pin" onClick={() => onPick && onPick(s)} transform={`translate(${x},${y})`}>
              <circle r="22" fill={c} opacity="0.10"/>
              <circle r="12" fill={c} opacity="0.18"/>
              <circle r="5" fill={c} stroke="#0c1016" strokeWidth="1.2"/>
              {s.status === 'ok' && (
                <circle r="5" fill="none" stroke={c} strokeWidth="1">
                  <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              <text x="9" y="3" fontSize="9" fill="currentColor" opacity="0.7" fontFamily="var(--font-mono)">
                {s.temp != null ? `${s.temp.toFixed(1)}°` : 'OFF'}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <span className="legend-item"><span className="legend-dot" style={{background:'#4ade80'}}></span>Online</span>
        <span className="legend-item"><span className="legend-dot" style={{background:'#fbbf24'}}></span>Warn</span>
        <span className="legend-item"><span className="legend-dot" style={{background:'#f87171'}}></span>Critical</span>
        <span className="legend-item"><span className="legend-dot" style={{background:'#4a5260'}}></span>Offline</span>
      </div>
    </div>
  );
}

// ============================================================
// Live ticker (animated incoming frames)
// ============================================================
function LiveTicker() {
  const [ticks, setTicks] = useState(MD.TICKER_SEED);
  useEffect(() => {
    const id = setInterval(() => {
      const stations = MD.STATIONS.map(s => s.id);
      const keys = ['temp','wind','hum','press','rain'];
      const k = keys[Math.floor(Math.random() * keys.length)];
      const s = stations[Math.floor(Math.random() * stations.length)];
      const now = new Date();
      const t = now.toTimeString().slice(0, 8);
      const v = ({
        temp: () => `${(13 + Math.random() * 8).toFixed(1)}°C`,
        wind: () => `${Math.round(8 + Math.random() * 40)} km/h ${'↗↘↑→←↙↖↓'[Math.floor(Math.random()*8)]}`,
        hum:  () => `${Math.round(40 + Math.random() * 50)} %`,
        press:() => `${Math.round(1005 + Math.random() * 15)} hPa`,
        rain: () => `${(Math.random() * 4).toFixed(1)} mm`,
      })[k]();
      setTicks(prev => [{ t, station: s, k, v, _new: true }, ...prev].slice(0, 12));
    }, 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ticker">
      {ticks.map((tk, i) => (
        <div key={i} className={'tick' + (tk._new && i === 0 ? ' new' : '')}>
          <span className="t">{tk.t}</span>
          <span className="station">{tk.station}</span>
          <span className="payload"><span className="k">{tk.k}=</span><span className="v">{tk.v}</span></span>
          <span className="t">WS</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Alerts list (compact)
// ============================================================
function AlertsList({ items, compact = false }) {
  return (
    <div>
      {items.map(a => (
        <div key={a.id} className="alert-row">
          <span className="alert-bar" data-tone={a.level}></span>
          <div>
            <div className="alert-title">
              {a.kind}
              <Chip tone={a.level === 'info' ? 'accent' : a.level} dot={false}>{a.level === 'danger' ? 'CRITIQUE' : a.level === 'warn' ? 'AVERTISSEMENT' : 'INFO'}</Chip>
              {!compact && <Chip tone="neutral" dot={false} mono>{a.id}</Chip>}
            </div>
            <div className="alert-meta">
              <span>{a.stationName}</span>
              <span>·</span>
              <span>{a.msg}</span>
              {!compact && <><span>·</span><span className="mono">trigger: {a.trigger}</span><span>·</span><span className="mono">val: {a.value}</span></>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{a.since}</span>
            <button className="btn btn-ghost" style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}>{Icons.check} Résoudre</button>
            <button className="icon-btn" style={{ width: 26, height: 26 }}>{Icons.more}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, StationMap, LiveTicker, AlertsList });
