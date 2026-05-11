/**
 * Admin.jsx – Intégré dans l'app Vite React
 * Interface d'administration complète (stations, alertes, mappings, mesures, live)
 */
import React, { useState, useEffect } from 'react';
import './styles.css';

import { AdminSidebar, AdminTopbar } from './AdminShell.jsx';
import { fetchAlerts, fetchStations } from './adminApi.js';

import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminStations  from './pages/AdminStations.jsx';
import AdminAlerts    from './pages/AdminAlerts.jsx';
import AdminMappings  from './pages/AdminMappings.jsx';
import AdminLive      from './pages/AdminLive.jsx';
import AdminMeasures  from './pages/AdminMeasures.jsx';
import AdminHistory   from './pages/AdminHistory.jsx';
import AdminLogin     from './pages/AdminLogin.jsx';
import AdminUsers     from './pages/AdminUsers.jsx';

const CRUMBS = {
  dashboard: ['Admin', "Vue d'ensemble"],
  stations:  ['Admin', 'Stations'],
  live:      ['Admin', 'Live & Cache'],
  measures:  ['Admin', 'Mesures'],
  history:   ['Admin', 'Historique'],
  alerts:    ['Admin', 'Alertes'],
  mappings:  ['Admin', 'Mappings capteurs'],
  users:     ['Admin', 'Utilisateurs'],
};


function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function loadAuth() {
  const saved = localStorage.getItem('admin-auth');
  if (!saved) return null;
  const parsed = JSON.parse(saved);
  if (isTokenExpired(parsed.token)) {
    localStorage.removeItem('admin-auth');
    return null;
  }
  return parsed;
}

export default function Admin({ onBack }) {
  const [auth, setAuth]           = useState(loadAuth);
  const [page, setPage]           = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const [theme, setTheme]         = useState(() => localStorage.getItem('admin-theme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Poll active alert count for sidebar badge (DB alerts + virtual offline)
  useEffect(() => {
    if (!auth) return;
    const refresh = () =>
      Promise.all([fetchAlerts(), fetchStations()])
        .then(([a, s]) => {
          const dbActive = a.filter(al => !al.resolvedAt);
          const virtualOffline = s.filter(st =>
            st.isActive &&
            st.lastSeenAt &&
            (new Date() - new Date(st.lastSeenAt) > 1 * 60 * 1000) &&
            !dbActive.some(al => al.siteId === st.id && al.metric === 'offline')
          ).length;
          setAlertCount(dbActive.length + virtualOffline);
        })
        .catch(() => {});
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [auth]);

  useEffect(() => {
    localStorage.setItem('admin-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const navigate = (id) => {
    setPage(id);
    setMobileMenuOpen(false);
  };

  const handleLogin = (userData) => {
    setAuth(userData);
    localStorage.setItem('admin-auth', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('admin-auth');
  };

  // Vérifie l'expiration du token toutes les 60s pendant la session
  useEffect(() => {
    if (!auth) return;
    const id = setInterval(() => {
      if (isTokenExpired(auth.token)) {
        handleLogout();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [auth]);

  if (!auth) {
    return (
      <div className="admin-wrap" data-theme={theme}>
        <AdminLogin onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`admin-wrap ${mobileMenuOpen ? 'mobile-open' : ''}`} data-theme={theme}>
      <div className="app">
        <AdminSidebar active={page} onNavigate={navigate} alertCount={alertCount} isOpen={mobileMenuOpen} setOpen={setMobileMenuOpen} user={auth.user} />
        <div className="main">
          <AdminTopbar 
            crumbs={CRUMBS[page] || ['Admin']} 
            onBack={onBack} 
            theme={theme} 
            onToggleTheme={toggleTheme} 
            onMenuClick={() => setMobileMenuOpen(true)}
            onLogout={handleLogout}
            user={auth.user}
          />
          <div className="content-scroll">
            {page === 'dashboard' && <AdminDashboard user={auth.user} onPickStation={(s) => s === 'alerts' ? setPage('alerts') : setPage('stations')} />}
            {page === 'stations'  && <AdminStations  user={auth.user} />}
            {page === 'live'      && <AdminLive      user={auth.user} />}
            {page === 'measures'  && <AdminMeasures  user={auth.user} />}
            {page === 'history'   && <AdminHistory   user={auth.user} />}
            {page === 'alerts'    && <AdminAlerts    user={auth.user} />}
            {page === 'mappings'  && <AdminMappings  user={auth.user} />}
            {page === 'users'     && <AdminUsers     currentUser={auth.user} />}
          </div>
        </div>
      </div>
    </div>
  );
}
