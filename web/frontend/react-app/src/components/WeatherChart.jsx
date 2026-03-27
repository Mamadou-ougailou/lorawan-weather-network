import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' },
  plugins: {
    legend: { labels: { color: '#e2e8f0' } },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', maxTicksLimit: 12 },
      grid: { color: '#334155' },
    },
    y: {
      ticks: { color: '#94a3b8' },
      grid: { color: '#334155' },
    },
  },
};


export default function WeatherChart({ labels, datasets, options = {} }) {
  const merged = deepMerge(BASE_OPTIONS, options);
  const data = { labels, datasets };

  return <Line data={data} options={merged} />;
}

// Fusion récursive simple
function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override)) {
    if (
      override[key] &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === 'object'
    ) {
      out[key] = deepMerge(base[key], override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}
