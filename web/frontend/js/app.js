/**
 * app.js – Weather Network frontend
 *
 * Fetches data from the REST API (api_server.py) and renders:
 *  - Live station cards (Dashboard)
 *  - Cross-site comparison chart
 *  - Per-station history charts
 *  - Sky image gallery
 *  - Leaflet map with station markers
 */

// ─── Configuration ────────────────────────────────────────────────────────────
// Change this to your API server URL if served from a different origin.
const API_BASE = "http://localhost:5000/";
const REFRESH_INTERVAL_MS = 60_000;  // auto-refresh every 60 s

const ROUTES = {
  latest: "/api/latest",
  compare: (hours) => `/api/compare?hours=${hours}`,
  history: (site, hours) => `/api/history?site=${site}&hours=${hours}`,
  images: (site, limit = 12) =>
    site ? `/api/images?site=${site}&limit=${limit}` : `/api/images?limit=${limit}`,
  measurements: (site, limit = 1) => `/api/measurements?site=${site}&limit=${limit}`,
};

const API_ORIGIN = API_BASE
  ? new URL(API_BASE, window.location.href).origin
  : window.location.origin;
const IS_CROSS_ORIGIN_API = API_ORIGIN !== window.location.origin;

// ─── Site colours (must match CSS variables) ─────────────────────────────────
const SITE_COLORS = {
  1: "#f97316",  // Mougins
  2: "#a78bfa",  // Grasse
  3: "#34d399",  // Nice
};

const SITE_NAMES = { 1: "Mougins", 2: "Grasse", 3: "Nice" };

// ─── Station coordinates ─────────────────────────────────────────────────────
const SITE_COORDS = {
  1: [43.600000,  7.005000],   // Mougins
  2: [43.658333,  6.925000],   // Grasse
  3: [43.710173,  7.261953],   // Nice
};

// ─── Chart registry ──────────────────────────────────────────────────────────
const charts = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const url = API_BASE ? new URL(path, API_BASE).toString() : path;
  const res = await fetch(url, {
    mode: IS_CROSS_ORIGIN_API ? "cors" : "same-origin",
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

function apiAssetUrl(path) {
  return API_BASE ? new URL(path, API_BASE).toString() : path;
}

function fmt(v, decimals = 1) {
  return v == null ? "–" : Number(v).toFixed(decimals);
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  charts[id] = new Chart(ctx, config);
  return charts[id];
}

// ─── Section navigation ──────────────────────────────────────────────────────
function initNavigation() {
  const navLinks  = document.querySelectorAll(".nav-link");
  const sections  = document.querySelectorAll(".section");

  function showSection(name) {
    sections.forEach(s => s.classList.toggle("active", s.id === name));
    navLinks.forEach(l => l.classList.toggle("active", l.dataset.section === name));
    if (name === "map")     initMap();
    if (name === "compare") loadCompare();
  }

  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Handle direct hash navigation
  const hash = location.hash.replace("#", "");
  if (hash) showSection(hash);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const latest = await apiFetch(ROUTES.latest);
    latest.forEach(row => updateCard(row));
    document.getElementById("last-update").textContent =
      "Updated: " + new Date().toLocaleTimeString();
  } catch (e) {
    console.warn("Could not load latest measurements:", e.message);
  }

  // Quick temperature chart (6 h)
  try {
    const data = await apiFetch(ROUTES.compare(6));
    renderCompareChart("chart-temp-6h", data, "temp_avg", "Temperature (°C)", 6);
  } catch (e) {
    console.warn("Could not load 6h chart:", e.message);
  }
}

function updateCard(row) {
  const card = document.querySelector(`.station-card[data-site="${row.site_id}"]`);
  if (!card) return;

  card.classList.remove("skeleton");

  card.querySelector("[data-field='temperature'] .metric-value").textContent =
    fmt(row.temperature);
  card.querySelector("[data-field='humidity']    .metric-value").textContent =
    fmt(row.humidity);
  card.querySelector("[data-field='pressure']    .metric-value").textContent =
    fmt(row.pressure, 1);
  card.querySelector("[data-field='lux']         .metric-value").textContent =
    row.lux != null ? String(row.lux) : "–";

  const bat = row.battery_pct ?? 0;
  const fill = card.querySelector(".battery-fill");
  fill.style.width = bat + "%";
  fill.style.background = bat > 50 ? "#4ade80" : bat > 20 ? "#facc15" : "#f87171";

  card.querySelector(".card-time").textContent = timeAgo(row.received_at);

  const status = card.querySelector(".card-status");
  const ageMin = (Date.now() - new Date(row.received_at)) / 60_000;
  status.textContent = ageMin < 15 ? "● Online" : "○ Delayed";
  status.style.color = ageMin < 15 ? "#4ade80" : "#facc15";
}

// ─── Comparison chart ────────────────────────────────────────────────────────
async function loadCompare() {
  const hours   = document.getElementById("compare-hours").value;
  const varKey  = document.getElementById("compare-var").value;
  try {
    const data = await apiFetch(ROUTES.compare(hours));
    renderCompareChart("chart-compare", data, varKey,
      document.getElementById("compare-var").selectedOptions[0].text, hours);
  } catch (e) {
    console.warn("Compare load failed:", e.message);
  }
}

function renderCompareChart(canvasId, rows, field, label, hours) {
  // Collect unique hours
  const hourSet = [...new Set(rows.map(r => r.hour))].sort();

  const datasets = Object.entries(SITE_NAMES).map(([id, name]) => {
    const siteRows = rows.filter(r => String(r.site_id) === id);
    const byHour = Object.fromEntries(siteRows.map(r => [r.hour, r[field]]));
    return {
      label: name,
      data: hourSet.map(h => byHour[h] ?? null),
      borderColor: SITE_COLORS[id],
      backgroundColor: SITE_COLORS[id] + "22",
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      spanGaps: true,
    };
  });

  makeChart(canvasId, {
    type: "line",
    data: { labels: hourSet, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index" },
      plugins: {
        legend: { labels: { color: "#e2e8f0" } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 12,
            callback(val, idx) {
              const d = new Date(hourSet[idx]);
              return isNaN(d) ? val
                : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            },
          },
          grid: { color: "#334155" },
        },
        y: {
          title: { display: true, text: label, color: "#94a3b8" },
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

// ─── History charts ──────────────────────────────────────────────────────────
async function loadHistory() {
  const site  = document.getElementById("history-site").value;
  const hours = document.getElementById("history-hours").value;
  try {
    const data = await apiFetch(ROUTES.history(site, hours));
    renderHistoryCharts(data);
  } catch (e) {
    console.warn("History load failed:", e.message);
  }
}

function renderHistoryCharts(rows) {
  const labels = rows.map(r => new Date(r.hour_start).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }));

  // Temperature + Humidity
  makeChart("chart-hist-th", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temperature (°C)", data: rows.map(r => r.temp_avg),
          borderColor: "#f97316", fill: false, tension: 0.3, pointRadius: 2, yAxisID: "yT",
        },
        {
          label: "Humidity (%)", data: rows.map(r => r.humidity_avg),
          borderColor: "#38bdf8", fill: false, tension: 0.3, pointRadius: 2, yAxisID: "yH",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index" },
      plugins: { legend: { labels: { color: "#e2e8f0" } } },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 10 }, grid: { color: "#334155" } },
        yT: { position: "left",  title: { display: true, text: "°C", color: "#f97316" },
               ticks: { color: "#f97316" }, grid: { color: "#334155" } },
        yH: { position: "right", title: { display: true, text: "%",  color: "#38bdf8" },
               ticks: { color: "#38bdf8" }, grid: { drawOnChartArea: false } },
      },
    },
  });

  // Pressure
  makeChart("chart-hist-p", {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Pressure (hPa)", data: rows.map(r => r.pressure_avg),
        borderColor: "#a78bfa", fill: false, tension: 0.3, pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e2e8f0" } } },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 10 }, grid: { color: "#334155" } },
        y: { title: { display: true, text: "hPa", color: "#94a3b8" },
             ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
      },
    },
  });
}

