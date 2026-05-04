// ─── Core utility ────────────────────────────────────────────────────────────

function toCamel(str) {
    return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

function camelKeys(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
        out[toCamel(key)] = val;
    }
    return out;
}

import * as mappingsService from "./components/mappings/mappings.service.js";

// Build SQL fragments for aggregation queries (used by history/trend routes)
export function buildAggregateSQL(tableAlias = "m") {
    const fields = mappingsService.getCachedMappings();
    if (fields.length === 0) return "1"; // Fallback to avoid SQL syntax error if DB is empty
    return fields.map(({ raw, alias }) => [
        `ROUND(AVG(JSON_EXTRACT(${tableAlias}.readings, '$.${raw}')), 2) AS ${alias}_avg`,
        `MIN(JSON_EXTRACT(${tableAlias}.readings, '$.${raw}'))           AS ${alias}_min`,
        `MAX(JSON_EXTRACT(${tableAlias}.readings, '$.${raw}'))           AS ${alias}_max`,
    ].join(",\n      ")).join(",\n      ");
}

// Lighter version for trend (only avg, no min/max)
export function buildTrendSQL(tableAlias = "m") {
    const fields = mappingsService.getCachedMappings();
    if (fields.length === 0) return "1"; // Fallback
    return fields.map(({ raw, alias }) =>
        `ROUND(AVG(JSON_EXTRACT(${tableAlias}.readings, '$.${raw}')), 2) AS ${alias}_avg`
    ).join(",\n      ");
}

// ─── DTO mappers ─────────────────────────────────────────────────────────────

export function toMeasurementDTO(row) {
    const readings = typeof row.readings === "string"
        ? JSON.parse(row.readings)
        : (row.readings || {});

    const { readings: _, ...meta } = row;
    const dto = camelKeys(meta);

    // Rename raw payload keys → clean aliases using the active mappings
    // Keys without an active mapping are hidden from the response
    const fields = mappingsService.getCachedMappings();
    const aliasMap = Object.fromEntries(fields.map(f => [f.raw, f.alias]));
    for (const [key, val] of Object.entries(readings)) {
        if (aliasMap[key]) {
            dto[aliasMap[key]] = val;
        }
    }

    return dto;
}

export function toSiteDTO(row) {
    return camelKeys(row);
}

export function toTrendDTO(row) {
    return camelKeys(row);
}

