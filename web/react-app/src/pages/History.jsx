import { useState } from 'react';
import { apiFetch, ROUTES } from '../api';
import { useStations } from '../StationsContext';
import WeatherChart from '../components/WeatherChart';

const PERIOD_OPTIONS = [
  { value: '24',  label: 'Dernières 24h' },
  { value: '72',  label: '3 derniers jours' },
  { value: '168', label: '7 derniers jours' },
  { value: '720', label: '30 derniers jours' },
];

export default function History() {
  const stations = useStations();
  const [site,  setSite]  = useState(stations.length > 0 ? String(stations[0].id) : '');
  const [hours, setHours] = useState('24');
  const [charts, setCharts] = useState(null);

  async function handleLoad() {
    try {
      const data = await apiFetch(ROUTES.history(site, hours));
      const labels = data.map(r => {
        const d = new Date(r.hour_start);
        return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}h`;
      });
      setCharts({ labels, rows: data });
    } catch (e) {
      console.warn('History load failed:', e.message);
    }
  }

  return (
    <section className="animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6">Données Historiques</h2>
      <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant flex flex-wrap gap-6 items-end mb-8 relative z-20">
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant flex-1 min-w-[150px] max-w-xs">
          Station :
          <select value={site} onChange={e => setSite(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-colors">
            {stations.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant flex-1 min-w-[200px] max-w-xs">
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-colors">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button className="bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-lg px-6 py-2.5 transition-colors shadow-lg shadow-primary/30 min-w-[120px]" onClick={handleLoad}>Charger</button>
      </div>

      {charts && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10 mb-8">
          <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
            <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">Température &amp; Humidité</h3>
            <div className="relative h-[300px] w-full grow">
              <WeatherChart
                labels={charts.labels}
                datasets={[
                  {
                    label: 'Température (°C)',
                    data: charts.rows.map(r => r.temp_avg),
                    borderColor: '#f97316', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yT',
                  },
                  {
                    label: 'Humidité (%)',
                    data: charts.rows.map(r => r.humidity_avg),
                    borderColor: '#38bdf8', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yH',
                  },
                ]}
                options={{
                  scales: {
                    x: { offset: true, ticks: { maxRotation: 0, maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    yT: {
                      position: 'left',
                      title: { display: true, text: '°C', color: '#f97316' },
                      ticks: { color: '#f97316' },
                      grace: '5%'
                    },
                    yH: {
                      position: 'right',
                      title: { display: true, text: '%', color: '#38bdf8' },
                      ticks: { color: '#38bdf8' },
                      grid: { drawOnChartArea: false },
                      grace: '5%'
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
            <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">Pression</h3>
            <div className="relative h-[300px] w-full grow">
              <WeatherChart
                labels={charts.labels}
                datasets={[{
                  label: 'Pression (hPa)',
                  data: charts.rows.map(r => r.pressure_avg),
                  borderColor: '#a78bfa', fill: false, tension: 0.3, pointRadius: 2,
                }]}
                options={{
                  scales: {
                    x: { offset: true, ticks: { maxRotation: 0, maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    y: { title: { display: true, text: 'hPa' }, grace: '5%' },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col xl:col-span-2">
            <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">Vent & Pluie</h3>
            <div className="relative h-[300px] lg:h-[400px] w-full grow">
              <WeatherChart
                labels={charts.labels}
                datasets={[
                  {
                    label: 'Vitesse vent (km/h)',
                    data: charts.rows.map(r => r.wind_speed_avg),
                    borderColor: '#fde047', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yWind',
                  },
                  {
                    label: 'Vitesse pluie (mm/min)',
                    data: charts.rows.map(r => r.rain_quantity_avg),
                    borderColor: '#60a5fa', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yRain',
                  }
                ]}
                options={{
                  scales: {
                    x: { offset: true, ticks: { maxRotation: 0, maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    yWind: { 
                      position: 'left',
                      title: { display: true, text: 'km/h', color: '#fde047' },
                      ticks: { color: '#fde047' },
                      grace: '5%'
                    },
                    yRain: {
                      position: 'right',
                      title: { display: true, text: 'mm/min', color: '#60a5fa' },
                      ticks: { color: '#60a5fa' },
                      grid: { drawOnChartArea: false },
                      grace: '5%'
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
