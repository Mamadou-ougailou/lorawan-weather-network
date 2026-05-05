import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, ROUTES, fmt } from '../api';
import { useStations, useMappings } from '../StationsContext';
import useWeatherSocket from '../hooks/useWeatherSocket';
import WeatherChart from '../components/WeatherChart';
import { getSensorMeta, toCamel } from '../utils/sensorMeta';

export default function Dashboard({ refreshSignal }) {
  const stations = useStations();
  const mappings = useMappings();
  const [restLatest, setRestLatest] = useState({});
  const [trendRows, setTrendRows] = useState(null); // Raw trend data from API
  const [mainStationId, setMainStationId] = useState(null);

  // ── Real-time MQTT → Socket.IO data ──────────────────────────────────
  const { latest: liveData, connected: wsConnected } = useWeatherSocket();

  // Merge: live data takes precedence over REST data
  const latest = { ...restLatest };
  for (const [siteId, data] of Object.entries(liveData)) {
    latest[siteId] = { ...latest[siteId], ...data };
  }

  const load = useCallback(async () => {
    try {
      const rows = await apiFetch(ROUTES.latest);
      const byId = {};
      rows.forEach(r => { byId[r.siteId] = r; });
      setRestLatest(byId);
    } catch (e) {
      console.warn('Could not load latest measurements:', e.message);
    }

    try {
      const data = await apiFetch(ROUTES.trend(6, 30));
      setTrendRows(data);
    } catch {
      try {
        const data = await apiFetch(ROUTES.compare(24));
        setTrendRows(data);
      } catch (e) {
        console.warn('Could not load chart:', e.message);
        setTrendRows([]);
      }
    }
  }, [stations]);

  // Charge au montage + à chaque refreshSignal + polling toutes les 60s
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load, refreshSignal]);

  // ── Rebuild trend chart reactively when live data or trend rows change ──
  const chart24h = useMemo(() => {
    if (!trendRows || !stations.length) return null;
    return buildTrendDatasets(trendRows, 'temperatureAvg', stations, 6, 30, latest);
  }, [trendRows, stations, latest]);


  const mainId = mainStationId || (stations[0]?.id ?? 1);
  const otherIds = stations.map(s => s.id).filter(id => id !== mainId);
  const sMain = latest[mainId] || {};
  const currentStation = stations.find(s => s.id === mainId);

  const getSiteTag = (st) => {
    // Juste un effet de couleur semi-aléatoire basé sur l'ID pour les tags
    const colors = [
      { color: "text-primary", bg: "bg-primary/10" },
      { color: "text-tertiary", bg: "bg-tertiary/10" },
      { color: "text-secondary", bg: "bg-secondary/10" }
    ];
    return { text: st ? st.name : "Réseau Local", ...colors[(st?.id || 0) % colors.length] };
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-xl bg-surface-container-low bg-gradient-to-br from-primary/15 to-transparent p-4 md:p-10 border-l-4 border-primary">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-[10px] md:text-xs mb-2">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              En Direct
            </div>
            <h3 className="text-3xl md:text-6xl font-black font-headline tracking-tighter text-on-surface mb-1 md:mb-2">{currentStation?.city || currentStation?.name || 'Inconnu'}</h3>
            <p className="text-on-surface-variant text-sm md:text-base font-medium flex items-center gap-2">
              Statut: {sMain.receivedAt ? 'En ligne' : 'En attente'} <span className="w-1 h-1 rounded-full bg-secondary"></span> {sMain.receivedAt ? new Date(sMain.receivedAt).toLocaleTimeString() : '--:--'}
              {wsConnected && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Live
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-8 justify-between md:justify-end mt-4 md:mt-0 w-full md:w-auto">
            <div className="text-left md:text-right flex-1">
              <div className="text-5xl md:text-8xl font-black font-headline tracking-tighter text-primary data-glow">
                {fmt(sMain.temperature, 0)}<span className="text-xl md:text-4xl align-top">°C</span>
              </div>
            </div>
            <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-primary/20 blur-2xl md:blur-3xl rounded-full"></div>
              <span className="material-symbols-outlined text-7xl md:text-8xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                wb_sunny
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4 mt-6 md:mt-12 relative z-10">
          {mappings
            .filter(m => m.alias !== 'temperature' && sMain[toCamel(m.alias)] != null)
            .map(m => {
              const camelKey = toCamel(m.alias);
              const meta = getSensorMeta(camelKey);
              const decimals = (camelKey.includes('Speed') || camelKey.includes('Quantity') || camelKey.includes('Rate')) ? 1 : 0;
              return (
                <StatBox 
                  key={camelKey}
                  label={meta.label} 
                  value={fmt(sMain[camelKey], decimals)} 
                  unit={meta.unit.trim()} 
                  icon={meta.icon} 
                  iconColor={meta.color} 
                />
              );
            })
          }
        </div>
      </section>

      <section className="flex lg:grid lg:grid-cols-2 gap-4 md:gap-8 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {otherIds.map(id => {
          const st = stations.find(s => s.id === id);
          const tagInfo = getSiteTag(st);
          return (
            <div key={id} className="min-w-[280px] md:min-w-0 flex-shrink-0 lg:flex-shrink">
              <SecondaryCard
                siteName={st && st.city ? st.city : `Station ${id}`}
                data={latest[id] || {}}
                tag={tagInfo.text}
                tagColor={tagInfo.color}
                tagBg={tagInfo.bg}
                mappings={mappings}
                onClick={() => setMainStationId(id)}
              />
            </div>
          );
        })}
      </section>

      {chart24h && (
        <section className="bg-surface-container-low rounded-xl p-8 border border-outline-variant">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-headline font-bold tracking-tight">Tendances Récentes</h4>
              <p className="text-xs text-on-surface-variant">Fluctuations des températures sur les 24 dernières heures</p>
            </div>
          </div>
          <div className="h-64 md:h-72 relative">
            <WeatherChart
              labels={chart24h.labels}
              datasets={chart24h.datasets}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: ctx => {
                        const d = new Date(ctx[0].label);
                        return isNaN(d) ? ctx[0].label : d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                      },
                      label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
                    }
                  },
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                      maxRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 10,
                      callback: function (val, idx, ticks) {
                        const isLast = idx === ticks.length - 1;
                        if (isLast) return "Maintenant";
                        
                        const d = new Date(chart24h.labels[idx]);
                        if (isNaN(d)) return val;
                        return `${d.getHours()}h${d.getMinutes() === 30 ? '30' : '00'}`;
                      }
                    }
                  },
                  y: { 
                    title: { 
                      display: typeof window !== 'undefined' && window.innerWidth > 640, 
                      text: '°C' 
                    }, 
                    grace: '5%' 
                  },
                },
              }}
            />
          </div>
        </section>
      )}
    </>
  );
}

