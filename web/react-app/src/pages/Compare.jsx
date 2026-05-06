import { useState, useEffect } from 'react';
import { apiFetch, ROUTES, fmt } from '../api';
import { useStations, useMappings } from '../StationsContext';
import WeatherChart from '../components/WeatherChart';
import { buildCompareDatasets } from './Dashboard';
import { getSensorMeta, toCamel } from '../utils/sensorMeta';

const PERIOD_OPTIONS = [
  { value: '6',   label: 'Dernières 6h' },
  { value: '24',  label: 'Dernières 24h' },
  { value: '72',  label: '3 derniers jours' },
  { value: '168', label: '7 derniers jours' },
];

export default function Compare() {
  const stations = useStations();
  const [hours,  setHours]  = useState('6');
  const [varKey, setVarKey] = useState('temperatureAvg');
  const [chart,  setChart]  = useState(null);
  const [varOptions, setVarOptions] = useState([
    { value: 'temperatureAvg', label: 'Température' }
  ]);

  const mappings = useMappings();

  useEffect(() => {
    if (mappings && mappings.length > 0) {
      const options = mappings.map(m => {
          const camelAlias = toCamel(m.alias);
          const meta = getSensorMeta(camelAlias);
          return {
              value: camelAlias + 'Avg',
              label: meta.label
          };
      });
      setVarOptions(options);
      setVarKey(prev => options.find(o => o.value === prev) ? prev : options[0].value);
    }
  }, [mappings]);

  useEffect(() => {
    let cancelled = false;
    
    function load() {
      Promise.all([
        apiFetch(ROUTES.compare(hours)),
        apiFetch(ROUTES.latest)
      ])
        .then(([data, latest]) => {
          if (!cancelled) setChart(buildCompareDatasets(data, varKey, stations, hours, latest));
        })
        .catch(e => console.warn('Compare load failed:', e.message));
    }
    
    load();
    const timer = setInterval(load, 60_000);
    
    return () => { 
      cancelled = true; 
      clearInterval(timer);
    };
  }, [hours, varKey, stations]);

  const varLabel = varOptions.find(o => o.value === varKey)?.label ?? '';

  return (
    <section className="animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6">Comparaison inter-sites</h2>
      <div className="bg-surface-container-high rounded-xl p-4 md:p-6 border border-outline-variant flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 sm:items-end mb-8 relative z-20">
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant w-full sm:flex-1 sm:max-w-xs">
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-3 sm:p-2.5 outline-none transition-colors">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant w-full sm:flex-1 sm:max-w-xs">
          Variable :
          <select value={varKey} onChange={e => setVarKey(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-3 sm:p-2.5 outline-none transition-colors">
            {varOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {chart && (
        <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant relative z-10 w-full mb-8 shadow-sm">
          <div className="relative h-[400px] lg:h-[500px] w-full">
            <WeatherChart
              labels={chart.labels}
              datasets={chart.datasets}
              options={{
                plugins: {
                  legend: { 
                    display: true, // Toujours afficher la légende pour la comparaison
                    position: 'top',
                    padding: 10
                  },
                  tooltip: {
                    callbacks: { 
                      title: ctx => {
                        const d = new Date(ctx[0].label);
                        return isNaN(d) ? ctx[0].label : d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                      },
                      label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` 
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      maxRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 10,
                      callback(val, idx, ticks) {
                        const isLast = idx === ticks.length - 1;
                        if (isLast) return "Maintenant";
                        
                        const d = new Date(chart.labels[idx]);
                        if (isNaN(d)) return val;
                        return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}h`;
                      },
                    }
                  },
                  y: { 
                    title: { 
                      display: typeof window !== 'undefined' && window.innerWidth > 640, 
                      text: varLabel, 
                      color: '#94a3b8' 
                    },
                    grace: '5%'
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
