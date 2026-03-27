import { fmt, timeAgo } from '../api';

export default function StationCard({ siteId, siteName, data }) {
  const isSkeleton = !data;

  const bat = data?.battery_pct ?? 0;
  const batColor = bat > 50 ? '#4ade80' : bat > 20 ? '#facc15' : '#f87171';

  const ageMin = data ? (Date.now() - new Date(data.received_at)) / 60_000 : null;
  const statusText  = ageMin == null ? '' : ageMin < 15 ? '● En Ligne' : '○ Retardé';
  const statusColor = ageMin == null ? '' : ageMin < 15 ? '#4ade80' : '#facc15';

  return (
    <div className={`station-card${isSkeleton ? ' skeleton' : ''}`}>
      <div className="card-header">
        <span className={`site-badge site-${siteId}`}>{siteName}</span>
        <span className="card-status" style={{ color: statusColor }}>{statusText}</span>
      </div>

      <div className="card-metrics">
        <Metric icon="🌡️" value={isSkeleton ? '–' : fmt(data.temperature)} unit="°C"  label="Température" />
        <Metric icon="💧" value={isSkeleton ? '–' : fmt(data.humidity)}    unit="%"   label="Humidité" />
        <Metric icon="🎯" value={isSkeleton ? '–' : fmt(data.pressure, 1)} unit="hPa" label="Pression" />
        <Metric icon="☀️" value={isSkeleton ? '–' : (data.lux != null ? String(data.lux) : '–')} unit="lux" label="Luminosité" />
        <Metric icon="💨" value={isSkeleton ? '–' : fmt(data.wind_speed, 1)} unit="km/h" label="Vitesse vent" />
        <Metric icon="🌬️" value={isSkeleton ? '–' : fmt(data.air_speed, 1)} unit="km/h" label="Vitesse air" />
      </div>

      <div className="card-footer">
        <div className="battery-container">
          <span className="battery-icon">🔋</span>
          <span className="battery-bar">
            <span
              className="battery-fill"
              style={{ width: bat + '%', background: batColor }}
            />
          </span>
        </div>
        <span className="card-time">
          {data ? timeAgo(data.received_at) : ''}
        </span>
      </div>
    </div>
  );
}

function Metric({ icon, value, unit, label }) {
  return (
    <div className="metric">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  );
}
