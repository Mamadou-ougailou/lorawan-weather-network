import React from 'react';
import logo from '../assets/logo.png';

const NAV_ITEMS = [
  { id: 'dashboard', label: "Vue d'ensemble", icon: 'dashboard' },
  { id: 'compare', label: 'Comparaison', icon: 'monitoring' },
  { id: 'history', label: 'Historique', icon: 'history' },
  { id: 'sky', label: 'Images du Ciel', icon: 'cloud' },
  { id: 'map', label: 'Carte', icon: 'radar' },
];

export default function Sidebar({ activeSection, onNavigate, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        sidebar-gradient-top
        h-screen w-64 fixed left-0 top-0 z-50
        flex flex-col
        border-r border-white/5
        bg-surface-container-low/95 backdrop-blur-2xl
        shadow-[4px_0_32px_rgba(0,0,0,0.4)]
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="px-7 py-7 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="WeatherNet Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-on-surface uppercase font-headline leading-none">
                WeatherNet
              </h1>
              <p className="font-label text-[10px] font-semibold text-on-surface-variant mt-1 tracking-[0.12em] uppercase">
                Région PACA
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  nav-pill w-full text-left
                  flex items-center gap-3
                  px-4 py-2.5
                  text-sm font-semibold font-label
                  ${isActive
                    ? 'nav-pill-active'
                    : 'text-on-surface-variant hover:text-on-surface'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined text-[19px] leading-none"
                  style={isActive ? { color: '#ff9153' } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer — live indicator */}
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
