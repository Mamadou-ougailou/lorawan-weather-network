import { useState, useEffect, useCallback, useRef } from 'react';
import Header  from './components/Header';
import Footer  from './components/Footer';
import Dashboard from './pages/Dashboard';
import Compare   from './pages/Compare';
import History   from './pages/History';
import SkyImages from './pages/SkyImages';
import Map       from './pages/Map';
import { REFRESH_INTERVAL_MS } from './api';

const SECTIONS = ['dashboard', 'compare', 'history', 'sky', 'map'];

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastUpdate,    setLastUpdate]    = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Initialiser depuis le hash URL
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (SECTIONS.includes(hash)) setActiveSection(hash);
  }, []);

  const handleNavigate = useCallback((section) => {
    setActiveSection(section);
    window.location.hash = section;
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshSignal(s => s + 1);
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  // Auto-refresh toutes les 60 s (dashboard seulement)
  useEffect(() => {
    const id = setInterval(handleRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [handleRefresh]);

  return (
    <>
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        lastUpdate={lastUpdate}
        onRefresh={handleRefresh}
      />
      <main className="container">
        {activeSection === 'dashboard' && <Dashboard refreshSignal={refreshSignal} />}
        {activeSection === 'compare'   && <Compare />}
        {activeSection === 'history'   && <History />}
        {activeSection === 'sky'       && <SkyImages />}
        {activeSection === 'map'       && <Map />}
      </main>
      <Footer />
    </>
  );
}
