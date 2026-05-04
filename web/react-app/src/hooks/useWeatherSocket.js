/**
 * useWeatherSocket.js – React hook for real-time weather data via Socket.IO
 *
 * Connects to the Node.js API's Socket.IO server and listens for "weather:live"
 * events pushed by the MQTT bridge.
 *
 * Usage:
 *   const { latest, connected } = useWeatherSocket();
 *   // latest = { 1: { site_id: 1, temperature: 22.5, … }, 2: { … } }
 *   // connected = true/false
 */

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../api";

/**
 * @returns {{ latest: Object, connected: boolean }}
 */
export default function useWeatherSocket() {
    const [latest, setLatest]       = useState({});
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // Derive the Socket.IO URL from the API base URL
        // (Socket.IO runs on the same port as the REST API)
        const wsUrl = new URL(API_BASE).origin;

        const socket = io(wsUrl, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 2_000,
            reconnectionAttempts: Infinity,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[WS] ✓ Connected to real-time server");
            setConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("[WS] Disconnected");
            setConnected(false);
        });

        /**
         * "weather:live" payload structure:
         * {
         *   site_id: number,
         *   received_at: string (ISO),
         *   temperature: number,
         *   humidity: number,
         *   pressure: number,
         *   lux: number,
         *   wind_speed: number,
         *   wind_direction: number,
         *   rain_quantity: number,
         *   dev_eui: string | null,
         *   rssi: number | null,
         *   snr: number | null,
         * }
         */
        socket.on("weather:live", (data) => {
            console.log(`[WS] Live data → site ${data.site_id}`, data);
            setLatest((prev) => ({
                ...prev,
                [data.site_id]: {
                    ...prev[data.site_id],
                    ...data,
                },
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return { latest, connected };
}
