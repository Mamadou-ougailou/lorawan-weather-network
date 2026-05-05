import React, { useEffect, useState } from 'react';
import { Icons, Spark } from '../primitives.jsx';
import { AlertsList } from '../AdminShell.jsx';
import { fetchAlerts, resolveAlert, deleteAlert } from '../adminApi.js';

function Kpi({ label, icon, value, unit, delta, color }) {
  const arrow = { up: '↑', down: '↓', warn: '!', flat: '·' }[delta?.tone] || '·';
  return (
    <div className="kpi">
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value">{value}<span className="unit">{unit}</span></div>
      {delta && <div className="kpi-delta" data-tone={delta.tone}>{arrow} {delta.text}</div>}
    </div>
  );
}

export default function AdminAlerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch]   = useState('');

  const load = () => {
    setLoading(true);
    fetchAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleResolve = (id) => resolveAlert(id).then(load).catch(alert);
  const handleDelete  = (id) => { if (window.confirm('Supprimer cette alerte ?')) deleteAlert(id).then(load).catch(alert); };

  const active   = alerts.filter(a => !a.resolvedAt);
  const resolved = alerts.filter(a =>  a.resolvedAt);

  const displayed = alerts.filter(a => {
    if (statusFilter === 'active'   && a.resolvedAt)   return false;
    if (statusFilter === 'resolved' && !a.resolvedAt)  return false;
    if (levelFilter !== 'all' && a.metric !== levelFilter) return false;
    if (search && !JSON.stringify(a).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const metrics = [...new Set(alerts.map(a => a.metric))];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alertes</h1>
          <p className="page-sub">{alerts.length} alertes · {active.length} actives · {resolved.length} résolues</p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={load}>{Icons.refresh}Actualiser</button>
          {active.length > 0 && (
            <button className="btn btn-primary" onClick={() => active.forEach(a => resolveAlert(a.id)).then?.(load) || Promise.all(active.map(a => resolveAlert(a.id))).then(load)}>
              {Icons.check}Tout résoudre
            </button>
          )}
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Kpi label="Actives" icon={Icons.alerts} value={active.length} unit=""
             delta={{ tone: active.length > 0 ? 'warn' : 'flat', text: 'non résolues' }} color="#f87171" />
        <Kpi label="Résolues" icon={Icons.check} value={resolved.length} unit=""
             delta={{ tone: 'flat', text: 'total historique' }} color="#4ade80" />
        <Kpi label="Métriques touchées" icon={Icons.measure} value={metrics.length} unit=""
             delta={{ tone: 'flat', text: metrics.slice(0, 3).join(', ') || '—' }} color="#38bdf8" />
      </div>

      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Filtrer…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="seg">
            <button data-active={levelFilter === 'all'} onClick={() => setLevelFilter('all')}>Toutes</button>
            {metrics.slice(0, 4).map(m => (
              <button key={m} data-active={levelFilter === m} onClick={() => setLevelFilter(m)}>{m}</button>
            ))}
          </div>
          <div className="seg">
            <button data-active={statusFilter === 'active'}   onClick={() => setStatusFilter('active')}>Actives</button>
            <button data-active={statusFilter === 'resolved'} onClick={() => setStatusFilter('resolved')}>Résolues</button>
            <button data-active={statusFilter === 'all'}      onClick={() => setStatusFilter('all')}>Toutes</button>
          </div>
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{displayed.length} résultats</span>
        </div>
        {loading
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
          : <AlertsList items={displayed} onResolve={handleResolve} onDelete={handleDelete} />
        }
      </div>
    </div>
  );
}
