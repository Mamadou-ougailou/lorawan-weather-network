import { useState, useEffect } from 'react';
import { apiFetch, ROUTES, SITE_NAMES, SITE_COLORS, fmt } from '../api';
import WeatherChart from '../components/WeatherChart';
import { buildCompareDatasets } from './Dashboard';

const PERIOD_OPTIONS = [
  { value: '6',   label: 'Dernières 6h' },
  { value: '24',  label: 'Dernières 24h' },
  { value: '72',  label: '3 derniers jours' },
  { value: '168', label: '7 derniers jours' },
];

const VAR_OPTIONS = [
  { value: 'temp_avg',       label: 'Température (°C)' },
  { value: 'humidity_avg',   label: 'Humidité (%)' },
  { value: 'pressure_avg',   label: 'Pression (hPa)' },
  { value: 'lux_avg',        label: 'Luminosité (lux)' },
  { value: 'wind_speed_avg', label: 'Vitesse vent (km/h)' },
  { value: 'rain_speed_avg',  label: 'Vitesse pluie (mm/min)' },
];

export default function Compare() {
  const [hours,  setHours]  = useState('24');
  const [varKey, setVarKey] = useState('temp_avg');
  const [chart,  setChart]  = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(ROUTES.compare(hours))
      .then(data => {
        if (!cancelled) setChart(buildCompareDatasets(data, varKey));
      })
      .catch(e => console.warn('Compare load failed:', e.message));
    return () => { cancelled = true; };
  }, [hours, varKey]);

  const varLabel = VAR_OPTIONS.find(o => o.value === varKey)?.label ?? '';

  return (
    <section className="animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6">Comparaison inter-sites</h2>
      <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant flex flex-wrap gap-6 items-end mb-8 relative z-20">
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant flex-1 min-w-[200px] max-w-xs">
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-colors">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant flex-1 min-w-[200px] max-w-xs">
          Variable :
          <select value={varKey} onChange={e => setVarKey(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-colors">
            {VAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                  tooltip: {
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` },
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 6 : 12,
                      callback(val, idx) {
                        const d = new Date(chart.labels[idx]);
                        return isNaN(d) ? val
                          : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      },
                    },
                  },
                  y: { title: { display: true, text: varLabel } },
                },
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
