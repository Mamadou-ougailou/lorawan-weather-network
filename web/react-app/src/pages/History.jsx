import { useState, useEffect } from 'react';
import { apiFetch, ROUTES } from '../api';
import { useStations, useMappings } from '../StationsContext';
import WeatherChart from '../components/WeatherChart';
import { getSensorMeta, toCamel } from '../utils/sensorMeta';

const PERIOD_OPTIONS = [
  { value: '24',  label: 'Dernières 24h' },
  { value: '72',  label: '3 derniers jours' },
  { value: '168', label: '7 derniers jours' },
  { value: '720', label: '30 derniers jours' },
];

export default function History() {
  const stations = useStations();
  const mappings = useMappings();
  const [site,  setSite]  = useState(stations.length > 0 ? String(stations[0].id) : '');
  const [hours, setHours] = useState('24');
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    if (!site && stations.length > 0) {
      setSite(String(stations[0].id));
    }
  }, [stations, site]);

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
      
      const stLatest = latestRows.find(l => String(l.siteId) === String(site));
      const nbHours = parseInt(hours, 10);
      const now = new Date();
      now.setMinutes(0, 0, 0, 0); // On s'aligne sur l'heure pleine actuelle

      const dataMap = {};
      data.forEach(r => {
        const raw = r.hourStart || r.hour_start || '';
        const d = new Date(raw.includes('Z') || raw.includes('+') ? raw : raw.replace(' ', 'T') + 'Z');
        d.setMinutes(0, 0, 0, 0);
        dataMap[d.getTime()] = r;
      });

      const labels = [];
      const rows = [];

      for (let i = nbHours - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600000);
        t.setMinutes(0, 0, 0, 0);
        const timestamp = t.getTime();
        
        const isLast = i === 0;
        const displayKey = `${t.getDate()}/${t.getMonth()+1} ${t.getHours()}h`;
        labels.push(isLast ? "Maintenant" : displayKey);
        
        if (isLast && stLatest) {
          const latestData = { hour_start: t.toISOString() };
          mappings.forEach(m => {
            const camelAlias = toCamel(m.alias);
            if (stLatest[camelAlias] != null) {
              latestData[`${camelAlias}Avg`] = stLatest[camelAlias];
            }
          });
          rows.push(latestData);
        } else if (dataMap[timestamp]) {
          rows.push(dataMap[timestamp]);
        } else {
          rows.push({ hour_start: t.toISOString() });
        }
      }

      setCharts({ labels, rows });
    } catch (e) {
      console.warn('History load failed:', e.message);
    }
  }

  function exportCSV() {
    if (!charts || !charts.rows || charts.rows.length === 0) return;

    // Récupérer toutes les clés configurées qui ont au moins une valeur
    const activeKeys = mappings
      .map(m => toCamel(m.alias) + 'Avg')
      .filter(k => charts.rows.some(r => r[k] != null));
    
    const sensorKeys = Array.from(new Set(activeKeys));

    const headers = ['Date', 'Heure', ...sensorKeys.map(k => {
      const meta = getSensorMeta(k);
      return `${meta.label} (${meta.unit.trim()})`;
    })];
    
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
        ...sensorKeys.map(k => r[k] != null ? r[k] : '')
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
    autoSkip: true,
    maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 10,
    callback: function(val, idx, ticks) {
      if (!charts || !charts.labels) return val;
      const d = new Date(charts.labels[idx]);
      if (isNaN(d)) return charts.labels[idx] || val;
      return `${d.getHours()}h${d.getMinutes() === 30 ? '30' : '00'}`;
    }
  };
  const hasMetric = (key) => charts?.rows?.some(r => r[key] != null);

  return (
    <section className="animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6">Données Historiques</h2>

      <div className="bg-surface-container-high rounded-xl p-4 md:p-6 border border-outline-variant flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 sm:items-end mb-8 relative z-20">
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant w-full sm:flex-1 sm:max-w-xs">
          Station :
          <select value={site} onChange={e => setSite(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-3 sm:p-2.5 outline-none transition-colors">
            {stations.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant w-full sm:flex-1 sm:max-w-xs">
          Période :
          <select value={hours} onChange={e => setHours(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-3 sm:p-2.5 outline-none transition-colors">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button
          className="w-full sm:w-auto bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface border border-outline-variant font-bold rounded-lg px-6 py-3 sm:py-2.5 transition-colors shadow-sm flex items-center justify-center gap-2"
          onClick={exportCSV}
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Exporter Excel (CSV)
        </button>
      </div>

      {charts && (
        <div className="grid grid-cols-1 gap-6 relative z-10 mb-8">
          {/* Temp & Hum Section */}
          {(hasMetric('temperatureAvg') || hasMetric('humidityAvg')) && (
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
              <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">
                {[hasMetric('temperatureAvg') && 'Température', hasMetric('humidityAvg') && 'Humidité'].filter(Boolean).join(' & ')}
              </h3>
              <div className="relative h-[300px] w-full grow">
                <WeatherChart
                  labels={charts.labels}
                  datasets={[
                    hasMetric('temperatureAvg') && {
                      label: 'Température (°C)',
                      data: charts.rows.map(r => r.temperatureAvg),
                      borderColor: '#f97316', fill: false, tension: 0.3, pointRadius: 3, yAxisID: 'yT', spanGaps: true,
                    },
                    hasMetric('humidityAvg') && {
                      label: 'Humidité (%)',
                      data: charts.rows.map(r => r.humidityAvg),
                      borderColor: '#38bdf8', fill: false, tension: 0.3, pointRadius: 3, yAxisID: 'yH', spanGaps: true,
                    },
                  ].filter(Boolean)}
                  options={{
                    scales: {
                      x: { ticks: xAxisTicks },
                      yT: { 
                        display: hasMetric('temperatureAvg'), 
                        position: 'left', 
                        title: { 
                          display: typeof window !== 'undefined' && window.innerWidth > 640, 
                          text: '°C', 
                          color: '#f97316' 
                        }, 
                        ticks: { color: '#f97316' }, 
                        grace: '5%' 
                      },
                      yH: { 
                        display: hasMetric('humidityAvg'), 
                        position: 'right', 
                        title: { 
                          display: typeof window !== 'undefined' && window.innerWidth > 640, 
                          text: '%', 
                          color: '#38bdf8' 
                        }, 
                        ticks: { color: '#38bdf8' }, 
                        grid: { drawOnChartArea: false }, 
                        grace: '5%' 
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Pressure Section */}
          {hasMetric('pressureAvg') && (
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
              <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">Pression</h3>
              <div className="relative h-[300px] w-full grow">
                <WeatherChart
                  labels={charts.labels}
                  datasets={[{
                    label: 'Pression (hPa)',
                    data: charts.rows.map(r => r.pressureAvg),
                    borderColor: '#a78bfa', fill: false, tension: 0.3, pointRadius: 3, spanGaps: true,
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
          {(hasMetric('windSpeedAvg') || hasMetric('rainQuantityAvg')) && (
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col">
              <h3 className="text-lg font-headline font-bold tracking-tight text-on-surface mb-6">
                {[hasMetric('windSpeedAvg') && 'Vent', hasMetric('rainQuantityAvg') && 'Pluie'].filter(Boolean).join(' & ')}
              </h3>
              <div className="relative h-[300px] lg:h-[400px] w-full grow">
                <WeatherChart
                  labels={charts.labels}
                  datasets={[
                    hasMetric('windSpeedAvg') && {
                      label: 'Vitesse du vent (km/h)',
                      data: charts.rows.map(r => r.windSpeedAvg),
                      borderColor: '#fde047', fill: false, tension: 0.3, pointRadius: 3, yAxisID: 'yWind', spanGaps: true,
                    },
                    hasMetric('rainQuantityAvg') && {
                      label: 'Quantité de pluie (mm/min)',
                      data: charts.rows.map(r => r.rainQuantityAvg),
                      borderColor: '#60a5fa', fill: false, tension: 0.3, pointRadius: 3, yAxisID: 'yRain', spanGaps: true,
                    }
                  ].filter(Boolean)}
                  options={{
                    scales: {
                      x: { ticks: xAxisTicks },
                      yWind: { 
                        display: hasMetric('windSpeedAvg'), 
                        position: 'left', 
                        title: { 
                          display: typeof window !== 'undefined' && window.innerWidth > 640, 
                          text: 'km/h', 
                          color: '#fde047' 
                        }, 
                        ticks: { color: '#fde047' }, 
                        grace: '5%' 
                      },
                      yRain: { 
                        display: hasMetric('rainQuantityAvg'), 
                        position: 'right', 
                        title: { 
                          display: typeof window !== 'undefined' && window.innerWidth > 640, 
                          text: 'mm', 
                          color: '#f472b6' 
                        }, 
                        ticks: { color: '#f472b6' }, 
                        grid: { drawOnChartArea: false }, 
                        grace: '5%' 
                      },
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
