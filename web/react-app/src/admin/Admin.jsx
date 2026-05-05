/**
 * Admin.jsx – Intégré dans l'app Vite React
 * Interface d'administration complète (stations, alertes, mappings, mesures, live)
 */
import React, { useState, useEffect } from 'react';
import './styles.css';

import { AdminSidebar, AdminTopbar } from './AdminShell.jsx';
import { fetchAlerts } from './adminApi.js';

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


export default function Admin({ onBack }) {
  const [auth, setAuth]           = useState(() => {
    const saved = localStorage.getItem('admin-auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage]           = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const [theme, setTheme]         = useState(() => localStorage.getItem('admin-theme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Poll active alert count for sidebar badge
  useEffect(() => {
    if (!auth) return;
    const refresh = () =>
      fetchAlerts()
        .then(a => setAlertCount(a.filter(al => !al.resolvedAt).length))
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
          />
          <div className="content-scroll">
            {page === 'dashboard' && <AdminDashboard onPickStation={(s) => s === 'alerts' ? setPage('alerts') : setPage('stations')} />}
            {page === 'stations'  && <AdminStations />}
            {page === 'live'      && <AdminLive />}
            {page === 'measures'  && <AdminMeasures />}
            {page === 'history'   && <AdminHistory />}
            {page === 'alerts'    && <AdminAlerts />}
            {page === 'mappings'  && <AdminMappings />}
            {page === 'users'     && <AdminUsers />}
          </div>
        </div>
      </div>
    </div>
  );
}
