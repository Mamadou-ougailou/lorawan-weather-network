/**
 * mqttBridge.js  –  MQTT → Socket.IO real-time bridge
 *
 * Connects to the university's MQTT broker, extracts sensor readings
 * from TTN uplink messages, and pushes them to frontend clients via Socket.IO.
 *
 * Sensor keys are translated using the dynamic alias mappings (same as the REST API).
 */

import mqtt from "mqtt";
import config from "./config.js";
import { toMeasurementDTO } from "./dto.js";

// Cache for the latest live payloads (for the /api/live endpoint)
export const liveCache = {};

// Keys that are metadata, not sensor readings
const META_KEYS = new Set([
    "site_id", "dev_eui", "f_cnt", "rssi", "snr",
    "received_at", "raw_payload",
    "end_device_ids", "uplink_message", "correlation_ids",
    "simulated", "confirmed",
]);

/**
 * Parse a comma-separated "topic=siteId" string into a Map.
 */
function parseTopicMap(topicsStr) {
    const map = new Map();
    for (const entry of topicsStr.split(",")) {
        const eqIdx = entry.lastIndexOf("=");
        if (eqIdx === -1) continue;
        const topic  = entry.slice(0, eqIdx).trim();
        const siteId = parseInt(entry.slice(eqIdx + 1).trim(), 10);
        if (topic && !isNaN(siteId)) map.set(topic, siteId);
    }
    return map;
}

/**
 * Extract sensor readings from a source dict by removing metadata keys.
 * Everything left is a sensor reading — no hardcoded field names.
 */
function extractReadings(source) {
    const readings = {};
    for (const [key, val] of Object.entries(source)) {
        if (!META_KEYS.has(key) && val != null) {
            readings[key] = val;
        }
    }
    return readings;
}

/**
 * Parse a raw MQTT payload into a flat object for the frontend.
 */
function parsePayload(raw, siteId) {
    let readings;
    let meta;

    // Full TTN v3 format
    if (raw.uplink_message?.decoded_payload) {
        const decoded = raw.uplink_message.decoded_payload;
        const rx = raw.uplink_message.rx_metadata?.[0] ?? {};
        readings = extractReadings(decoded.sensors ?? decoded);
        meta = {
            siteId:     siteId,
            receivedAt: new Date().toISOString(),
            dev_eui:     raw.end_device_ids?.dev_eui ?? null,
            f_cnt:       raw.uplink_message.f_cnt ?? null,
            rssi:        rx.rssi ?? null,
            snr:         rx.snr ?? null,
        };
    }
    else {
        return null;
    }

    if (Object.keys(readings).length === 0) return null;

    return { ...meta, readings };
}

/**
 * Start the MQTT bridge.
 * @param {import("socket.io").Server} io
 */
export function startMqttBridge(io) {
    const { host, port, tls, username, password, clientId, topics } = config.mqtt;
    const topicMap = parseTopicMap(topics);

    if (topicMap.size === 0) {
        console.warn("[MQTT] No topics configured – bridge disabled.");
        return;
    }

    const protocol = (port === 443) ? (tls ? "wss" : "ws") : (tls ? "mqtts" : "mqtt");
    const brokerUrl = `${protocol}://${host}:${port}`;

    // Add a random suffix to avoid "Client ID already in use" if a previous connection is hanging
    const finalClientId = `${clientId}-${Math.random().toString(16).slice(2, 8)}`;

    console.log(`[MQTT] Connecting to ${brokerUrl} as "${finalClientId}"…`);

    const client = mqtt.connect(brokerUrl, {
        clientId: finalClientId,
        username,
        password,
        rejectUnauthorized: false,
        keepalive: 60,
        reconnectPeriod: 5_000,
        connectTimeout: 30_000,
        clean: true
    });

    client.on("error", (err) => {
        console.error("[MQTT] Error:", err.message);
    });

    client.on("close", () => {
        console.log("[MQTT] Connection closed");
    });

    client.on("offline", () => {
        console.warn("[MQTT] Offline");
    });

    client.on("connect", () => {
        console.log("[MQTT] ✓ Connected to broker");
        const topicList = [...topicMap.keys()];
        client.subscribe(topicList, { qos: 1 }, (err) => {
            if (err) {
                console.error("[MQTT] Subscribe error:", err.message);
            } else {
                console.log(`[MQTT] Subscribed to ${topicList.length} topic(s):`);
                topicList.forEach(t => console.log(`  • ${t}`));
            }
        });
    });

    client.on("error",     (err) => console.error("[MQTT] Error:", err.message));
    client.on("reconnect", ()    => console.log("[MQTT] Reconnecting…"));
    client.on("offline",   ()    => console.warn("[MQTT] Offline"));

    client.on("message", (topic, message) => {
        try {
            const raw    = JSON.parse(message.toString());
            const siteId = topicMap.get(topic);
            const parsed = parsePayload(raw, siteId);

            if (!parsed) {
                console.warn(`[MQTT] Unparseable message on ${topic}`);
                return;
            }

            // Apply the exact same DTO transformation as the REST API
            const aliased = toMeasurementDTO(parsed);

            console.log(`[MQTT] → site ${aliased.siteId}:`, JSON.stringify(aliased).slice(0, 120));

            liveCache[aliased.siteId] = aliased;
            io.emit("weather:live", aliased);

        } catch (err) {
            console.error(`[MQTT] Parse error on ${topic}:`, err.message);
        }
    });

    return client;
}