function StatBox({ label, value, unit, icon, iconColor }) {
  return (
    <div className="bg-surface-container-highest/50 backdrop-blur-md p-4 md:p-6 rounded-xl border border-outline-variant flex-1 min-w-[140px] md:min-w-[180px]">
      <p className="text-on-surface-variant text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-4">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-xl md:text-2xl font-headline font-bold">{value}<span className="text-xs md:text-sm font-normal text-on-surface-variant ml-1">{unit}</span></span>
        <span className={`material-symbols-outlined text-lg md:text-xl ${iconColor}`}>{icon}</span>
      </div>
    </div>
  );
}

function SecondaryCard({ siteName, data, tag, tagColor, tagBg, onClick, mappings }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface-container-high rounded-xl p-4 md:p-8 border border-white/5 relative group hover:bg-surface-container-highest transition-all cursor-pointer h-full flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-4 md:mb-10">
        <div>
          <span className={`inline-block px-2 py-0.5 ${tagBg} ${tagColor} text-[9px] font-bold rounded-full mb-2 uppercase tracking-tighter`}>{tag}</span>
          <h4 className="text-xl md:text-3xl font-black font-headline tracking-tighter leading-none">{siteName}</h4>
        </div>
        <div className="text-right">
          <div className="text-2xl md:text-4xl font-headline font-bold text-on-surface">{fmt(data.temperature, 0)}°C</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        {mappings
          .filter(m => {
            const key = toCamel(m.alias);
            return ['humidity', 'windSpeed', 'lux'].includes(key) && data[key] != null;
          })
          .map(m => {
            const camelKey = toCamel(m.alias);
            const meta = getSensorMeta(camelKey);
            const decimals = (camelKey.includes('Speed') || camelKey.includes('Quantity') || camelKey.includes('Rate')) ? 1 : 0;
            return (
              <div key={camelKey} className="bg-surface-container-low p-2 md:p-4 rounded-lg flex items-center justify-between">
                <span className={`material-symbols-outlined text-[12px] md:text-sm ${meta.color}`}>{meta.icon}</span>
                <div className="text-right ml-2">
                  <p className="text-[8px] md:text-[10px] text-on-surface-variant uppercase font-bold leading-none">{meta.label}</p>
                  <p className="text-[10px] md:text-sm font-headline font-bold">{fmt(data[camelKey], decimals)}{meta.unit}</p>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}

export function buildTrendDatasets(rows, field, stations, hours = 6, interval = 30, liveLatest = null) {
  const nbMins = parseInt(hours, 10) * 60;
  const now = new Date();
  
  // Arrondir à l'intervalle le plus proche
  const remainder = now.getMinutes() % interval;
  now.setMinutes(now.getMinutes() - remainder, 0, 0);

  const bucketSet = [];
  const steps = Math.floor(nbMins / interval);
  
  // Créer l'axe de temps complet, jusqu'à maintenant
  for (let i = steps - 1; i >= 0; i--) {
    bucketSet.push(new Date(now.getTime() - i * interval * 60000).toISOString());
  }
  // Ajouter un label "Maintenant" pour le point live
  bucketSet.push('now');

  // Déduire la clé live à partir de la clé agrégée (ex: temperatureAvg → temperature)
  const liveField = field.replace(/(Avg|Min|Max)$/, '');

  const datasets = stations.map(station => {
    const siteRows = rows.filter(r => String(r.siteId) === String(station.id));
    const byBucket = {};
    siteRows.forEach(r => {
      const raw = r.bucket || '';
      const d = new Date(raw.includes('Z') || raw.includes('+') ? raw : String(raw).replace(' ', 'T') + 'Z');
      const r_rem = d.getMinutes() % interval;
      d.setMinutes(d.getMinutes() - r_rem, 0, 0);
      byBucket[d.toISOString()] = r[field];
    });

    // Valeur live pour le dernier point
    const liveVal = liveLatest?.[station.id]?.[liveField] ?? null;

    return {
      label: station.name,
      data: bucketSet.map(b => b === 'now' ? liveVal : (byBucket[b] ?? null)),
      borderColor: station.color,
      backgroundColor: station.color + '22',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      spanGaps: true,
    };
  });
  return {
    labels: bucketSet.map((b, i) => i === bucketSet.length - 1 ? 'Maintenant' : b),
    datasets
  };
}

export function buildCompareDatasets(rows, field, stations, hours = 24, latest = null) {
  const nbHours = parseInt(hours, 10);
  const now = new Date();
  now.setMinutes(0, 0, 0, 0);

  const hourSet = [];
  for (let i = nbHours - 1; i >= 0; i--) {
    hourSet.push(new Date(now.getTime() - i * 3600000).toISOString());
  }

  const FIELD_MAP = {
    temperatureAvg: 'temperature',
    humidityAvg: 'humidity',
    pressureAvg: 'pressure',
    luxAvg: 'lux',
    windSpeedAvg: 'windSpeed',
    windDirectionAvg: 'windDirection',
    rainQuantityAvg: 'rainQuantity',
    gustSpeedAvg: 'gustSpeed',
    gustMinAvg: 'gustMin',
    rainRateAvg: 'rainRate'
  };
  const latestField = FIELD_MAP[field] || field;

  const datasets = stations.map(station => {
    const siteRows = rows.filter(r => String(r.siteId) === String(station.id));
    const byHour = {};
    siteRows.forEach(r => {
      const raw = r.hourStart || r.hour_start || r.hour || '';
      const d = new Date(raw.includes('Z') || raw.includes('+') ? raw : String(raw).replace(' ', 'T') + 'Z');
      d.setMinutes(0,0,0,0);
      byHour[d.toISOString()] = r[field];
    });

    return {
      label: station.name,
      data: hourSet.map((h, idx) => {
        // Remplacer la dernière valeur par la donnée en temps réel (Maintenant)
        if (idx === hourSet.length - 1 && latest) {
          const stLatest = latest.find(l => String(l.siteId) === String(station.id));
          if (stLatest && stLatest[latestField] != null) {
            return stLatest[latestField];
          }
        }
        return byHour[h] ?? null;
      }),
      borderColor: station.color,
      backgroundColor: station.color + '22',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      spanGaps: true,
    };
  });
  return { labels: hourSet, datasets };
}

