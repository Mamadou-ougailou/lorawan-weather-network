import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopNav  from './components/TopNav';
import Footer  from './components/Footer';
import Dashboard from './pages/Dashboard';
import Compare   from './pages/Compare';
import History   from './pages/History';
import SkyImages from './pages/SkyImages';
import Map       from './pages/Map';
import { REFRESH_INTERVAL_MS } from './api';
import { useStations } from './StationsContext';

import MobileNav from './components/MobileNav';

const SECTIONS = ['dashboard', 'compare', 'history', 'sky', 'map'];

export default function App() {
  const stations = useStations();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastUpdate,    setLastUpdate]    = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  // Initialiser depuis le hash URL
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (SECTIONS.includes(hash)) setActiveSection(hash);
  }, []);

  const handleNavigate = useCallback((section) => {
    setActiveSection(section);
    window.location.hash = section;
    setMobileOpen(false);
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

  if (stations.length === 0) {
    return <div className="flex items-center justify-center h-screen w-screen bg-surface text-on-surface text-xl font-bold">Connexion au réseau de stations...</div>;
  }

  return (
    <>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <TopNav lastUpdate={lastUpdate} onRefresh={handleRefresh} setMobileOpen={setMobileOpen} />
      <main className="lg:ml-64 pt-16 pb-20 lg:pb-0 h-screen overflow-y-auto bg-surface transition-colors">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10 animate-fade-up">
          {activeSection === 'dashboard' && <Dashboard refreshSignal={refreshSignal} />}
          {activeSection === 'compare'   && <Compare />}
          {activeSection === 'history'   && <History />}
          {activeSection === 'sky'       && <SkyImages />}
          {activeSection === 'map'       && <Map onNavigate={handleNavigate} />}
        </div>
        <Footer />
      </main>
      <MobileNav activeSection={activeSection} onNavigate={handleNavigate} />
    </>
  );
}
