/* global React, Icons, Chip, Spark, WindArrow, StatusDot, fmt, METEO_DATA,
          Sidebar, Topbar, StationMap, LiveTicker, AlertsList */

const { useState, useMemo } = React;
const D = window.METEO_DATA;

// ============================================================
// Dashboard page
// ============================================================
function PageDashboard({ onPickStation }) {
  const activeAlerts = D.ALERTS.filter(a => a.level !== 'info');
  return (
    <div className="content" data-screen-label="Dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Vue d'ensemble du réseau</h1>
          <p className="page-sub">12 stations · {activeAlerts.length} alertes actives · cache live à jour il y a 1 s</p>
        </div>
        <div className="page-head-actions">
          <button className="btn">{Icons.download}Exporter CSV</button>
          <button className="btn">{Icons.filter}Filtrer</button>
          <button className="btn btn-primary">{Icons.plus}Nouvelle station</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        <Kpi label="Stations en ligne" icon={Icons.station} value="10" unit="/ 12"
             delta={{ tone: 'flat', text: '83% — 2 hors ligne' }}
             spark={D.HISTORY.temp.map(v => v + 4)} color="#4ade80" />
        <Kpi label="Température moyenne" icon={Icons.thermo} value="15.7" unit="°C"
             delta={{ tone: 'up', text: '+0.8° vs hier' }}
             spark={D.HISTORY.temp} color="#38bdf8" />
        <Kpi label="Vent max observé" icon={Icons.wind} value="97" unit="km/h"
             delta={{ tone: 'warn', text: 'Lille — Lesquin' }}
             spark={D.HISTORY.wind} color="#fbbf24" />
        <Kpi label="Cumul pluie 1h" icon={Icons.drop} value="6.8" unit="mm"
             delta={{ tone: 'warn', text: 'Seuil dépassé · 1 station' }}
             spark={D.HISTORY.rain} color="#22d3ee" />
      </div>

      {/* Map + ticker */}
      <div className="grid-main">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Carte du réseau</h3>
              <p className="card-sub">Position et état des stations · cliquez pour le détail</p>
            </div>
            <div className="seg">
              <button data-active="true">Statut</button>
              <button>Température</button>
              <button>Vent</button>
              <button>Pluie</button>
            </div>
          </div>
          <StationMap stations={D.STATIONS} onPick={onPickStation} />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Flux temps réel</h3>
              <p className="card-sub">weather:live · Socket.IO</p>
            </div>
            <span className="live-pill"><span className="pulse"></span>STREAM</span>
          </div>
          <LiveTicker />
        </div>
      </div>

      {/* Alerts + top stations */}
      <div className="grid-bottom">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Alertes actives</h3>
              <p className="card-sub">{activeAlerts.length} non résolues</p>
            </div>
            <button className="btn btn-ghost" onClick={() => onPickStation && onPickStation('alerts')}>
              Tout voir {Icons.chevron}
            </button>
          </div>
          <AlertsList items={activeAlerts.slice(0, 4)} compact />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Stations</h3>
              <p className="card-sub">Dernière mesure par station</p>
            </div>
            <button className="btn btn-ghost">Voir tout {Icons.chevron}</button>
          </div>
          <StationsTable rows={D.STATIONS.slice(0, 6)} onPick={onPickStation} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, icon, value, unit, delta, spark, color }) {
  const arrow = { up: '↑', down: '↓', warn: '!', flat: '·' }[delta.tone] || '·';
  return (
    <div className="kpi">
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value">{value}<span className="unit">{unit}</span></div>
      <div className="kpi-delta" data-tone={delta.tone}>{arrow} {delta.text}</div>
      <Spark values={spark} color={color} />
    </div>
  );
}

