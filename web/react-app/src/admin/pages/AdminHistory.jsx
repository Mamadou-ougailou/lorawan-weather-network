import React, { useEffect, useState } from 'react';
import { Icons } from '../primitives.jsx';
import { Chart } from '../AdminShell.jsx';
import { fetchStations, fetchHistory } from '../adminApi.js';

export default function AdminHistory() {
  const [stations, setStations] = useState([]);
  const [selectedSite, setSite] = useState('');
  const [hours, setHours]       = useState(24);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [keys, setKeys]         = useState([]); // colonnes dynamiques

  useEffect(() => {
    fetchStations()
      .then(s => { setStations(s); if (s.length) setSite(String(s[0].id)); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedSite) return;
    setLoading(true);
    fetchHistory(selectedSite, hours)
      .then(data => {
        setHistory(data);
        // Détecte les colonnes numériques disponibles (ex: temperatureAvg, humidityAvg…)
        if (data.length > 0) {
          const skip = new Set(['siteId', 'siteName', 'sampleCount', 'hourStart', 'bucket']);
          const numKeys = Object.keys(data[0]).filter(
            k => !skip.has(k) && typeof data[0][k] === 'number'
          );
          setKeys(numKeys);
        } else {
          setKeys([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSite, hours]);

  const COLORS = ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Historique</h1>
          <p className="page-sub">
            {history.length} points · {keys.length} métriques
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => setSite(s => s)}>{Icons.refresh}Actualiser</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 'var(--gap-grid)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Station :</label>
        <select className="filter-input" value={selectedSite}
          onChange={e => setSite(e.target.value)} style={{ height: 32, minWidth: 200 }}>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}
        </select>

        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Période :</label>
        <div className="seg">
          {[1, 6, 24, 48, 168].map(h => (
            <button key={h} data-active={hours === h} onClick={() => setHours(h)}>
              {h < 24 ? `${h}h` : `${h / 24}j`}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
      )}

      {!loading && history.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>
          Aucune donnée pour cette station sur cette période.
        </div>
      )}

      {!loading && keys.map((k, i) => (
        <div key={k} className="card" style={{ marginBottom: 'var(--gap-grid)' }}>
          <div className="card-head">
            <div>
              <h3 className="card-title">{k}</h3>
              <p className="card-sub">{history.length} points · agrégat horaire</p>
            </div>
          </div>
          <div style={{ padding: 'var(--pad-card)' }}>
            <Chart
              series={history.map(h => h[k] ?? 0)}
              label={k}
              color={COLORS[i % COLORS.length]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
