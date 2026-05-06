import React, { useEffect, useState } from 'react';
import { Icons, Chip } from '../primitives.jsx';
import { fetchMappings, createMapping, updateMapping, deleteMapping } from '../adminApi.js';

export default function AdminMappings() {
  const [mappings, setMappings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);   // mapping being edited
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');

  const load = () => {
    setLoading(true);
    fetchMappings().then(setMappings).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id) => {
    if (!window.confirm('Désactiver ce mapping ?')) return;
    deleteMapping(id).then(load).catch(alert);
  };

  const handleSave = (data) => {
    (editing
      ? updateMapping(editing.id, data)
      : createMapping(data)
    ).then(() => { setShowForm(false); setEditing(null); load(); }).catch(alert);
  };

  const displayed = mappings.filter(m => {
    if (filter === 'active'   && !m.isActive) return false;
    if (filter === 'inactive' &&  m.isActive) return false;
    if (search && !`${m.rawKey} ${m.alias}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mappings capteurs</h1>
          <p className="page-sub">
            {mappings.length} mappings · {mappings.filter(m => m.isActive).length} actifs · {mappings.filter(m => !m.isActive).length} inactifs
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={load}>{Icons.refresh}Actualiser</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            {Icons.plus}Nouveau mapping
          </button>
        </div>
      </div>

      {(showForm || editing) && (
        <MappingForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="card">
        <div className="filterbar">
          <input className="filter-input" placeholder="Filtrer par clé brute, alias…" style={{ width: 300 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="seg">
            <button data-active={filter === 'all'}      onClick={() => setFilter('all')}>Tous</button>
            <button data-active={filter === 'active'}   onClick={() => setFilter('active')}>Actifs</button>
            <button data-active={filter === 'inactive'} onClick={() => setFilter('inactive')}>Inactifs</button>
          </div>
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{displayed.length} résultats</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Chargement…</div>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr>
              <th>#</th>
              <th>Clé brute (raw_key)</th>
              <th>Alias</th>
              <th>Statut</th>
              <th />
            </tr></thead>
            <tbody>
              {displayed.map(m => (
                <tr key={m.id}>
                  <td className="mono">{m.id}</td>
                  <td className="mono">{m.rawKey}</td>
                  <td className="mono" style={{ color: 'var(--accent)' }}>{m.alias}</td>
                  <td>
                    <Chip tone={m.isActive ? 'ok' : 'neutral'} dot>
                      {m.isActive ? 'Actif' : 'Inactif'}
                    </Chip>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title="Modifier" onClick={() => { setEditing(m); setShowForm(true); }}>
                        {Icons.edit}
                      </button>
                      <button className="icon-btn" title="Désactiver" onClick={() => handleDelete(m.id)}>
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

function MappingForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    rawKey:   initial?.rawKey  ?? '',
    alias:    initial?.alias   ?? '',
    isActive: initial?.isActive ?? true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="card" style={{ marginBottom: 'var(--gap-grid)', padding: 'var(--pad-card)' }}>
      <h3 className="card-title" style={{ marginBottom: 16 }}>{initial ? 'Modifier le mapping' : 'Nouveau mapping'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Clé brute (raw_key) *</label>
          <input className="filter-input" value={form.rawKey} onChange={e => set('rawKey', e.target.value)}
            placeholder="ex: temp1" style={{ width: '100%', height: 32 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Alias *</label>
          <input className="filter-input" value={form.alias} onChange={e => set('alias', e.target.value)}
            placeholder="ex: temperature" style={{ width: '100%', height: 32 }} />
        </div>
        {initial && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Actif</label>
            <select className="filter-input" value={form.isActive ? '1' : '0'}
              onChange={e => set('isActive', e.target.value === '1')} style={{ height: 32 }}>
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => onSave(form)}>{Icons.check} Enregistrer</button>
        <button className="btn" onClick={onCancel}>{Icons.close} Annuler</button>
      </div>
    </div>
  );
}
