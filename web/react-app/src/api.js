/**
 * api.js – Utilitaires partagés pour le Weather Network
 */

// ─── Configuration ────────────────────────────────────────────────────────────

export const API_BASE = import.meta.env.VITE_API_URL ;
export const REFRESH_INTERVAL_MS = 60_000;

export const ROUTES = {
  latest: "/api/latest",
  compare: (hours) => `/api/compare?hours=${hours}`,
  trend:   (hours, interval = 30) => `/api/trend?hours=${hours}&interval=${interval}`,
  history: (site, hours) => `/api/history?site=${site}&hours=${hours}`,
  images: (site, limit = 12) =>
    site ? `/api/images?site=${site}&limit=${limit}` : `/api/images?limit=${limit}`,
  measurements: (site, limit = 1) => `/api/measurements?site=${site}&limit=${limit}`,
};


const API_ORIGIN = new URL(API_BASE).origin;

// ─── Couleurs / noms / coordonnées des sites ──────────────────────────────────
export const SITE_COLORS = {
  1: "#34d399",  // Nice
  2: "#f97316",  // Mougins
  3: "#a78bfa",  // Grasse
};

export const SITE_NAMES = { 1: "Nice", 2: "Mougins", 3: "Grasse" };

export const SITE_COORDS = {
  1: [43.710173, 7.261953],  // Nice
  2: [43.600000, 7.005000],  // Mougins
  3: [43.658333, 6.925000],  // Grasse
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function apiFetch(path) {
  const url = new URL(path, API_BASE).toString();
  const origin = new URL(url).origin;
  const res = await fetch(url, {
    mode: origin !== window.location.origin ? "cors" : "same-origin",
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export function apiAssetUrl(path) {
  return new URL(path, API_BASE).toString();
}

export function fmt(v, decimals = 1) {
  return v == null ? "–" : Number(v).toFixed(decimals);
}

export function timeAgo(isoString) {
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
