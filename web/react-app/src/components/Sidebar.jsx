import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: "Vue d'ensemble", icon: 'dashboard' },
  { id: 'compare',   label: 'Comparaison',     icon: 'monitoring' },
  { id: 'history',   label: 'Historique',      icon: 'history' },
  { id: 'sky',       label: 'Images du Ciel',  icon: 'cloud' },
  { id: 'map',       label: 'Carte',           icon: 'radar' },
];

export default function Sidebar({ activeSection, onNavigate, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`h-screen w-64 fixed left-0 top-0 z-50 flex flex-col border-r border-outline-variant bg-surface/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="p-8">
        <h1 className="text-2xl font-black tracking-tighter text-primary uppercase font-headline">WeatherNet</h1>
        <p className="font-label text-xs font-medium text-on-surface-variant mt-1">Région PACA</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all ${
                isActive 
                  ? 'text-primary bg-primary/10 border-r-4 border-primary' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 border-r-4 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-headline font-bold tracking-tight text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