// ============================================================
// Stations table (reusable)
// ============================================================
function StationsTable({ rows, onPick }) {
  const toneFor = (s) => s.status === 'ok' ? 'ok' : s.status === 'warn' ? 'warn' : s.status === 'danger' ? 'danger' : 'off';
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{width: 24}}></th>
          <th>Station</th>
          <th>Région</th>
          <th className="num">Temp</th>
          <th className="num">Vent</th>
          <th className="num">Pluie 1h</th>
          <th className="num">Batt.</th>
          <th>Vu</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(s => (
          <tr key={s.id} onClick={() => onPick && onPick(s)} style={{ cursor: 'pointer' }}>
            <td><StatusDot tone={toneFor(s)} /></td>
            <td>
              <div style={{ fontWeight: 500 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.id}</div>
            </td>
            <td style={{ color: 'var(--text-1)' }}>{s.region}</td>
            <td className="num">{fmt.temp(s.temp)}</td>
            <td className="num">{fmt.wind(s.wind)} <WindArrow deg={s.windDir} /></td>
            <td className="num">{fmt.rain(s.rain)}</td>
            <td className="num" style={{ color: s.batt < 50 ? 'var(--warn)' : 'var(--text-1)' }}>{s.batt}%</td>
            <td className="mono" style={{ color: 'var(--text-2)', fontSize: 11 }}>{s.lastSeen}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// Detail page (one station)
// ============================================================
function PageStation({ stationId, onBack }) {
  const s = D.STATIONS.find(x => x.id === stationId) || D.STATIONS[0];
  const [tab, setTab] = useState('overview');
  return (
    <div className="content" data-screen-label="Station detail">
      <div className="page-head">
        <div>
          <div className="crumbs" style={{ marginBottom: 6 }}>
            <span style={{ cursor: 'pointer' }} onClick={onBack}>Stations</span>
            <span className="sep">/</span>
            <span className="here">{s.name}</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {s.name}
            <Chip tone={s.status === 'ok' ? 'ok' : s.status === 'warn' ? 'warn' : s.status === 'danger' ? 'danger' : 'neutral'}>
              {s.status === 'ok' ? 'En ligne' : s.status === 'warn' ? 'Avertissement' : s.status === 'danger' ? 'Critique' : 'Hors ligne'}
            </Chip>
          </h1>
          <div className="station-meta">
            <span className="item"><span className="lbl">ID</span><span className="val">{s.id}</span></span>
            <span className="item"><span className="lbl">Lat / Lon</span><span className="val">{s.lat.toFixed(3)}, {s.lon.toFixed(3)}</span></span>
            <span className="item"><span className="lbl">Région</span><span className="val">{s.region}</span></span>
            <span className="item"><span className="lbl">Vu</span><span className="val">il y a {s.lastSeen}</span></span>
            <span className="item"><span className="lbl">Batterie</span><span className="val">{s.batt}%</span></span>
          </div>
        </div>
        <div className="page-head-actions">
          <button className="btn">{Icons.refresh}Rafraîchir</button>
          <button className="btn">{Icons.edit}Modifier</button>
          <button className="btn btn-danger">{Icons.trash}Supprimer</button>
        </div>
      </div>

      {/* Big metric strip */}
      <div className="card" style={{ marginBottom: 'var(--gap-grid)' }}>
        <div className="metric-strip">
          <Cell label="Température" val={fmt.temp(s.temp)} delta="+0.4° / 1h" />
          <Cell label="Humidité" val={`${s.hum ?? '—'}%`} delta="−2% / 1h" />
          <Cell label="Vent" val={`${fmt.wind(s.wind)} km/h`} delta={<><WindArrow deg={s.windDir} /> {s.windDir}°</>} />
          <Cell label="Rafale max" val={`${Math.round((s.wind || 0) * 1.4)} km/h`} delta="dernière 10 min" />
          <Cell label="Pression" val={`${fmt.press(s.press)} hPa`} delta="−1.2 / 3h" />
          <Cell label="Pluie 1h" val={`${fmt.rain(s.rain)} mm`} delta="cumul 24h: 12.4 mm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs">
          {['overview','history','mappings','alerts','raw'].map(t => (
            <div key={t} className="tab" data-active={tab === t} onClick={() => setTab(t)}>
              {({ overview: 'Vue d\'ensemble', history: 'Historique 24h', mappings: 'Capteurs', alerts: 'Alertes', raw: 'Trame brute' })[t]}
            </div>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ padding: 'var(--pad-card)' }}>
            <Chart series={D.HISTORY.temp} label="Température (°C) — dernières 24h" color="#38bdf8" />
            <div style={{ height: 14 }}></div>
            <Chart series={D.HISTORY.wind} label="Vent (km/h)" color="#fbbf24" />
          </div>
        )}

        {tab === 'history' && (
          <div style={{ padding: 'var(--pad-card)' }}>
            <Chart series={D.HISTORY.press} label="Pression (hPa)" color="#a78bfa" />
            <div style={{ height: 14 }}></div>
            <Chart series={D.HISTORY.rain} label="Pluie (mm)" color="#22d3ee" bars />
          </div>
        )}

        {tab === 'mappings' && (
          <MappingsTable rows={D.MAPPINGS.filter(m => m.station === s.id)} />
        )}

        {tab === 'alerts' && (
          <AlertsList items={D.ALERTS.filter(a => a.station === s.id)} />
        )}

        {tab === 'raw' && (
          <pre style={{ margin: 0, padding: 20, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)', background: 'var(--bg-2)', overflow: 'auto' }}>
{`GET /api/live?station=${s.id}
{
  "station": "${s.id}",
  "ts": "2026-05-05T14:02:11.402Z",
  "metrics": {
    "temperature": ${s.temp},
    "humidity": ${s.hum},
    "wind_speed": ${s.wind},
    "wind_dir": ${s.windDir},
    "pressure": ${s.press},
    "rain_1h": ${s.rain}
  },
  "battery": ${s.batt},
  "rssi": -68,
  "fw": "1.4.2"
}`}
          </pre>
        )}
      </div>
    </div>
  );
}

const Cell = ({ label, val, delta }) => (
  <div className="cell">
    <div className="lbl">{label}</div>
    <div className="val">{val}</div>
    <div className="delta">{delta}</div>
  </div>
);

// ============================================================
// Chart (line or bars)
// ============================================================
function Chart({ series, label, color = '#38bdf8', bars = false }) {
  const W = 880, H = 180;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = (max - min) || 1;
  const step = (W - 40) / (series.length - 1);
  const yOf = v => H - 30 - ((v - min) / range) * (H - 50);
  const pts = series.map((v, i) => [20 + i * step, yOf(v)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = path + ` L${20 + (series.length - 1) * step},${H - 30} L20,${H - 30} Z`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{label}</div>
        <div className="seg">
          <button>1h</button><button>6h</button><button data-active="true">24h</button><button>7j</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1="20" x2={W - 20} y1={H - 30 - p * (H - 50)} y2={H - 30 - p * (H - 50)}
                stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 4" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <text key={i} x="6" y={H - 30 - p * (H - 50) + 3} fontSize="9" fill="currentColor" opacity="0.5"
                fontFamily="var(--font-mono)">
            {(min + p * range).toFixed(1)}
          </text>
        ))}
        {bars ? (
          pts.map((p, i) => (
            <rect key={i} x={p[0] - step / 3} y={p[1]} width={step / 1.6} height={H - 30 - p[1]}
                  fill={color} opacity="0.7" rx="1.5" />
          ))
        ) : (
          <>
            <path d={area} fill={color} opacity="0.10" />
            <path d={path} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => i % 4 === 0 && (
              <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--bg-1)" stroke={color} strokeWidth="1.5" />
            ))}
          </>
        )}
        {/* X axis labels */}
        {[0, 6, 12, 18, 23].map(i => (
          <text key={i} x={20 + i * step} y={H - 12} fontSize="9" fill="currentColor" opacity="0.5"
                textAnchor="middle" fontFamily="var(--font-mono)">
            {String(i).padStart(2, '0')}:00
          </text>
        ))}
      </svg>
    </div>
  );
}

