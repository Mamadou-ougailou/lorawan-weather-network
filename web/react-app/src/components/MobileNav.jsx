import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Accueil',  icon: 'dashboard' },
  { id: 'map',       label: 'Carte',    icon: 'radar' },
  { id: 'compare',   label: 'Comparer', icon: 'monitoring' },
  { id: 'history',   label: 'Archives', icon: 'history' },
  { id: 'sky',       label: 'Ciel',     icon: 'cloud' },
];

export default function MobileNav({ activeSection, onNavigate }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] border-t border-white/5"
      style={{ background: 'rgba(var(--color-surf-low), 0.92)', backdropFilter: 'blur(24px)' }}
    >
      <div className="flex items-stretch h-16 pb-safe">
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative transition-all duration-200 active:scale-95"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Pill active indicator */}
              <span className={`
                absolute top-2 w-10 h-8 rounded-full transition-all duration-300
                ${isActive ? 'bg-primary/15 scale-100' : 'scale-0 opacity-0'}
              `} />

              <span className={`
                material-symbols-outlined relative z-10 transition-all duration-300
                ${isActive ? 'text-primary text-[22px]' : 'text-on-surface-variant text-[20px]'}
              `}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>

              <span className={`
                relative z-10 text-[10px] font-semibold tracking-tight transition-colors duration-300
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
