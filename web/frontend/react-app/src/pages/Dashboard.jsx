import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ROUTES, SITE_COLORS, SITE_NAMES, fmt } from '../api';
import StationCard from '../components/StationCard';
import WeatherChart from '../components/WeatherChart';

export default function Dashboard({ refreshSignal }) {
  const [latest, setLatest] = useState({});       // { siteId: row }
  const [chart6h, setChart6h] = useState(null);   // { labels, datasets }

  const load = useCallback(async () => {
    // Station cards
    try {
      const rows = await apiFetch(ROUTES.latest);
      const byId = {};
      rows.forEach(r => { byId[r.site_id] = r; });
      setLatest(byId);
    } catch (e) {
      console.warn('Could not load latest measurements:', e.message);
    }

    // Température 6h
    try {
      const data = await apiFetch(ROUTES.compare(6));
      setChart6h(buildCompareDatasets(data, 'temp_avg'));
    } catch (e) {
      console.warn('Could not load 6h chart:', e.message);
    }
  }, []);

  // Chargement initial + auto-refresh
  useEffect(() => { load(); }, [load, refreshSignal]);

  return (
    <section>
      <h2 className="section-title">Aperçu météo en direct</h2>

      <div className="station-grid">
        {[1, 2, 3].map(id => (
          <StationCard
            key={id}
            siteId={id}
            siteName={SITE_NAMES[id]}
            data={latest[id] ?? null}
          />
        ))}
      </div>

      {chart6h && (
        <div className="chart-box">
          <div className="chart-header">
            <h3>Température – 6 dernières heures</h3>
          </div>
          <div className="chart-container">
            <WeatherChart
              labels={chart6h.labels}
              datasets={chart6h.datasets}
              options={{
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 6 : 12,
                      callback: function(val, idx) {
                        const d = new Date(chart6h.labels[idx]);
                        return isNaN(d) ? val : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    }
                  },
                  y: { title: { display: true, text: 'Température (°C)', color: '#94a3b8' } },
                },
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function buildCompareDatasets(rows, field) {
  const hourSet = [...new Set(rows.map(r => r.hour))].sort();
  const datasets = Object.entries(SITE_NAMES).map(([id, name]) => {
    const siteRows = rows.filter(r => String(r.site_id) === id);
    const byHour = Object.fromEntries(siteRows.map(r => [r.hour, r[field]]));
    return {
      label: name,
      data: hourSet.map(h => byHour[h] ?? null),
      borderColor: SITE_COLORS[id],
      backgroundColor: SITE_COLORS[id] + '22',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      spanGaps: true,
    };
  });
  return { labels: hourSet, datasets };
}
