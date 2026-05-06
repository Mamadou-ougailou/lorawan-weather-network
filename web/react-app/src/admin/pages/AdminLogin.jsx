import React, { useState } from 'react';
import { Icons } from '../primitives.jsx';
import { login as apiLogin } from '../adminApi.js';
import fablab from '../../assets/fablab.png';

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
        {/* Decorative elements */}
        <div className="login-blob blob-1"></div>
        <div className="login-blob blob-2"></div>
        
        <div className="login-header">
          <div className="login-logo">
            <img src={fablab} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">Connexion Admin</h1>
          <p className="login-sub">Accédez à la gestion du réseau Météo LoRaWAN</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" style={{ animation: 'shake 0.4s var(--ease)' }}>
              {Icons.alerts}
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label>Adresse Email</label>
            <div className="input-wrapper">
              <span className="input-icon">{Icons.mail}</span>
              <input 
                type="email" 
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Mot de passe</label>
            <div className="input-wrapper">
              <span className="input-icon">{Icons.lock}</span>
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className="pass-toggle"
                onClick={() => setShowPass(!showPass)}
                title={showPass ? 'Masquer' : 'Afficher'}
              >
                {showPass ? Icons.eyeOff : Icons.eye}
              </button>
            </div>
          </div>

          <button className="btn btn-primary login-btn" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? (
              <span className="loader-dots"><span>.</span><span>.</span><span>.</span></span>
            ) : (
              <>
                Se connecter
                <span style={{ marginLeft: 8, display: 'flex' }}>{Icons.chevron}</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} Réseau Météo · Station de Recherche
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-logo {
          background: none !important;
          box-shadow: none !important;
          width: 120px !important;
          height: auto !important;
          margin-bottom: 24px;
        }
        .login-logo::after { display: none !important; }
        
        .login-blob {
          position: absolute;
          width: 200px;
          height: 200px;
          background: var(--accent);
          filter: blur(80px);
          opacity: 0.15;
          border-radius: 50%;
          z-index: -1;
        }
        .blob-1 { top: -100px; left: -100px; }
        .blob-2 { bottom: -100px; right: -100px; background: var(--accent-2); }
        
        .login-error {
          background: var(--danger-soft);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-weight: 500;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        
        .pass-toggle .icon { width: 16px; height: 16px; opacity: 0.7; }
        .pass-toggle:hover .icon { opacity: 1; }
        
        .input-icon .icon { width: 18px; height: 18px; opacity: 0.5; }
        .input-wrapper input:focus + .input-icon .icon { color: var(--accent); opacity: 1; }
      `}} />
    </div>
  );
}
