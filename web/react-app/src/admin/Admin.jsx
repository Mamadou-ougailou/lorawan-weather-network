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

const CRUMBS = {
  dashboard: ['Admin', "Vue d'ensemble"],
  stations:  ['Admin', 'Stations'],
  live:      ['Admin', 'Live & Cache'],
  measures:  ['Admin', 'Mesures'],
  history:   ['Admin', 'Historique'],
  alerts:    ['Admin', 'Alertes'],
  mappings:  ['Admin', 'Mappings capteurs'],
};


export default function Admin({ onBack }) {
  const [page, setPage]           = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);

  // Poll active alert count for sidebar badge
  useEffect(() => {
    const refresh = () =>
      fetchAlerts()
        .then(a => setAlertCount(a.filter(al => !al.resolvedAt).length))
        .catch(() => {});
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  const navigate = (id) => setPage(id);

  return (
    <div className="admin-wrap" data-theme="dark">
      <div className="app">
        <AdminSidebar active={page} onNavigate={navigate} alertCount={alertCount} />
        <div className="main">
          <AdminTopbar crumbs={CRUMBS[page] || ['Admin']} onBack={onBack} />
          {page === 'dashboard' && <AdminDashboard onPickStation={(s) => s === 'alerts' ? setPage('alerts') : setPage('stations')} />}
          {page === 'stations'  && <AdminStations />}
          {page === 'live'      && <AdminLive />}
          {page === 'measures'  && <AdminMeasures />}
          {page === 'history'   && <AdminHistory />}
          {page === 'alerts'    && <AdminAlerts />}
          {page === 'mappings'  && <AdminMappings />}
        </div>
      </div>
    </div>
  );
}
