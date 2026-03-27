import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function WeatherChart({ labels, datasets, options = {} }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 vs slate-500
  const titleColor = isDark ? '#e2e8f0' : '#1e293b'; // slate-200 vs slate-800
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const BASE_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' },
    plugins: {
      legend: { labels: { color: titleColor, font: { family: "'Space Grotesk', sans-serif", weight: 'bold' } } },
    },
    scales: {
      x: {
        ticks: { color: textColor, maxTicksLimit: 12, font: { family: "'Manrope', sans-serif", weight: 'bold' } },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { family: "'Manrope', sans-serif", weight: 'bold' } },
        grid: { color: gridColor },
      },
    },
  };

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
