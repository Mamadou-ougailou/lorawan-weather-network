/**
 * adminApi.js – All admin API functions (GET + mutations)
 * Uses the same API_BASE as the main app.
 */
import { API_BASE } from '../api';

async function _fetch(path) {
  const url = new URL(path, API_BASE).toString();
  const res = await fetch(url, {
    mode: new URL(url).origin !== window.location.origin ? 'cors' : 'same-origin',
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function _mutate(path, method, body) {
  const url = new URL(path, API_BASE).toString();
  const res = await fetch(url, {
    method,
    mode: new URL(url).origin !== window.location.origin ? 'cors' : 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status);
    throw new Error(`API ${method} ${path} → ${res.status}: ${msg}`);
  }
  return res.json().catch(() => ({}));
}

// ── Stations ─────────────────────────────────────────────────────────────────
export const fetchStations    = ()          => _fetch('/api/stations');
export const createStation    = (data)      => _mutate('/api/stations', 'POST', data);
export const updateStation    = (id, data)  => _mutate(`/api/stations/${id}`, 'PATCH', data);
export const deleteStation    = (id)        => _mutate(`/api/stations/${id}`, 'DELETE');

// ── Alerts ───────────────────────────────────────────────────────────────────
export const fetchAlerts      = ()          => _fetch('/api/alerts');
export const resolveAlert     = (id)        => _mutate(`/api/alerts/${id}`, 'PUT', {});
export const deleteAlert      = (id)        => _mutate(`/api/alerts/${id}`, 'DELETE');

// ── Mappings ─────────────────────────────────────────────────────────────────
export const fetchMappings    = ()          => _fetch('/api/mappings');
export const createMapping    = (data)      => _mutate('/api/mappings', 'POST', data);
export const updateMapping    = (id, data)  => _mutate(`/api/mappings/${id}`, 'PATCH', data);
export const deleteMapping    = (id)        => _mutate(`/api/mappings/${id}`, 'DELETE');

// ── Measurements ──────────────────────────────────────────────────────────────
export const fetchLatest      = ()                        => _fetch('/api/latest');
export const fetchMeasurements = (site, limit = 50)      => _fetch(`/api/measurements?site=${site}&limit=${limit}`);
export const deleteMeasurement = (id)                    => _mutate(`/api/measurements/${id}`, 'DELETE');
export const fetchTrend       = (hours = 24, interval = 30) => _fetch(`/api/trend?hours=${hours}&interval=${interval}`);

// ── History & compare ────────────────────────────────────────────────────────
export const fetchHistory     = (site, hours)  => _fetch(`/api/history?site=${site}&hours=${hours}`);
export const fetchCompare     = (hours = 24)   => _fetch(`/api/compare?hours=${hours}`);

// ── Live cache ───────────────────────────────────────────────────────────────
export const fetchLive        = ()             => _fetch('/api/live');
