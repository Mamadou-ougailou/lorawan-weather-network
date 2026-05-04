import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch, ROUTES, fmt, timeAgo } from '../api';
import { useStations } from '../StationsContext';

export default function Map({ onNavigate }) {
  const stations = useStations();

  return (
    <section className="animate-in fade-in duration-500 flex flex-col h-full w-full">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6 shrink-0">Carte du Réseau</h2>
      
      <div className="h-[600px] lg:h-[750px] rounded-2xl overflow-hidden border border-outline-variant shadow-2xl relative z-10 mb-8 w-full">
        <MapContainer
          center={[43.65, 7.05]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stations.map(st => {
            const lat = st.latitude ?? st.lat;
            const lon = st.longitude ?? st.lon;
            return (lat != null && lon != null) ? (
              <SiteMarker key={st.id} station={st} lat={lat} lon={lon} onNavigate={onNavigate} />
            ) : null;
          })}
          <MapAutoCenter stations={stations} />
          <MapResizer />
        </MapContainer>
      </div>
    </section>
  );
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapAutoCenter({ stations }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations && stations.length > 0) {
      const validPoints = stations
        .filter(s => (s.latitude ?? s.lat) != null && (s.longitude ?? s.lon) != null)
        .map(s => [s.latitude ?? s.lat, s.longitude ?? s.lon]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        // Utilisation d'un court délai pour être sûr que le fitBounds prend en compte
        // la taille réelle du conteneur (surtout après le invalidateSize)
        const timer = setTimeout(() => {
          map.fitBounds(bounds, { padding: [80, 80] });
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [stations, map]);

  return null;
}

function SiteMarker({ station, lat, lon, onNavigate }) {
  const [popupData, setPopupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  async function handleOpen() {
    if (popupData || loading) return;
    setLoading(true);
    try {
      const rows = await apiFetch(ROUTES.measurements(station.id, 1));
      if (rows.length) {
        setPopupData(rows[0]);
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (_) {
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }

  // Création du marqueur personnalisé style "épingle" (pin)
  const pinIcon = L.divIcon({
    className: 'custom-pin-container',
    html: `
      <div class="custom-pin" style="--pin-color: ${station.color}">
        <span class="material-symbols-outlined pin-icon">cloud_queue</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const metrics = popupData ? [
    { key: 'temperature', label: 'Temp',   unit: '°C',   icon: 'thermostat', color: 'text-orange-400' },
    { key: 'humidity',    label: 'Hum',    unit: '%',    icon: 'water_drop', color: 'text-blue-400' },
    { key: 'pressure',    label: 'Pression', unit: ' hPa', icon: 'compress',   color: 'text-purple-400' },
    { key: 'wind_speed',  label: 'Vent',   unit: ' km/h', icon: 'air',        color: 'text-yellow-400' },
  ].filter(m => popupData[m.key] != null) : [];

  return (
    <Marker
      position={[lat, lon]}
      icon={pinIcon}
      eventHandlers={{ popupopen: handleOpen }}
    >
      <Popup>
        <div className="p-1 min-w-[200px]">
          {/* Header avec Statut basé sur station.is_active */}
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${station.is_active ? 'bg-green-500' : 'bg-gray-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse`}></div>
              <strong className="text-lg text-white font-headline tracking-tight">{station.city || station.name}</strong>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-4 gap-2 text-gray-400">
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-center">Récupération des données...</span>
              </div>
            ) : hasData ? (
              <div className="grid grid-cols-1 gap-2">
                {metrics.length > 0 ? metrics.map(m => (
                  <div key={m.key} className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${m.color}`}>{m.icon}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{m.label}</span>
                    </div>
                    <span className="font-bold text-white text-sm">{fmt(popupData[m.key])}{m.unit}</span>
                  </div>
                )) : (
                  <div className="text-[10px] text-gray-500 text-center py-2 italic font-medium">Aucun capteur actif détecté</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-2 gap-2 text-white/40 text-center">
                <span className="material-symbols-outlined text-xl">cloud_off</span>
                <span className="text-[10px] font-bold tracking-widest uppercase">Aucune donnée disponible</span>
              </div>
            )}

            {/* Footer & Bouton (Toujours visibles) */}
            <div className="pt-2">
              {hasData && (
                <div className="flex justify-between items-center mb-4 opacity-50 text-[9px] uppercase tracking-widest font-extrabold px-1">
                  <span>Mis à jour</span>
                  <span>{timeAgo(popupData.received_at)}</span>
                </div>
              )}
              
              <button 
                onClick={() => onNavigate && onNavigate('dashboard')}
                className="w-full bg-primary hover:bg-primary-hover text-white text-[11px] font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                Voir Dashboard
              </button>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
