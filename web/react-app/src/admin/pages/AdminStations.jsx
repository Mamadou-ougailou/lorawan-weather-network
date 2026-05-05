import React, { useEffect, useState } from 'react';
import { Icons, Chip, StatusDot, fmt } from '../primitives.jsx';
import { Chart, AlertsList } from '../AdminShell.jsx';
import {
  fetchStations, createStation, updateStation, deleteStation,
  fetchLatest, fetchHistory, fetchAlerts,
} from '../adminApi.js';

// ── Station list ──────────────────────────────────────────────────────────────
export default function AdminStations() {
  const [stations, setStations]   = useState([]);
  const [latest, setLatest]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [picked, setPicked]       = useState(null);   // station object
  const [showForm, setShowForm]   = useState(false);

  const load = () => {
    setLoading(true);
    // Fetch séparément pour que l'un ne bloque pas l'autre
    fetchStations()
      .then(setStations)
      .catch(e => { console.error('stations:', e); })
      .finally(() => setLoading(false));
    fetchLatest()
      .then(setLatest)
      .catch(e => { console.error('latest:', e); });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id) => {
    if (!window.confirm('Désactiver cette station ?')) return;
    deleteStation(id).then(load).catch(alert);
  };

  if (picked) return (
    <StationDetail
      station={picked}
      latest={latest.find(l => l.siteId === picked.id)}
      onBack={() => setPicked(null)}
      onRefresh={load}
    />
  );

  const rows = stations.filter(s =>
    !filter || s.name?.toLowerCase().includes(filter.toLowerCase()) || s.city?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Stations</h1>
          <p className="page-sub">{stations.length} stations · {stations.filter(s => s.isActive).length} actives</p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={load}>{Icons.refresh}Actualiser</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>{Icons.plus}Ajouter</button>
        </div>
      </div>

      {showForm && (
        <StationForm
          onSave={(data) => createStation(data).then(() => { setShowForm(false); load(); }).catch(alert)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Rechercher par nom, ville…" style={{ width: 280 }}
            value={filter} onChange={e => setFilter(e.target.value)} />
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{rows.length} résultats</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
        ) : (
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 24 }} />
              <th>Station</th>
              <th>Ville</th>
              <th className="num">Lat</th>
              <th className="num">Lon</th>
              <th className="num">Alt.</th>
              <th className="num">Temp</th>
              <th className="num">Humidité</th>
              <th />
            </tr></thead>
            <tbody>
              {rows.map(s => {
                const m = latest.find(l => l.siteId === s.id);
                return (
                  <tr key={s.id} onClick={() => setPicked(s)} style={{ cursor: 'pointer' }}>
                    <td><StatusDot tone={s.isActive ? 'ok' : 'off'} /></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>#{s.id}</div>
                    </td>
                    <td>{s.city || '—'}</td>
                    <td className="num">{s.latitude != null ? Number(s.latitude).toFixed(4) : '—'}</td>
                    <td className="num">{s.longitude != null ? Number(s.longitude).toFixed(4) : '—'}</td>
                    <td className="num">{s.altitudeM != null ? `${s.altitudeM} m` : '—'}</td>
                    <td className="num">{fmt.temp(m?.temperature)}</td>
                    <td className="num">{fmt.pct(m?.humidity)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="icon-btn" title="Supprimer" onClick={() => handleDelete(s.id)}>
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Station detail ─────────────────────────────────────────────────────────────
function StationDetail({ station: s, latest: m, onBack, onRefresh }) {
  const [tab, setTab]         = useState('overview');
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [editing, setEditing] = useState(false);
  const [histHours, setHistHours] = useState(24);

  useEffect(() => {
    if (tab === 'history' || tab === 'overview') {
      fetchHistory(s.id, histHours).then(setHistory).catch(console.error);
    }
    if (tab === 'alerts') {
      fetchAlerts().then(a => setAlerts(a.filter(al => al.siteId === s.id))).catch(console.error);
    }
  }, [s.id, tab, histHours]);

  const handleSave = (data) => {
    updateStation(s.id, data).then(() => { setEditing(false); onRefresh(); }).catch(alert);
  };

  const tempSeries  = history.map(h => h.temperatureAvg ?? h.temperature_avg ?? 0);
  const humSeries   = history.map(h => h.humidityAvg ?? h.humidity_avg ?? 0);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <div className="crumbs" style={{ marginBottom: 6 }}>
            <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={onBack}>Stations</span>
            <span className="sep">/</span>
            <span className="here">{s.name}</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {s.name}
            <Chip tone={s.isActive ? 'ok' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Chip>
          </h1>
          <div className="station-meta">
            <span className="item"><span className="lbl">ID</span><span className="val">#{s.id}</span></span>
            <span className="item"><span className="lbl">Ville</span><span className="val">{s.city || '—'}</span></span>
            {s.latitude != null && <span className="item"><span className="lbl">Lat/Lon</span><span className="val">{Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</span></span>}
            {s.altitudeM != null && <span className="item"><span className="lbl">Alt.</span><span className="val">{s.altitudeM} m</span></span>}
          </div>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={onBack}>{Icons.back}Retour</button>
          <button className="btn" onClick={() => setEditing(true)}>{Icons.edit}Modifier</button>
        </div>
      </div>

      {editing && (
        <StationForm
          initial={s}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Metric strip */}
      {m && (
        <div className="card" style={{ marginBottom: 'var(--gap-grid)' }}>
          <div className="metric-strip">
            {Object.entries(m).filter(([k]) => !['id','siteId','receivedAt','ts'].includes(k)).slice(0, 6).map(([k, v]) => (
              <div key={k} className="cell">
                <div className="lbl">{k}</div>
                <div className="val">{typeof v === 'number' ? v.toFixed(1) : v ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="tabs">
          {[
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'history',  label: 'Historique' },
            { id: 'alerts',   label: 'Alertes' },
            { id: 'raw',      label: 'Trame brute' },
          ].map(t => (
            <div key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </div>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ padding: 'var(--pad-card)' }}>
            {tempSeries.length > 0
              ? <Chart series={tempSeries} label="Température (°C) — dernières 24h" color="#38bdf8" />
              : <div style={{ color: 'var(--text-2)', textAlign: 'center', padding: 20 }}>Pas de données d'historique</div>}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ padding: 'var(--pad-card)' }}>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              {[1, 6, 24, 48, 168].map(h => (
                <button key={h} className={`btn ${histHours === h ? 'btn-primary' : ''}`}
                  onClick={() => setHistHours(h)}>{h < 24 ? `${h}h` : `${h / 24}j`}</button>
              ))}
            </div>
            {humSeries.length > 0
              ? <Chart series={humSeries} label="Humidité (%)" color="#a78bfa" />
              : <div style={{ color: 'var(--text-2)', textAlign: 'center', padding: 20 }}>Pas de données</div>}
          </div>
        )}

        {tab === 'alerts' && <AlertsList items={alerts} />}

        {tab === 'raw' && (
          <pre style={{ margin: 0, padding: 20, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-1)', background: 'var(--bg-2)', overflow: 'auto' }}>
            {JSON.stringify({ station: s, latest: m }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Station form (create / edit) ───────────────────────────────────────────────
function StationForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    city: initial?.city ?? '',
    latitude: initial?.latitude ?? '',
    longitude: initial?.longitude ?? '',
    altitudeM: initial?.altitudeM ?? '',
    description: initial?.description ?? '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const row = (label, key, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      <input
        className="filter-input"
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        style={{ width: '100%', height: 32 }}
      />
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 'var(--gap-grid)', padding: 'var(--pad-card)' }}>
      <h3 className="card-title" style={{ marginBottom: 16 }}>{initial ? 'Modifier la station' : 'Nouvelle station'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {row('Nom *', 'name')}
        {row('Ville', 'city')}
        {row('Altitude (m)', 'altitudeM', 'number')}
        {row('Latitude', 'latitude', 'number')}
        {row('Longitude', 'longitude', 'number')}
        {row('Description', 'description')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => onSave(form)}>{Icons.check} Enregistrer</button>
        <button className="btn" onClick={onCancel}>{Icons.close} Annuler</button>
      </div>
    </div>
  );
}
