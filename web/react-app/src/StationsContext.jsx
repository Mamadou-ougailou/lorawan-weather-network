import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, ROUTES, API_BASE } from './api';
import { io } from 'socket.io-client';

const StationsContext  = createContext([]);
const MappingsContext  = createContext([]);
const LiveDataContext  = createContext({});
const WsStatusContext  = createContext(false);

const PALETTE = [
  "#34d399", "#f97316", "#a78bfa", "#fde047", "#60a5fa",
  "#f43f5e", "#2dd4bf", "#c084fc", "#fbbf24", "#38bdf8",
  "#fb7185", "#a3e635", "#818cf8", "#f472b6", "#4ade80"
];

export function StationsProvider({ children }) {
  const [stations,  setStations]  = useState([]);
  const [mappings,  setMappings]  = useState([]);
  const [liveData,  setLiveData]  = useState({});
  const [connected, setConnected] = useState(false);

  const loadStations = useCallback(() => {
    Promise.all([
      apiFetch(ROUTES.stations),
      apiFetch(ROUTES.mappings).catch(() => []),
    ])
      .then(([stationsData, mappingsData]) => {
        const withColors = stationsData
          .filter(s => s.isActive)
          .map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));
        setStations(withColors);
        setMappings(mappingsData.filter(m => m.isActive));
      })
      .catch(e => console.error("Could not fetch data:", e));
  }, []);

  useEffect(() => {
    loadStations();

    const wsUrl = new URL(API_BASE).origin;
    const socket = io(wsUrl, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 2_000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("weather:live", (data) => {
      if (data?.site_id == null) return;
      setLiveData(prev => ({
        ...prev,
        [data.site_id]: { ...prev[data.site_id], ...data },
      }));
    });

    socket.on("stations_updated", () => {
      console.log("[WS] Stations updated by admin, refreshing...");
      loadStations();
    });

    socket.on("mappings_updated", () => {
      console.log("[WS] Mappings updated by admin, refreshing...");
      loadStations();
    });

    const timer = setInterval(loadStations, 5 * 60_000);

    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, [loadStations]);

  return (
    <StationsContext.Provider value={stations}>
      <MappingsContext.Provider value={mappings}>
        <LiveDataContext.Provider value={liveData}>
          <WsStatusContext.Provider value={connected}>
            {children}
          </WsStatusContext.Provider>
        </LiveDataContext.Provider>
      </MappingsContext.Provider>
    </StationsContext.Provider>
  );
}

export const useStations  = () => useContext(StationsContext);
export const useMappings  = () => useContext(MappingsContext);
export const useLiveData  = () => useContext(LiveDataContext);
export const useWsConnected = () => useContext(WsStatusContext);
