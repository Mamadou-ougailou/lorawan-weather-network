import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, ROUTES } from './api';

const StationsContext = createContext([]);

// Palette de couleurs pour assigner une couleur unique à chaque station
const PALETTE = ["#34d399", "#f97316", "#a78bfa", "#fde047", "#60a5fa", "#f43f5e", "#ff9153"];

export function StationsProvider({ children }) {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(ROUTES.stations)
      .then(data => {
        if (cancelled) return;
        // On injecte une couleur côté Front pour l'UI (le Backend ne gère pas les couleurs)
        const withColors = data.map((s, i) => ({
          ...s,
          color: PALETTE[i % PALETTE.length]
        }));
        setStations(withColors);
      })
      .catch(e => console.error("Could not fetch stations:", e));
    return () => { cancelled = true; };
  }, []);

  return (
    <StationsContext.Provider value={stations}>
      {children}
    </StationsContext.Provider>
  );
}

export function useStations() {
  return useContext(StationsContext);
}
