import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: "Accueil", icon: 'dashboard' },
  { id: 'map',       label: 'Carte',   icon: 'radar' },
  { id: 'compare',   label: 'Comparer', icon: 'monitoring' },
  { id: 'history',   label: 'Archives', icon: 'history' },
  { id: 'sky',       label: 'Ciel',    icon: 'cloud' },
];

export default function MobileNav({ activeSection, onNavigate }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-surface-container-low/80 backdrop-blur-2xl border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center gap-1 w-full relative group transition-all"
            >
              {/* Indicator dot above the icon */}
              <div className={`
                absolute -top-1 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300
                ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
              `} />
              
              <span className={`
                material-symbols-outlined text-[22px] transition-all duration-300
                ${isActive ? 'text-primary scale-110' : 'text-on-surface-variant'}
              `}>
                {item.icon}
              </span>
              
              <span className={`
                text-[9px] font-bold tracking-tighter uppercase transition-colors duration-300
                ${isActive ? 'text-primary' : 'text-on-surface-variant'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
