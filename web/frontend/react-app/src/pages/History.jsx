import { useState } from 'react';
import { apiFetch, ROUTES } from '../api';
import WeatherChart from '../components/WeatherChart';

const SITE_OPTIONS = [
  { value: '1', label: 'Mougins' },
  { value: '2', label: 'Grasse' },
  { value: '3', label: 'Nice' },
];

const PERIOD_OPTIONS = [
  { value: '24',  label: 'Dernières 24h' },
  { value: '72',  label: '3 derniers jours' },
  { value: '168', label: '7 derniers jours' },
  { value: '720', label: '30 derniers jours' },
];

export default function History() {
  const [site,  setSite]  = useState('1');
  const [hours, setHours] = useState('24');
  const [charts, setCharts] = useState(null);

  async function handleLoad() {
    try {
      const data = await apiFetch(ROUTES.history(site, hours));
      const labels = data.map(r =>
        typeof window !== 'undefined' && window.innerWidth < 640
          ? new Date(r.hour_start).toLocaleString([], { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
          : new Date(r.hour_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      );
      setCharts({ labels, rows: data });
    } catch (e) {
      console.warn('History load failed:', e.message);
    }
  }

  return (
    <section>
      <h2 className="section-title">Données Historiques</h2>
      <div className="controls">
        <label>
          Station :
          <select value={site} onChange={e => setSite(e.target.value)}>
            {SITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)}>
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button className="btn" onClick={handleLoad}>Charger</button>
      </div>

      {charts && (
        <div className="chart-row">
          <div className="chart-box half">
            <div className="chart-header">
              <h3>Température &amp; Humidité</h3>
            </div>
            <div className="chart-container">
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
                    x: { ticks: { maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    yT: {
                      position: 'left',
                      title: { display: true, text: '°C', color: '#f97316' },
                      ticks: { color: '#f97316' },
                      grid: { color: '#334155' },
                    },
                    yH: {
                      position: 'right',
                      title: { display: true, text: '%', color: '#38bdf8' },
                      ticks: { color: '#38bdf8' },
                      grid: { drawOnChartArea: false },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="chart-box half">
            <div className="chart-header">
              <h3>Pression</h3>
            </div>
            <div className="chart-container">
              <WeatherChart
                labels={charts.labels}
                datasets={[{
                  label: 'Pression (hPa)',
                  data: charts.rows.map(r => r.pressure_avg),
                  borderColor: '#a78bfa', fill: false, tension: 0.3, pointRadius: 2,
                }]}
                options={{
                  scales: {
                    x: { ticks: { maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    y: { title: { display: true, text: 'hPa', color: '#94a3b8' } },
                  },
                }}
              />
            </div>
          </div>
          <div className="chart-box full">
            <div className="chart-header">
              <h3>Vents & Air</h3>
            </div>
            <div className="chart-container">
              <WeatherChart
                labels={charts.labels}
                datasets={[
                  {
                    label: 'Vitesse vent (km/h)',
                    data: charts.rows.map(r => r.wind_speed_avg),
                    borderColor: '#fde047', fill: false, tension: 0.3, pointRadius: 2,
                  },
                  {
                    label: 'Vitesse air (km/h)',
                    data: charts.rows.map(r => r.air_speed_avg),
                    borderColor: '#fca5a5', fill: false, tension: 0.3, pointRadius: 2,
                  }
                ]}
                options={{
                  scales: {
                    x: { ticks: { maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10 } },
                    y: { title: { display: true, text: 'km/h', color: '#94a3b8' } },
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
