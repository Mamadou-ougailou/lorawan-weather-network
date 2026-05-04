import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ── Gradient fill helper ────────────────────────────────────────
// Crée un dégradé vertical à partir de la couleur de la ligne
function makeGradient(ctx, chartArea, color) {
  if (!chartArea) return color + '33';
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  // Extrait rgb depuis hex ou rgba
  gradient.addColorStop(0,   color + 'aa');
  gradient.addColorStop(0.5, color + '33');
  gradient.addColorStop(1,   color + '00');
  return gradient;
}

// ── Inject gradient plugin ──────────────────────────────────────
const GradientPlugin = {
  id: 'gradientFill',
  beforeUpdate(chart) {
    chart.data.datasets.forEach(ds => {
      if (!ds._baseColor) return;
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(ds));
      if (!meta || !chart.chartArea) return;
      ds.backgroundColor = makeGradient(
        chart.ctx,
        chart.chartArea,
        ds._baseColor,
      );
    });
  },
};

ChartJS.register(GradientPlugin);

// ── WeatherChart ────────────────────────────────────────────────
export default function WeatherChart({ labels, datasets, options = {} }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const textColor  = isDark ? '#8b92a5' : '#64748b';
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const axisColor  = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(0,0,0,0.25)';
  const tooltipBg  = isDark ? 'rgba(15,20,32,0.92)'   : 'rgba(255,255,255,0.96)';
  const tooltipTxt = isDark ? '#e2e8f0' : '#1e293b';
  const tooltipSub = isDark ? '#94a3b8' : '#64748b';

  // Injecter la couleur de base pour le gradient sur chaque dataset
  const enhancedDatasets = datasets.map(ds => ({
    ...ds,
    _baseColor:    ds.borderColor || '#ff9153',
    borderWidth:   ds.borderWidth  ?? 2,
    tension:       ds.tension      ?? 0.4,
    pointRadius:   ds.pointRadius  ?? 0,          // pas de points → ligne pure
    pointHoverRadius: ds.pointHoverRadius ?? 5,
    pointHoverBackgroundColor: ds.borderColor,
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
    fill: ds.fill !== undefined ? ds.fill : true,
  }));

  const BASE_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },

    layout: {
      padding: typeof window !== 'undefined' && window.innerWidth < 640 
        ? { right: 10, left: 0, top: 10, bottom: 0 }
        : { right: 40, left: 20 },
    },
    plugins: {
      legend: {
        display: typeof window !== 'undefined' && window.innerWidth > 480,
        labels: {
          color:       isDark ? '#cbd5e1' : '#334155',
          font:        { family: "'Inter', 'Space Grotesk', sans-serif", size: 12, weight: '600' },
          usePointStyle: true,
          pointStyle:  'circle',
          boxWidth:    8,
          boxHeight:   8,
          padding:     20,
        },
      },
      tooltip: {
        backgroundColor:  tooltipBg,
        borderColor:      isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth:      1,
        titleColor:       tooltipTxt,
        bodyColor:        tooltipSub,
        padding:          { x: 14, y: 10 },
        cornerRadius:     10,
        caretSize:        5,
        titleFont:        { family: "'Inter', sans-serif", size: 12, weight: '700' },
        bodyFont:         { family: "'Inter', sans-serif", size: 12, weight: '500' },
        callbacks: {
          labelColor: ctx => ({
            backgroundColor: ctx.dataset.borderColor,
            borderColor:     ctx.dataset.borderColor,
            borderRadius:    4,
            borderWidth:     0,
          }),
        },
      },
    },

    scales: {
      x: {
        offset: false,
        grid:   { display: false },
        border: {
          display:   true,
          color:     axisColor,
          width:     1.5,
        },
        ticks: {
          color:     textColor,
          font:      { family: "'Inter', sans-serif", size: 10 },
          maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 12,
          padding:   4,
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        grid: {
          color:      gridColor,
          lineWidth:  1,
          borderDash: [4, 6],
          drawTicks:  false,
        },
        border: {
          display:   true,
          color:     axisColor,
          width:     1.5,
        },
        ticks: {
          color:     textColor,
          font:      { family: "'Inter', sans-serif", size: 10 },
          padding:   8,
          maxTicksLimit: typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 6,
        },
      },
    },
  };

  const merged = deepMerge(BASE_OPTIONS, options);

  // ── Auto-adaptabilité stricte des échelles Y ──
  const axisBounds = {};
  datasets.forEach(ds => {
    const axisId = ds.yAxisID || 'y';
    if (!axisBounds[axisId]) axisBounds[axisId] = { min: Infinity, max: -Infinity };
    
    const validData = ds.data.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (validData.length > 0) {
      axisBounds[axisId].min = Math.min(axisBounds[axisId].min, ...validData);
      axisBounds[axisId].max = Math.max(axisBounds[axisId].max, ...validData);
    }
  });

  for (const axisId of Object.keys(axisBounds)) {
    if (axisBounds[axisId].min !== Infinity) {
      const range = axisBounds[axisId].max - axisBounds[axisId].min;
      const margin = range === 0 ? 1 : range * 0.1; // 10% de marge au-dessus et en-dessous
      
      if (!merged.scales[axisId]) merged.scales[axisId] = {};
      
      // On utilise suggestedMin/Max pour laisser Chart.js arrondir proprement les labels (ticks),
      // tout en forçant l'échelle à s'adapter étroitement aux données réelles.
      merged.scales[axisId].suggestedMin = axisBounds[axisId].min - margin;
      merged.scales[axisId].suggestedMax = axisBounds[axisId].max + margin;
    }
  }

  const data   = { labels, datasets: enhancedDatasets };

  return <Line data={data} options={merged} />;
}

// ── Deep merge ──────────────────────────────────────────────────
function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override)) {
    if (
      override[key] && typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key]     && typeof base[key]     === 'object'
    ) {
      out[key] = deepMerge(base[key], override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}
