import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: "Vue d'ensemble", icon: 'dashboard' },
  { id: 'compare',   label: 'Comparaison',    icon: 'monitoring' },
  { id: 'history',   label: 'Historique',     icon: 'history' },
  { id: 'sky',       label: 'Images du Ciel', icon: 'cloud' },
  { id: 'map',       label: 'Carte',          icon: 'radar' },
];

export default function Sidebar({ activeSection, onNavigate, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        sidebar-gradient-top
        h-screen w-72 sm:w-64 fixed left-0 top-0 z-50
        flex flex-col
        border-r border-white/5
        bg-surface-container-low/95 backdrop-blur-2xl
        shadow-[4px_0_32px_rgba(0,0,0,0.4)]
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Header sidebar mobile */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 lg:hidden">
          <span className="text-sm font-bold text-on-surface tracking-wide">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all"
            aria-label="Fermer le menu"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={`
                  nav-pill w-full text-left
                  flex items-center gap-3
                  px-4 py-3
                  text-sm font-semibold font-label
                  rounded-xl transition-all duration-200
                  ${isActive
                    ? 'nav-pill-active'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined text-[20px] leading-none shrink-0"
                  style={isActive ? { color: '#ff9153' } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer — indicateur réseau actif */}
        <div className="px-6 py-5 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="live-dot" />
            <span className="text-[11px] font-semibold text-on-surface-variant tracking-wide">
              Réseau actif
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