// ─── Sky images gallery ──────────────────────────────────────────────────────
async function loadSkyImages() {
  const site = document.getElementById("sky-site").value;
  const url  = ROUTES.images(site, 12);
  const gallery = document.getElementById("sky-gallery");
  gallery.innerHTML = "<p class='placeholder'>Loading…</p>";
  try {
    const images = await apiFetch(url);
    if (!images.length) {
      gallery.innerHTML = "<p class='placeholder'>No images found.</p>";
      return;
    }
    gallery.innerHTML = images.map(img => `
      <div class="sky-card">
        <img src="${apiAssetUrl(img.url)}" alt="Sky from ${img.site_name || "station"}"
             crossorigin="anonymous"
             loading="lazy" onerror="this.style.display='none'" />
        <div class="sky-card-meta">
          <strong>${SITE_NAMES[img.site_id] || "Station " + img.site_id}</strong>
          ${new Date(img.captured_at).toLocaleString()}
        </div>
      </div>
    `).join("");
  } catch (e) {
    gallery.innerHTML = `<p class='placeholder'>Error: ${e.message}</p>`;
  }
}

// ─── Leaflet map ─────────────────────────────────────────────────────────────
let mapInitialised = false;

function initMap() {
  if (mapInitialised) return;
  mapInitialised = true;

  const map = L.map("leaflet-map").setView([43.65, 7.05], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  Object.entries(SITE_COORDS).forEach(([id, coords]) => {
    const marker = L.circleMarker(coords, {
      radius: 10,
      fillColor: SITE_COLORS[id],
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    }).addTo(map);
    marker.bindPopup(`<b>${SITE_NAMES[id]}</b><br>Loading…`);
    marker.on("popupopen", async () => {
      try {
        const rows = await apiFetch(ROUTES.measurements(id, 1));
        if (rows.length) {
          const r = rows[0];
          marker.getPopup().setContent(`
            <b>${SITE_NAMES[id]}</b><br>
            🌡 ${fmt(r.temperature)} °C &nbsp;
            💧 ${fmt(r.humidity)} % <br>
            🔵 ${fmt(r.pressure, 1)} hPa <br>
            <small>${timeAgo(r.received_at)}</small>
          `);
        }
      } catch (_) { /* ignore */ }
    });
  });
}

// ─── Wire-up events ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  loadDashboard();

  document.getElementById("btn-refresh").addEventListener("click", loadDashboard);
  document.getElementById("compare-hours").addEventListener("change", loadCompare);
  document.getElementById("compare-var").addEventListener("change", loadCompare);
  document.getElementById("btn-history-load").addEventListener("click", loadHistory);
  document.getElementById("btn-sky-load").addEventListener("click", loadSkyImages);

  // Auto-refresh dashboard
  setInterval(loadDashboard, REFRESH_INTERVAL_MS);
});
