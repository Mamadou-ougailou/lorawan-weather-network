import React, { useEffect, useState, useRef } from 'react';
import { Icons } from '../primitives.jsx';
import { fetchLive } from '../adminApi.js';

export default function AdminLive({ user }) {
  const [cache, setCache]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [lastPoll, setLastPoll] = useState(null);
  const [autoRefresh, setAuto]  = useState(true);
  const intervalRef = useRef(null);

  const load = () => {
    fetchLive()
      .then(data => { setCache(data); setLastPoll(new Date()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const entries = Object.entries(cache);
  const META_KEYS = new Set(['site_id', 'dev_eui', 'rssi', 'snr', 'received_at', 'raw_payload']);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Live & Cache MQTT</h1>
          <p className="page-sub">
            {entries.length} site(s) en cache
            {lastPoll && ` · Mis à jour ${lastPoll.toLocaleTimeString('fr')}`}
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => setAuto(a => !a)}>
            {autoRefresh ? <>{Icons.close} Stop auto</> : <>{Icons.refresh} Auto 5s</>}
          </button>
          <button className="btn btn-primary" onClick={load}>{Icons.refresh}Actualiser</button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 500 }}>Aucune donnée en cache</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Le bridge MQTT n'a pas encore reçu de trames.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--gap-grid)' }}>
        {entries.map(([siteId, payload]) => {
          const meta = Object.fromEntries(Object.entries(payload).filter(([k]) => META_KEYS.has(k)));
          const readings = Object.fromEntries(Object.entries(payload).filter(([k]) => !META_KEYS.has(k)));
          return (
            <div key={siteId} className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Site #{siteId}</h3>
                  <p className="card-sub">
                    {meta.received_at ? new Date(meta.received_at).toLocaleTimeString('fr') : '—'}
                    {meta.rssi != null && ` · RSSI ${meta.rssi} dBm`}
                    {meta.snr  != null && ` · SNR ${meta.snr} dB`}
                  </p>
                </div>
                <span className="live-pill"><span className="pulse" />LIVE</span>
              </div>
              <div style={{ padding: 'var(--pad-card)' }}>
                {/* Sensor readings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {Object.entries(readings).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--accent)' }}>
                        {typeof v === 'number' ? v.toFixed(2) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Meta */}
                <details style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: 6 }}>Métadonnées</summary>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', padding: 8, borderRadius: 4, overflow: 'auto', fontSize: 10 }}>
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