// ============================================================
// Mappings table
// ============================================================
function MappingsTable({ rows }) {
  const all = rows ?? D.MAPPINGS;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>ID</th><th>Capteur</th><th>Station</th><th>Métrique</th>
          <th className="num">Échelle</th><th className="num">Offset</th><th className="num">Unité</th>
          <th>Statut</th><th></th>
        </tr>
      </thead>
      <tbody>
        {all.map(m => (
          <tr key={m.id}>
            <td className="mono">{m.id}</td>
            <td className="mono">{m.sensorRef}</td>
            <td className="mono">{m.station}</td>
            <td>{m.metric}</td>
            <td className="num">{m.scale.toFixed(2)}</td>
            <td className="num">{m.offset >= 0 ? '+' : ''}{m.offset.toFixed(2)}</td>
            <td className="num mono">{m.unit}</td>
            <td>
              <Chip tone={m.status === 'active' ? 'ok' : m.status === 'drift' ? 'warn' : 'neutral'}>
                {m.status === 'active' ? 'Actif' : m.status === 'drift' ? 'Dérive' : 'Inactif'}
              </Chip>
            </td>
            <td>
              <div className="row-actions">
                <button className="icon-btn">{Icons.edit}</button>
                <button className="icon-btn">{Icons.trash}</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// Alerts page
// ============================================================
function PageAlerts() {
  return (
    <div className="content" data-screen-label="Alerts">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alertes</h1>
          <p className="page-sub">{D.ALERTS.length} alertes · 4 critiques · 2 non résolues depuis &gt; 1h</p>
        </div>
        <div className="page-head-actions">
          <button className="btn">{Icons.download}Exporter</button>
          <button className="btn btn-primary">{Icons.check}Tout résoudre</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Kpi label="Critiques" icon={Icons.alerts} value="3" unit="" delta={{tone:'warn', text:'+2 dernière heure'}} spark={[2,1,2,2,3,3]} color="#f87171" />
        <Kpi label="Avertissements" icon={Icons.alerts} value="3" unit="" delta={{tone:'flat', text:'stable'}} spark={[3,2,3,3,3,3]} color="#fbbf24" />
        <Kpi label="Temps moyen de résolution" icon={Icons.history} value="8" unit="min" delta={{tone:'down', text:'−2 min vs hier'}} spark={[12,10,9,9,8,8]} color="#38bdf8" />
      </div>

      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Filtrer…" />
          <div className="seg">
            <button data-active="true">Toutes</button>
            <button>Critiques</button>
            <button>Avertissements</button>
            <button>Info</button>
          </div>
          <div className="seg">
            <button data-active="true">Actives</button>
            <button>Résolues</button>
          </div>
          <span className="spacer"></span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{D.ALERTS.length} résultats</span>
        </div>
        <AlertsList items={D.ALERTS} />
      </div>
    </div>
  );
}

// ============================================================
// Stations list page
// ============================================================
function PageStations({ onPickStation }) {
  return (
    <div className="content" data-screen-label="Stations list">
      <div className="page-head">
        <div>
          <h1 className="page-title">Stations</h1>
          <p className="page-sub">{D.STATIONS.length} stations · 10 en ligne · 1 hors ligne · 1 dérive</p>
        </div>
        <div className="page-head-actions">
          <button className="btn">{Icons.download}Exporter</button>
          <button className="btn btn-primary">{Icons.plus}Ajouter une station</button>
        </div>
      </div>

      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Rechercher par nom, ID, région…" style={{ width: 280 }} />
          <div className="seg">
            <button data-active="true">Toutes</button>
            <button>En ligne</button>
            <button>Avert.</button>
            <button>Critique</button>
            <button>Hors ligne</button>
          </div>
          <span className="spacer"></span>
          <button className="btn btn-ghost">{Icons.filter}Filtres</button>
        </div>
        <StationsTable rows={D.STATIONS} onPick={onPickStation} />
      </div>
    </div>
  );
}

// ============================================================
// Mappings page
// ============================================================
function PageMappings() {
  return (
    <div className="content" data-screen-label="Mappings">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mappings capteurs</h1>
          <p className="page-sub">{D.MAPPINGS.length} mappings · 1 dérive détectée · 1 inactif</p>
        </div>
        <div className="page-head-actions">
          <button className="btn">{Icons.download}Exporter</button>
          <button className="btn btn-primary">{Icons.plus}Nouveau mapping</button>
        </div>
      </div>
      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Filtrer par capteur, station, métrique…" style={{ width: 320 }} />
          <div className="seg">
            <button data-active="true">Tous</button>
            <button>Actifs</button>
            <button>Dérive</button>
            <button>Inactifs</button>
          </div>
          <span className="spacer"></span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{D.MAPPINGS.length} résultats</span>
        </div>
        <MappingsTable />
      </div>
    </div>
  );
}

Object.assign(window, { PageDashboard, PageStation, PageAlerts, PageStations, PageMappings });
