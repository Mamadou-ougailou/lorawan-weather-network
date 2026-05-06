import React, { useEffect, useState } from 'react';
import fablab from '../assets/fablab.png';

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="topnav-clock">
      {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function TopNav({ lastUpdate, onRefresh, setMobileOpen, onAdmin }) {
  const [isDark,   setIsDark]   = useState(true);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) { root.classList.remove('dark'); setIsDark(false); }
    else        { root.classList.add('dark');    setIsDark(true);  }
  };

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <header className="
      fixed top-0 right-0 left-0 lg:left-64
      flex justify-between items-center
      px-4 md:px-8 z-40 h-16
      border-b border-white/5
      bg-surface-container-low/80 backdrop-blur-2xl
      transition-colors
    ">
      {/* Left — menu + logo */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Bouton menu hamburger — mobile seulement */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-xl transition-all shrink-0"
          aria-label="Ouvrir le menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Logo mobile (xs only) */}
        <img
          src={fablab}
          alt="WeatherNet Logo"
          className="h-8 w-auto object-contain sm:hidden"
        />

        {/* Logo + texte desktop/tablette (sm+) */}
        <div className="hidden sm:flex items-center gap-3">
          <img src={fablab} alt="WeatherNet Logo" className="w-44 h-44 object-contain" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-on-surface font-headline">
              WeatherNet PACA
            </span>
            <span className="text-[10px] font-semibold text-on-surface-variant/60 tracking-widest uppercase mt-0.5">
              Réseau météorologique
            </span>
          </div>
        </div>
      </div>

      {/* Right — mise à jour + actions */}
      <div className="flex items-center gap-2 md:gap-4">

        {/* Dernière mise à jour — caché sur mobile */}
        {lastUpdate && (
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-medium text-on-surface-variant/60 tracking-wide pr-4 border-r border-white/8">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>cloud_sync</span>
            MàJ {lastUpdate}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            title="Actualiser"
            className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
          >
            <span
              className={`material-symbols-outlined text-xl ${spinning ? 'spin-once' : ''}`}
              key={spinning ? 'spin' : 'idle'}
            >
              refresh
            </span>
          </button>

          <button
            onClick={toggleTheme}
            title="Changer le thème"
            className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
          >
            <span className="material-symbols-outlined text-xl">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {onAdmin && (
            <button
              onClick={onAdmin}
              title="Interface Admin"
              className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
            >
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
