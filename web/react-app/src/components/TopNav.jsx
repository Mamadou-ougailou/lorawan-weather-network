import React, { useEffect, useState } from 'react';

export default function TopNav({ lastUpdate, onRefresh, setMobileOpen }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 flex justify-between items-center px-4 md:px-8 z-40 h-20 bg-surface/80 backdrop-blur-xl border-b border-outline-variant transition-colors">
      <div className="flex items-center gap-4 md:gap-8 flex-1">
        <button 
          onClick={() => setMobileOpen(true)}
          className="lg:hidden material-symbols-outlined p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-all"
        >
          menu
        </button>
        <h2 className="text-xl font-bold tracking-tight text-on-surface font-headline hidden sm:block">WeatherNet PACA</h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-r border-outline-variant pr-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">cloud_sync</span>
            <span>MàJ: {lastUpdate || '–'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onRefresh} className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-all" title="Actualiser">refresh</button>
          <button onClick={toggleTheme} className="material-symbols-outlined p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-all" title="Changer le Thème">
            {isDark ? 'light_mode' : 'dark_mode'}
          </button>
        </div>
      </div>
    </header>
  );
}
