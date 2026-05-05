import React, { useEffect, useState } from 'react';
import { Icons } from '../primitives.jsx';
import { fetchStations, fetchMeasurements, deleteMeasurement } from '../adminApi.js';

export default function AdminMeasures() {
  const [stations, setStations]     = useState([]);
  const [measures, setMeasures]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selectedSite, setSite]     = useState('');
  const [limit, setLimit]           = useState(50);

  useEffect(() => {
    fetchStations().then(s => { setStations(s); if (s.length) setSite(String(s[0].id)); }).catch(console.error);
  }, []);

  const load = () => {
    if (!selectedSite) return;
    setLoading(true);
    fetchMeasurements(selectedSite, limit)
      .then(setMeasures)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedSite, limit]);

  const handleDelete = (id) => {
    if (!window.confirm('Supprimer cette mesure ?')) return;
    deleteMeasurement(id).then(load).catch(alert);
  };

  // Determine columns from first row
  const META = new Set(['id', 'siteId', 'receivedAt']);
  const sensorKeys = measures.length
    ? Object.keys(measures[0]).filter(k => !META.has(k))
    : [];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mesures</h1>
          <p className="page-sub">{measures.length} mesures affichées</p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={load}>{Icons.refresh}Actualiser</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--gap-grid)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Station :</label>
        <select
          className="filter-input"
          value={selectedSite}
          onChange={e => setSite(e.target.value)}
          style={{ height: 32, minWidth: 200 }}
        >
          {stations.map(s => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}
        </select>

        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Limite :</label>
        <div className="seg">
          {[20, 50, 100, 200].map(n => (
            <button key={n} data-active={limit === n} onClick={() => setLimit(n)}>{n}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
        ) : measures.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Aucune mesure trouvée</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th>#</th>
                <th>Reçue le</th>
                {sensorKeys.map(k => <th key={k} className="num">{k}</th>)}
                <th />
              </tr></thead>
              <tbody>
                {measures.map(m => (
                  <tr key={m.id}>
                    <td className="mono">{m.id}</td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {m.receivedAt ? new Date(m.receivedAt).toLocaleString('fr') : '—'}
                    </td>
                    {sensorKeys.map(k => (
                      <td key={k} className="num">
                        {m[k] != null ? (typeof m[k] === 'number' ? m[k].toFixed(2) : m[k]) : '—'}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Supprimer" onClick={() => handleDelete(m.id)}>
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
