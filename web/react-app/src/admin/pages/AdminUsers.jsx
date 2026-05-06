import React, { useState, useEffect } from 'react';
import { Icons, Chip, fmt } from '../primitives.jsx';
import { fetchUsers, createUser, updateUser, deleteUser } from '../adminApi.js';

export default function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(err => console.error('Erreur chargement utilisateurs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    try {
      if (editing) {
        await updateUser(editing.id, data);
      } else {
        await createUser(data);
      }
      setEditing(null);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const getInitials = (email) => {
    if (!email) return '??';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  if (loading && !users.length) {
    return (
      <div className="content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'var(--text-3)' }}>
          <div className="loader-dots"><span>.</span><span>.</span><span>.</span></div>
          <p>Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-sub">Gérez les comptes d'accès à l'interface d'administration</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          {Icons.plus} Nouvel utilisateur
        </button>
      </div>

      {(showForm || editing) && (
        <div className="card" style={{ marginBottom: 32, maxWidth: 500, animation: 'slideDown 0.3s var(--ease)' }}>
          <div className="card-head">
            <h3 className="card-title">{editing ? 'Modifier l\'utilisateur' : 'Créer un compte'}</h3>
            <button className="icon-btn" onClick={() => { setShowForm(false); setEditing(null); }}>{Icons.close}</button>
          </div>
          <div className="card-pad">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Email</label>
                <input 
                  name="email" 
                  type="email" 
                  defaultValue={editing?.email} 
                  required 
                  placeholder="exemple@weather.local"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--r-sm)', 
                    border: '1px solid var(--line-strong)', 
                    background: 'var(--bg-2)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                  {editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                </label>
                <input 
                  name="password" 
                  type="password" 
                  required={!editing} 
                  placeholder="••••••••"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--r-sm)', 
                    border: '1px solid var(--line-strong)', 
                    background: 'var(--bg-2)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Rôle</label>
                <select 
                  name="role" 
                  defaultValue={editing?.role || 'viewer'}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--r-sm)', 
                    border: '1px solid var(--line-strong)', 
                    background: 'var(--bg-2)',
                    outline: 'none',
                    fontSize: 13
                  }}
                >
                  <option value="viewer">Observateur (Viewer)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Email</th>
              <th>Rôle</th>
              <th>Date de création</th>
              <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ 
                      width: 32, height: 32, 
                      fontSize: 10, 
                      background: u.role === 'admin' ? 'linear-gradient(135deg, var(--danger) 0%, var(--accent) 100%)' : 'linear-gradient(135deg, var(--ok) 0%, var(--accent) 100%)' 
                    }}>
                      {getInitials(u.email)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-0)' }}>{u.email}</div>
                      {currentUser?.id === u.id && (
                        <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>C'est vous</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <Chip tone={u.role === 'admin' ? 'danger' : 'info'}>
                    {u.role === 'admin' ? 'Administrateur' : 'Observateur'}
                  </Chip>
                </td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {fmt.date(u.created_at)}
                </td>
                <td style={{ textAlign: 'right', paddingRight: 24 }}>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button className="icon-btn" title="Modifier" onClick={() => { setEditing(u); setShowForm(false); }}>
                      {Icons.edit}
                    </button>
                    <button 
                      className="icon-btn" 
                      title="Supprimer" 
                      style={{ 
                        color: currentUser?.id === u.id ? 'var(--text-3)' : 'var(--danger)',
                        opacity: currentUser?.id === u.id ? 0.4 : 1,
                        cursor: currentUser?.id === u.id ? 'not-allowed' : 'pointer'
                      }}
                      disabled={currentUser?.id === u.id}
                      onClick={() => handleDelete(u.id)}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
