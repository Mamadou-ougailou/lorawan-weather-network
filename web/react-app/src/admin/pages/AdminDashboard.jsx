import React, { useEffect, useState } from 'react';
import { Icons, Spark, StatusDot, fmt } from '../primitives.jsx';
import { AlertsList } from '../AdminShell.jsx';
import { fetchStations, fetchAlerts, fetchLatest, fetchTrend, resolveAlert, deleteAlert } from '../adminApi.js';

function Kpi({ label, icon, value, unit, delta, spark, color }) {
  const arrow = { up: '↑', down: '↓', warn: '!', flat: '·' }[delta?.tone] || '·';
  return (
    <div className="kpi">
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value">{value}<span className="unit">{unit}</span></div>
      {delta && <div className="kpi-delta" data-tone={delta.tone}>{arrow} {delta.text}</div>}
      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
        {spark && <Spark values={spark} color={color} />}
      </div>
    </div>
  );
}

export default function AdminDashboard({ onPickStation, user }) {
  const [stations, setStations] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [latest, setLatest]     = useState([]);
  const [trend, setTrend]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchStations(), fetchAlerts(), fetchLatest(), fetchTrend(24, 60)])
      .then(([rs, ra, rl, rt]) => {
        if (rs.status === 'fulfilled') setStations(rs.value);
        if (ra.status === 'fulfilled') setAlerts(ra.value);
        if (rl.status === 'fulfilled') setLatest(rl.value);
        if (rt.status === 'fulfilled') setTrend(rt.value);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleResolve = (id) => {
    if (String(id).startsWith('v-')) return;
    resolveAlert(id).then(load).catch(console.error);
  };
  const handleDelete = (id) => {
    if (String(id).startsWith('v-')) return;
    deleteAlert(id).then(load).catch(console.error);
  };

  const active = stations.filter(s => s.isActive);
  const activeAlertsFromDB = alerts.filter(a => !a.resolvedAt);

  // Injection d'alertes virtuelles pour les stations inactives (fallback frontend)
  const staleStations = stations.filter(s => 
    s.isActive && 
    (!s.lastSeenAt || (new Date() - new Date(s.lastSeenAt) > 5 * 60 * 1000)) &&
    !activeAlertsFromDB.some(a => a.siteId === s.id && a.metric === 'offline')
  );

  const virtualAlerts = staleStations.map(s => ({
    id: `v-${s.id}`,
    siteId: s.id,
    siteName: s.name,
    metric: 'offline',
    message: s.lastSeenAt 
      ? `Station inactive depuis ${fmt.timeAgo(s.lastSeenAt)}`
      : 'Station n\'a jamais publié de données',
    triggeredAt: s.lastSeenAt || new Date().toISOString(),
    isVirtual: true
  }));

  const activeAlerts = [...activeAlertsFromDB, ...virtualAlerts];

  // Derive values
  const currentTemps = latest.map(l => l.temperature).filter(v => v != null);
  const avgTemp = currentTemps.length ? (currentTemps.reduce((a, b) => a + b, 0) / currentTemps.length).toFixed(1) : '—';
  
  // Real history for sparkline
  const trendTemps = trend.map(t => t.temperatureAvg).filter(v => v != null);

  if (loading) return <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>Chargement…</div>;

  return (
    <div className="content" data-screen-label="Dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Vue d'ensemble du réseau</h1>
          <p className="page-sub">{stations.length} stations · {activeAlerts.length} alertes actives</p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={load}>{Icons.refresh}Actualiser</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Stations actives" icon={Icons.station}
             value={active.length} unit={`/ ${stations.length}`}
             delta={{ tone: 'flat', text: `${Math.round(active.length / Math.max(stations.length, 1) * 100)}% en ligne` }}
             color="var(--ok)" />
        <Kpi label="Température moyenne" icon={Icons.thermo}
             value={avgTemp} unit="°C"
             delta={{ tone: 'flat', text: `${latest.length} mesures actives` }}
             spark={trendTemps} color="var(--info)" />
        <Kpi label="Alertes actives" icon={Icons.alerts}
             value={activeAlerts.length} unit=""
             delta={{ tone: activeAlerts.length > 0 ? 'warn' : 'flat', text: `${alerts.filter(a => a.resolvedAt).length} résolues` }}
             color="var(--danger)" />
        <Kpi label="Mappings" icon={Icons.mapping}
             value={latest.length} unit="capteurs"
             delta={{ tone: 'flat', text: 'mesures en cours' }}
             color="var(--accent)" />
      </div>

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
          <AlertsList items={activeAlerts.slice(0, 4)} compact onResolve={handleResolve} onDelete={handleDelete} />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Stations</h3>
              <p className="card-sub">Dernières valeurs</p>
            </div>
          </div>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 24 }} />
              <th>Station</th>
              <th>Ville</th>
              <th className="num">Temp</th>
              <th className="num">Humidité</th>
            </tr></thead>
            <tbody>
                    {stations.slice(0, 6).map(s => {
                      const m = latest.find(l => l.siteId === s.id);
                      const isOfflineAlert = alerts.some(a => a.siteId === s.id && a.metric === 'offline' && !a.resolvedAt);
                      const lastContact = s.lastSeenAt ? new Date(s.lastSeenAt) : null;
                      const isStale = !lastContact || (new Date() - lastContact > 5 * 60 * 1000);
                      const tone = !s.isActive ? 'off' : ((isOfflineAlert || isStale) ? 'danger' : 'ok');
                    
                    return (
                      <tr key={s.id} onClick={() => onPickStation && onPickStation(s)} style={{ cursor: 'pointer' }}>
                        <td><StatusDot tone={tone} /></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-3)' }}>
                            {s.lastSeenAt ? `Vu ${fmt.timeAgo(s.lastSeenAt)}` : 'Jamais vu'}
                          </div>
                        </td>
                    <td style={{ color: 'var(--text-1)' }}>{s.city || '—'}</td>
                    <td className="num">{fmt.temp(m?.temperature)}</td>
                    <td className="num">{fmt.pct(m?.humidity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
