import React, { useState } from 'react';
import { Icons } from '../primitives.jsx';
import { login as apiLogin } from '../adminApi.js';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiLogin(email, password);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Identifiants invalides. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="brand-mark">A</div>
          </div>
          <h1 className="login-title">Connexion Admin</h1>
          <p className="login-sub">Accédez à la gestion du réseau Météo</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              {Icons.alerts}
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input 
                type="email" 
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Mot de passe</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="pass-toggle"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Se souvenir de moi</span>
            </label>
            <a href="#" className="forgot-link">Oublié ?</a>
          </div>

          <button className="btn btn-primary login-btn" disabled={loading}>
            {loading ? (
              <span className="loader-dots"><span>.</span><span>.</span><span>.</span></span>
            ) : (
              <>Connexion {Icons.chevron}</>
            )}
          </button>
        </form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} Réseau Météo LoRaWAN
        </div>
      </div>
    </div>
  );
}
