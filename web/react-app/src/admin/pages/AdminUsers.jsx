import React, { useState, useEffect } from 'react';
import { Icons, StatusDot, fmt } from '../primitives.jsx';
import { fetchUsers, createUser, updateUser, deleteUser } from '../adminApi.js';

export default function AdminUsers() {
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

  if (loading && !users.length) return <div className="content">Chargement des utilisateurs...</div>;

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
        <div className="card form-card" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <h3>{editing ? 'Modifier l\'utilisateur' : 'Créer un compte'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" defaultValue={editing?.email} required />
              </div>
              <div className="form-group">
                <label>{editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}</label>
                <input name="password" type="password" required={!editing} />
              </div>
              <div className="form-group">
                <label>Rôle</label>
                <select name="role" defaultValue={editing?.role || 'viewer'}>
                  <option value="viewer">Observateur (Viewer)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      <div className="card no-pad">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${u.role === 'admin' ? 'danger' : 'info'}`}>
                      {u.role === 'admin' ? 'Administrateur' : 'Observateur'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: 13 }}>
                    {fmt.date(u.created_at)}
                  </td>
                  <td className="actions">
                    <button className="icon-btn" onClick={() => setEditing(u)}>{Icons.edit}</button>
                    <button className="icon-btn" onClick={() => handleDelete(u.id)} style={{ color: 'var(--danger)' }}>{Icons.delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
