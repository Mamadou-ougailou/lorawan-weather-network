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
  { value: 'air_speed_avg',  label: 'Vitesse air (km/h)' },
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
    <section>
      <h2 className="section-title">Comparaison inter-sites</h2>
      <div className="controls">
        <label>
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)}>
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          Variable :
          <select value={varKey} onChange={e => setVarKey(e.target.value)}>
            {VAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {chart && (
        <div className="chart-box">
          <div className="chart-container">
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
                  y: { title: { display: true, text: varLabel, color: '#94a3b8' } },
                },
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
