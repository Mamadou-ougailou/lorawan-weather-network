import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, ROUTES } from './api';

const StationsContext = createContext([]);
const MappingsContext = createContext([]);

// Palette de couleurs étendue pour gérer l'ajout de nombreuses stations dynamiquement
const PALETTE = [
  "#34d399", "#f97316", "#a78bfa", "#fde047", "#60a5fa", 
  "#f43f5e", "#2dd4bf", "#c084fc", "#fbbf24", "#38bdf8", 
  "#fb7185", "#a3e635", "#818cf8", "#f472b6", "#4ade80"
];

export function StationsProvider({ children }) {
  const [stations, setStations] = useState([]);
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    
    function loadStations() {
      Promise.all([
        apiFetch(ROUTES.stations),
        apiFetch(ROUTES.mappings).catch(() => []) // Fallback in case of error
      ])
        .then(([stationsData, mappingsData]) => {
          if (cancelled) return;
          
          const withColors = stationsData.map((s, i) => ({
            ...s,
            color: PALETTE[i % PALETTE.length]
          }));
          setStations(withColors);
          
          // Filter out inactive mappings and sort them if needed
          const activeMappings = mappingsData.filter(m => m.isActive);
          setMappings(activeMappings);
        })
        .catch(e => console.error("Could not fetch data:", e));
    }
    
    loadStations();
    // Rafraîchir la liste des stations toutes les 5 minutes
    // Ainsi, si l'admin ajoute/supprime une station, le site s'adapte sans F5 !
    const timer = setInterval(loadStations, 5 * 60_000);
    
    return () => { 
      cancelled = true; 
      clearInterval(timer);
    };
  }, []);

  return (
    <StationsContext.Provider value={stations}>
      <MappingsContext.Provider value={mappings}>
        {children}
      </MappingsContext.Provider>
    </StationsContext.Provider>
  );
}

export function useStations() {
  return useContext(StationsContext);
}

export function useMappings() {
  return useContext(MappingsContext);
}
