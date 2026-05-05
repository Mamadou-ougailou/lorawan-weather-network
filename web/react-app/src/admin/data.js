// ============================================================
// Mock data for the Admin Météo prototype
// Every record corresponds to fields you'd realistically expose
// from the API endpoints provided.
// ============================================================

const STATIONS = [
  { id: 'STN-001', name: 'Paris — Montsouris',     lat: 48.821,  lon: 2.337,  region: 'Île-de-France',     status: 'ok',     temp: 14.2, hum: 72, wind: 18, windDir: 220, press: 1013, rain: 0.0, batt: 87, lastSeen: '2s' },
  { id: 'STN-002', name: 'Lyon — Bron',             lat: 45.732,  lon: 4.943,  region: 'Auvergne-Rhône-A.', status: 'ok',     temp: 17.6, hum: 58, wind: 12, windDir: 180, press: 1015, rain: 0.0, batt: 92, lastSeen: '4s' },
  { id: 'STN-003', name: 'Marseille — Marignane',   lat: 43.437,  lon: 5.215,  region: 'PACA',               status: 'warn',   temp: 22.1, hum: 41, wind: 47, windDir: 290, press: 1009, rain: 0.0, batt: 64, lastSeen: '8s' },
  { id: 'STN-004', name: 'Bordeaux — Mérignac',     lat: 44.830,  lon: -0.691, region: 'Nouvelle-Aquitaine', status: 'ok',     temp: 16.0, hum: 81, wind: 22, windDir: 250, press: 1012, rain: 1.4, batt: 78, lastSeen: '3s' },
  { id: 'STN-005', name: 'Lille — Lesquin',         lat: 50.570,  lon: 3.103,  region: 'Hauts-de-France',    status: 'danger', temp: 11.4, hum: 89, wind: 38, windDir: 280, press: 998,  rain: 6.8, batt: 41, lastSeen: '11s' },
  { id: 'STN-006', name: 'Strasbourg — Entzheim',   lat: 48.547,  lon: 7.628,  region: 'Grand Est',          status: 'ok',     temp: 13.7, hum: 76, wind: 9,  windDir: 200, press: 1014, rain: 0.2, batt: 95, lastSeen: '1s' },
  { id: 'STN-007', name: 'Nantes — Bouguenais',     lat: 47.157,  lon: -1.611, region: 'Pays de la Loire',   status: 'ok',     temp: 15.5, hum: 70, wind: 24, windDir: 240, press: 1011, rain: 0.0, batt: 83, lastSeen: '5s' },
  { id: 'STN-008', name: 'Toulouse — Blagnac',      lat: 43.629,  lon: 1.364,  region: 'Occitanie',          status: 'warn',   temp: 19.2, hum: 49, wind: 31, windDir: 300, press: 1010, rain: 0.0, batt: 70, lastSeen: '6s' },
  { id: 'STN-009', name: 'Nice — Côte d’Azur',      lat: 43.665,  lon: 7.215,  region: 'PACA',               status: 'off',    temp: null, hum: null, wind: null, windDir: 0, press: null, rain: null, batt: 0,  lastSeen: '14m' },
  { id: 'STN-010', name: 'Brest — Guipavas',        lat: 48.448,  lon: -4.418, region: 'Bretagne',           status: 'ok',     temp: 12.8, hum: 84, wind: 33, windDir: 270, press: 1007, rain: 2.1, batt: 88, lastSeen: '2s' },
  { id: 'STN-011', name: 'Rennes — Saint-Jacques',  lat: 48.069,  lon: -1.734, region: 'Bretagne',           status: 'ok',     temp: 13.1, hum: 79, wind: 19, windDir: 260, press: 1010, rain: 0.6, batt: 90, lastSeen: '3s' },
  { id: 'STN-012', name: 'Ajaccio — Campo dell\'Oro', lat: 41.918, lon: 8.793, region: 'Corse',              status: 'ok',     temp: 20.4, hum: 62, wind: 15, windDir: 160, press: 1014, rain: 0.0, batt: 81, lastSeen: '7s' },
];

// Map projection — simple bbox of metropolitan France into svg coords.
function projectFR(lat, lon, w, h) {
  const minLon = -5.2, maxLon = 9.6;
  const minLat = 41.3, maxLat = 51.2;
  const x = ((lon - minLon) / (maxLon - minLon)) * w;
  const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
  return [x, y];
}

