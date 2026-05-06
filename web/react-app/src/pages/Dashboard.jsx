import { useEffect, useCallback, useMemo } from 'react';
import { useState } from 'react';
import { apiFetch, ROUTES, fmt } from '../api';
import { useStations, useMappings, useLiveData, useWsConnected } from '../StationsContext';
import WeatherChart from '../components/WeatherChart';
import { getSensorMeta, toCamel } from '../utils/sensorMeta';

export default function Dashboard({ refreshSignal }) {
  const stations = useStations();
  const mappings = useMappings();
  const [restLatest, setRestLatest] = useState({});
  const [trendRows, setTrendRows]   = useState(null);
  const [mainStationId, setMainStationId] = useState(null);

  // Données socket temps réel (partagées via context)
  const liveData    = useLiveData();
  const wsConnected = useWsConnected();

  // Socket prend le dessus sur les données REST initiales
  const latest = useMemo(() => {
    const merged = { ...restLatest };
    for (const [siteId, data] of Object.entries(liveData)) {
      merged[siteId] = { ...merged[siteId], ...data };
    }
    return merged;
  }, [restLatest, liveData]);

  const load = useCallback(async () => {
    // Charge les dernières valeurs REST une seule fois (données initiales)
    try {
      const rows = await apiFetch(ROUTES.latest);
      const byId = {};
      rows.forEach(r => { byId[r.siteId] = r; });
      setRestLatest(byId);
    } catch (e) {
      console.warn('Could not load latest measurements:', e.message);
    }

    // Charge le chart historique
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

  // Chargement initial uniquement — les mises à jour arrivent via socket
  useEffect(() => {
    load();
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

  // Variables communes aux stations actives (hors température déjà affichée)
  const commonKeys = useMemo(() => {
    const sensorAliases = mappings
      .map(m => toCamel(m.alias))
      .filter(k => k !== 'temperature');
    // Ne considérer que les stations ayant des données
    const activeStations = stations.filter(st => latest[st.id] && Object.keys(latest[st.id]).length > 0);
    if (!activeStations.length) return sensorAliases.slice(0, 3);
    return sensorAliases.filter(key =>
      activeStations.every(st => latest[st.id][key] != null)
    ).slice(0, 3);
  }, [mappings, stations, latest]);

  const getSiteTag = (st) => {
    // Juste un effet de couleur semi-aléatoire basé sur l'ID pour les tags
    const colors = [
      { color: "text-primary", bg: "bg-primary/10" },
      { color: "text-tertiary", bg: "bg-tertiary/10" },
      { color: "text-secondary", bg: "bg-secondary/10" }
    ];
    return { text: st ? st.name : "Réseau Local", ...colors[(st?.id || 0) % colors.length] };
  };

  const isNight = useMemo(() => {
    // 1. Priorité aux données réelles : si on a un capteur de luminosité (Lux)
    if (sMain.lux !== undefined) {
      return sMain.lux < 50; // Seuil de pénombre
    }

    // 2. Fallback intelligent : calcul basé sur la saison (approximation pour l'Hémisphère Nord)
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth(); // 0-11

    // Heures de coucher/lever approximatives selon les saisons
    // Hiver (Nov, Dec, Jan, Fev) : Nuit de 17h à 8h
    if (month >= 10 || month <= 1) {
      return hour >= 17 || hour < 8;
    }
    // Eté (Mai, Juin, Juil, Aout) : Nuit de 21h à 5h
    if (month >= 4 && month <= 7) {
      return hour >= 21 || hour < 5;
    }
    // Mi-saison (Mars, Avr, Sept, Oct) : Nuit de 19h à 7h
    return hour >= 19 || hour < 7;
  }, [sMain.lux]);

  return (
    <>
      <section className={`relative overflow-hidden rounded-xl p-4 md:p-10 border-l-4 transition-all duration-700 ${
        isNight 
          ? 'bg-slate-900 bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-400 shadow-2xl shadow-indigo-900/20' 
          : 'bg-surface-container-low bg-gradient-to-br from-primary/15 to-transparent border-primary'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div>
            <div className={`flex items-center gap-2 font-bold tracking-widest uppercase text-[10px] md:text-xs mb-2 ${isNight ? 'text-indigo-300' : 'text-primary'}`}>
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isNight ? 'dark_mode' : 'location_on'}
              </span>
              {isNight ? 'Observations Nocturnes' : 'En Direct'}
            </div>
            <h3 className={`text-3xl md:text-6xl font-black font-headline tracking-tighter mb-1 md:mb-2 ${isNight ? 'text-white' : 'text-on-surface'}`}>
              {currentStation?.city || currentStation?.name || 'Inconnu'}
            </h3>
            <p className={`text-sm md:text-base font-medium flex items-center gap-2 ${isNight ? 'text-indigo-200/70' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-sm" style={{ fontSize: 16 }}>schedule</span>
              Heure: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-8 justify-between md:justify-end mt-4 md:mt-0 w-full md:w-auto">
            <div className="text-left md:text-right flex-1">
              <div className={`text-5xl md:text-8xl font-black font-headline tracking-tighter data-glow ${isNight ? 'text-indigo-300' : 'text-primary'}`}>
                {fmt(sMain.temperature, 0)}<span className="text-xl md:text-4xl align-top">°C</span>
              </div>
            </div>
            <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shrink-0">
              <div className={`absolute inset-0 blur-2xl md:blur-3xl rounded-full ${isNight ? 'bg-indigo-500/30' : 'bg-primary/20'}`}></div>
              <span className={`material-symbols-outlined text-7xl md:text-8xl ${isNight ? 'text-indigo-200' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {isNight ? 'bedtime' : 'wb_sunny'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4 mt-6 md:mt-12 relative z-10">
          {[...new Map(
            mappings
              .filter(m => m.alias !== 'temperature' && m.alias !== 'gust_min' && toCamel(m.alias) !== 'gustMin' && sMain[toCamel(m.alias)] != null)
              .map(m => [toCamel(m.alias), m])
          ).values()].map(m => {
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

      {otherIds.length > 0 && (
        <section className="flex md:flex-wrap gap-4 md:gap-6 pb-4 lg:pb-0 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {otherIds.map(id => {
            const st = stations.find(s => s.id === id);
            const tagInfo = getSiteTag(st);
            return (
              <div key={id} className="flex-1 min-w-[85vw] md:min-w-[300px] shrink-0 snap-center md:snap-align-none">
                <SecondaryCard
                  siteName={st && st.city ? st.city : `Station ${id}`}
                  data={latest[id] || {}}
                  tag={tagInfo.text}
                  tagColor={tagInfo.color}
                  tagBg={tagInfo.bg}
                  mappings={mappings}
                  commonKeys={commonKeys}
                  onClick={() => setMainStationId(id)}
                />
              </div>
            );
          })}
        </section>
      )}

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
        <span className="text-xl md:text-2xl font-headline font-bold">{value}<span className="text-xs md:text-sm font-normal text-on-surface-variant">{unit}</span></span>
        <span className={`material-symbols-outlined text-lg md:text-xl ${iconColor}`}>{icon}</span>
      </div>
    </div>
  );
}

function SecondaryCard({ siteName, data, tag, tagColor, tagBg, onClick, mappings, commonKeys }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface-container-high rounded-2xl p-6 border border-white/5 relative group hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full shadow-lg hover:shadow-primary/10"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <span className={`inline-block px-2.5 py-1 ${tagBg} ${tagColor} text-[10px] font-black rounded-lg mb-3 uppercase tracking-wider`}>
            {tag}
          </span>
          <h4 className="text-2xl font-black font-headline tracking-tighter leading-none truncate pr-2">
            {siteName}
          </h4>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black font-headline text-primary">
            {fmt(data.temperature, 0)}<span className="text-sm align-top">°C</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto">
        {commonKeys.filter(k => data[k] != null).slice(0, 3).map(camelKey => {
            const meta = getSensorMeta(camelKey);
            const decimals = (camelKey.includes('Speed') || camelKey.includes('Quantity') || camelKey.includes('Rate')) ? 1 : 0;
            return (
              <div key={camelKey} className="bg-surface-container-low/50 p-2.5 rounded-xl flex flex-col items-center justify-center text-center border border-white/5">
                <span className={`material-symbols-outlined text-sm ${meta.color} mb-1.5`} style={{ fontSize: 18 }}>
                  {meta.icon}
                </span>
                <div className="leading-none">
                  <p className="text-[10px] font-black font-headline text-primary mb-0.5">
                    {fmt(data[camelKey], decimals)}<span className="text-[8px] font-medium ml-0.5">{meta.unit}</span>
                  </p>
                  <p className="text-[8px] text-on-surface-variant uppercase font-bold tracking-tighter opacity-70">
                    {meta.label}
                  </p>
                </div>
              </div>
            );
        })}
      </div>
      
      {/* Visual hint on hover */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-primary text-xl">arrow_forward</span>
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

