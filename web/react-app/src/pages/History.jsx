import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (site) {
      handleLoad();
      const timer = setInterval(handleLoad, 60_000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, hours]);

  async function handleLoad() {
    try {
      const [data, latestRows] = await Promise.all([
        apiFetch(ROUTES.history(site, hours)),
        apiFetch(ROUTES.latest)
      ]);
      
      const stLatest = latestRows.find(l => String(l.site_id) === String(site));
      const nbHours = parseInt(hours, 10);
      const now = new Date();
      now.setMinutes(0, 0, 0, 0); // On s'aligne sur l'heure pleine actuelle

      const dataMap = {};
      data.forEach(r => {
        const d = new Date(r.hour_start);
        const key = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}h`;
        dataMap[key] = r;
      });

      const labels = [];
      const rows = [];

      // On crée un tableau parfait allant de `Maintenant - X heures` à `Maintenant`
      for (let i = nbHours - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600000);
        const key = `${t.getDate()}/${t.getMonth()+1} ${t.getHours()}h`;
        
        const isLast = i === 0;
        labels.push(isLast ? "Maintenant" : key);
        
        if (isLast && stLatest) {
          rows.push({
            hour_start: t.toISOString(),
            temp_avg: stLatest.temperature,
            humidity_avg: stLatest.humidity,
            pressure_avg: stLatest.pressure,
            wind_speed_avg: stLatest.wind_speed,
            rain_quantity_avg: stLatest.rain_quantity
          });
        } else if (dataMap[key]) {
          rows.push(dataMap[key]);
        } else {
          // Point de donnée "vide" si le capteur n'a rien envoyé
          rows.push({
            hour_start: t.toISOString(),
            temp_avg: null,
            humidity_avg: null,
            pressure_avg: null,
            wind_speed_avg: null,
            rain_quantity_avg: null
          });
        }
      }

      setCharts({ labels, rows });
    } catch (e) {
      console.warn('History load failed:', e.message);
    }
  }

  function exportCSV() {
    if (!charts || !charts.rows) return;

    const headers = ['Date', 'Heure', 'Température (°C)', 'Humidité (%)', 'Pression (hPa)', 'Vent (km/h)', 'Pluie (mm)'];
    const csvRows = [headers.join(';')];

    charts.rows.forEach(r => {
      let dateStr = '';
      let timeStr = '';
      if (r.hour_start) {
        const d = new Date(r.hour_start);
        if (!isNaN(d)) {
          dateStr = d.toLocaleDateString('fr-FR');
          timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } else {
          dateStr = r.hour_start;
        }
      }
      
      const rowData = [
        dateStr,
        timeStr,
        r.temp_avg !== null ? r.temp_avg : '',
        r.humidity_avg !== null ? r.humidity_avg : '',
        r.pressure_avg !== null ? r.pressure_avg : '',
        r.wind_speed_avg !== null ? r.wind_speed_avg : '',
        r.rain_quantity_avg !== null ? r.rain_quantity_avg : ''
      ];
      
      // Conversion des points en virgules pour l'ouverture native dans Excel (FR)
      const localizedRow = rowData.map(val => String(val).replace('.', ','));
      csvRows.push(localizedRow.join(';'));
    });

    // \uFEFF est le BOM (Byte Order Mark) pour forcer Excel à lire en UTF-8
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_station_${site}_${hours}h.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const xAxisTicks = {
    maxRotation: 0,
    autoSkip: false,
    callback: function(val, idx, ticks) {
      const limit = typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10;
      const step = Math.ceil(ticks.length / limit);
      const isLast = idx === ticks.length - 1;
      const isFirst = idx === 0;
      
      if (isLast || isFirst || idx % step === 0) {
        return this.getLabelForValue(val);
      }
      return null;
    }
  };
  const hasMetric = (key) => charts?.rows?.some(r => r[key] !== null);

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
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button className="bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface border border-outline-variant font-bold rounded-lg px-6 py-2.5 transition-colors shadow-sm flex items-center justify-center gap-2 flex-1 md:flex-none" onClick={exportCSV}>
            <span className="material-symbols-outlined text-lg">download</span>
            Exporter Excel (CSV)
          </button>
        </div>
      </div>

      {charts && (
        <div className="grid grid-cols-1 gap-6 relative z-10 mb-8">
          {/* Temp & Hum Section */}
          {(hasMetric('temp_avg') || hasMetric('humidity_avg')) && (
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
              <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">
                {[hasMetric('temp_avg') && 'Température', hasMetric('humidity_avg') && 'Humidité'].filter(Boolean).join(' & ')}
              </h3>
              <div className="relative h-[300px] w-full grow">
                <WeatherChart
                  labels={charts.labels}
                  datasets={[
                    hasMetric('temp_avg') && {
                      label: 'Température (°C)',
                      data: charts.rows.map(r => r.temp_avg),
                      borderColor: '#f97316', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yT',
                    },
                    hasMetric('humidity_avg') && {
                      label: 'Humidité (%)',
                      data: charts.rows.map(r => r.humidity_avg),
                      borderColor: '#38bdf8', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yH',
                    },
                  ].filter(Boolean)}
                  options={{
                    scales: {
                      x: { ticks: xAxisTicks },
                      yT: { display: hasMetric('temp_avg'), position: 'left', title: { display: true, text: '°C', color: '#f97316' }, ticks: { color: '#f97316' }, grace: '5%' },
                      yH: { display: hasMetric('humidity_avg'), position: 'right', title: { display: true, text: '%', color: '#38bdf8' }, ticks: { color: '#38bdf8' }, grid: { drawOnChartArea: false }, grace: '5%' },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Pressure Section */}
          {hasMetric('pressure_avg') && (
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
                      x: { ticks: xAxisTicks },
                      y: { grace: '5%' },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Wind & Rain Section */}
          {(hasMetric('wind_speed_avg') || hasMetric('rain_quantity_avg')) && (
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
              <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">
                {[hasMetric('wind_speed_avg') && 'Vent', hasMetric('rain_quantity_avg') && 'Pluie'].filter(Boolean).join(' & ')}
              </h3>
              <div className="relative h-[300px] lg:h-[400px] w-full grow">
                <WeatherChart
                  labels={charts.labels}
                  datasets={[
                    hasMetric('wind_speed_avg') && {
                      label: 'Vitesse du vent (km/h)',
                      data: charts.rows.map(r => r.wind_speed_avg),
                      borderColor: '#fde047', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yWind',
                    },
                    hasMetric('rain_quantity_avg') && {
                      label: 'Quantité de pluie (mm/min)',
                      data: charts.rows.map(r => r.rain_quantity_avg),
                      borderColor: '#60a5fa', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'yRain',
                    }
                  ].filter(Boolean)}
                  options={{
                    scales: {
                      x: { ticks: xAxisTicks },
                      yWind: { 
                        display: hasMetric('wind_speed_avg'),
                        position: 'left',
                        title: { display: true, text: 'km/h', color: '#fde047' },
                        ticks: { color: '#fde047' },
                        grace: '5%'
                      },
                      yRain: { 
                        display: hasMetric('rain_quantity_avg'),
                        position: 'right',
                        title: { display: true, text: 'mm/min', color: '#60a5fa' },
                        ticks: { color: '#60a5fa' },
                        grid: { drawOnChartArea: false },
                        grace: '5%'
                      }
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
