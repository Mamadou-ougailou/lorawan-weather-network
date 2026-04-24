import { SITE_NAMES } from '../api';

const NAV_SECTIONS = [
  { id: 'dashboard', label: 'Vue d\'ensemble' },
  { id: 'compare',   label: 'Comparaison' },
  { id: 'history',   label: 'Historique' },
  { id: 'sky',       label: 'Images du Ciel' },
  { id: 'map',       label: 'Carte' },
];

export default function Header({ activeSection, onNavigate, lastUpdate, onRefresh }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="logo">
          <span className="logo-icon">🌦</span>
          <span className="logo-text">WeatherNet PACA</span>
        </div>
        <nav className="main-nav">
          {NAV_SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-link${activeSection === id ? ' active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-meta">
          <span className="last-update" title="Dernière mise à jour">
            {lastUpdate ? `Mis à jour : ${lastUpdate}` : '–'}
          </span>
          <button className="btn-icon" title="Actualiser les données" onClick={onRefresh}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
