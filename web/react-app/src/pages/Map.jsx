import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch, ROUTES, SITE_NAMES, SITE_COLORS, SITE_COORDS, fmt, timeAgo } from '../api';

export default function Map() {
  return (
    <section className="animate-in fade-in duration-500 flex flex-col h-full w-full">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6 shrink-0">Carte des Stations</h2>
      <div className="h-[500px] lg:h-[700px] rounded-xl overflow-hidden border border-outline-variant shadow-lg relative z-10 mb-8 w-full">
        <MapContainer
          center={[43.65, 7.05]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
          />
          {Object.entries(SITE_COORDS).map(([id, coords]) => (
            <SiteMarker key={id} id={id} coords={coords} />
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

function SiteMarker({ id, coords }) {
  const [popupData, setPopupData] = useState(null);

  async function handleOpen() {
    if (popupData) return;
    try {
      const rows = await apiFetch(ROUTES.measurements(id, 1));
      if (rows.length) setPopupData(rows[0]);
    } catch (_) {}
  }

  return (
    <CircleMarker
      center={coords}
      radius={10}
      pathOptions={{
        fillColor: SITE_COLORS[id],
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }}
      eventHandlers={{ popupopen: handleOpen }}
    >
      <Popup>
        {popupData ? (
          <div>
            <strong>{SITE_NAMES[id]}</strong><br />
            🌡 {fmt(popupData.temperature)} °C &nbsp;
            💧 {fmt(popupData.humidity)} %<br />
            🔵 {fmt(popupData.pressure, 1)} hPa<br />
            <small>{timeAgo(popupData.received_at)}</small>
          </div>
        ) : (
          <div><strong>{SITE_NAMES[id]}</strong><br />Chargement…</div>
        )}
      </Popup>
    </CircleMarker>
  );
}
