import React, { useEffect, useState } from 'react';
import fablab from '../assets/fablab.png';

// ── Real-time clock ──────────────────────────────────────────────
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

// ── TopNav ───────────────────────────────────────────────────────
export default function TopNav({ lastUpdate, onRefresh, setMobileOpen }) {
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
      px-5 md:px-8 z-40 h-16
      border-b border-white/5
      bg-surface-container-low/80 backdrop-blur-2xl
      transition-colors
    ">
      {/* Left — title + mobile menu */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden material-symbols-outlined p-2 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-xl transition-all"
        >
          menu
        </button>
        <div className="flex items-center gap-3">
          <img src={fablab} alt="WeatherNet Logo" className="w-44 h-44 object-contain sm:hidden" />
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
      </div>

      {/* Right — clock, last update, actions */}
      <div className="flex items-center gap-3 md:gap-5">

        {/* Clock + last update */}
        <div className="hidden md:flex items-center gap-4 pr-4 border-r border-white/8">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-primary" style={{ fontSize: 14 }}>
              schedule
            </span>
            <Clock />
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-on-surface-variant/60 tracking-wide">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>cloud_sync</span>
              MàJ {lastUpdate}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            title="Actualiser"
            className="
              flex items-center justify-center w-9 h-9
              text-on-surface-variant hover:text-primary
              hover:bg-primary/10
              rounded-xl transition-all duration-200
            "
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
            className="
              flex items-center justify-center w-9 h-9
              text-on-surface-variant hover:text-primary
              hover:bg-primary/10
              rounded-xl transition-all duration-200
            "
          >
            <span className="material-symbols-outlined text-xl">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