const ALERTS = [
  { id: 'A-7821', level: 'danger', kind: 'Vent violent',          station: 'STN-005', stationName: 'Lille — Lesquin',         msg: 'Rafales > 95 km/h détectées',           since: '4 min',  trigger: 'wind > 90 km/h', value: '97 km/h' },
  { id: 'A-7820', level: 'danger', kind: 'Précipitations',        station: 'STN-005', stationName: 'Lille — Lesquin',         msg: 'Cumul horaire au-dessus du seuil',       since: '12 min', trigger: 'rain_1h > 5 mm',  value: '6.8 mm' },
  { id: 'A-7819', level: 'warn',   kind: 'Capteur dérive',        station: 'STN-003', stationName: 'Marseille — Marignane',   msg: 'Hygrométrie hors tolérance vs voisins', since: '38 min', trigger: 'humidity_drift', value: '−14%' },
  { id: 'A-7818', level: 'warn',   kind: 'Batterie faible',       station: 'STN-005', stationName: 'Lille — Lesquin',         msg: 'Batterie sous 50%',                       since: '1 h 4',  trigger: 'battery < 50',  value: '41%' },
  { id: 'A-7817', level: 'info',   kind: 'Reconnexion',           station: 'STN-006', stationName: 'Strasbourg — Entzheim',   msg: 'WS rétabli après 2m12s',                 since: '2 h',    trigger: 'reconnect',     value: '—' },
  { id: 'A-7816', level: 'warn',   kind: 'Pression atypique',     station: 'STN-008', stationName: 'Toulouse — Blagnac',      msg: 'Chute de 5 hPa en 3h',                   since: '3 h',    trigger: 'press_drop',    value: '−5.2 hPa' },
  { id: 'A-7815', level: 'danger', kind: 'Hors-ligne',            station: 'STN-009', stationName: 'Nice — Côte d’Azur',      msg: 'Aucune trame depuis 14 min',             since: '14 min', trigger: 'no_data',       value: 'OFFLINE' },
];

const MAPPINGS = [
  { id: 'M-001', sensorRef: 'BME280@0x76',      station: 'STN-001', metric: 'temperature', unit: '°C',   scale: 1.0,  offset: -0.2, status: 'active' },
  { id: 'M-002', sensorRef: 'BME280@0x76',      station: 'STN-001', metric: 'humidity',    unit: '%',    scale: 1.0,  offset:  0.0, status: 'active' },
  { id: 'M-003', sensorRef: 'BMP388@0x77',      station: 'STN-001', metric: 'pressure',    unit: 'hPa',  scale: 1.0,  offset:  0.4, status: 'active' },
  { id: 'M-004', sensorRef: 'WSx700-aux',       station: 'STN-001', metric: 'wind_speed',  unit: 'km/h', scale: 1.0,  offset:  0.0, status: 'active' },
  { id: 'M-005', sensorRef: 'WSx700-aux',       station: 'STN-001', metric: 'wind_dir',    unit: '°',    scale: 1.0,  offset:  0.0, status: 'active' },
  { id: 'M-006', sensorRef: 'TippingBucket-A',  station: 'STN-001', metric: 'rain_1h',     unit: 'mm',   scale: 0.2,  offset:  0.0, status: 'active' },
  { id: 'M-007', sensorRef: 'BME280@0x76',      station: 'STN-003', metric: 'humidity',    unit: '%',    scale: 1.0,  offset:  0.0, status: 'drift' },
  { id: 'M-008', sensorRef: 'WSx700-aux',       station: 'STN-009', metric: 'wind_speed',  unit: 'km/h', scale: 1.0,  offset:  0.0, status: 'inactive' },
];

// Live ticker payloads — generated, but seeded so the first frame is stable.
const TICKER_SEED = [
  { t: '14:02:11', station: 'STN-001', k: 'temp',   v: '14.2°C' },
  { t: '14:02:10', station: 'STN-002', k: 'wind',   v: '12 km/h ↗ S' },
  { t: '14:02:10', station: 'STN-006', k: 'press',  v: '1014 hPa' },
  { t: '14:02:09', station: 'STN-005', k: 'rain',   v: '6.8 mm' },
  { t: '14:02:09', station: 'STN-004', k: 'temp',   v: '16.0°C' },
  { t: '14:02:08', station: 'STN-003', k: 'wind',   v: '47 km/h ↗ NW' },
  { t: '14:02:08', station: 'STN-007', k: 'hum',    v: '70 %' },
  { t: '14:02:07', station: 'STN-010', k: 'temp',   v: '12.8°C' },
  { t: '14:02:07', station: 'STN-001', k: 'press',  v: '1013 hPa' },
  { t: '14:02:06', station: 'STN-008', k: 'wind',   v: '31 km/h ↗ NW' },
];

// 24h history series for the detail page (temp + wind + rain).
function genSeries(n, base, variance, trend = 0) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.sin(i / 3) + (Math.random() - 0.5)) * variance + trend / n;
    out.push(v);
  }
  return out;
}

const HISTORY = {
  temp:  genSeries(24, 14, 0.6, 4),
  wind:  genSeries(24, 18, 4),
  rain:  Array.from({ length: 24 }, (_, i) => Math.max(0, (Math.sin(i / 4) - 0.3) * 1.4 + (Math.random() * 0.4))),
  press: genSeries(24, 1013, 0.8, -2),
};

window.METEO_DATA = { STATIONS, ALERTS, MAPPINGS, TICKER_SEED, HISTORY, projectFR };
