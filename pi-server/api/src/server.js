/**
 * server.js  –  Application entry point
 *
 * Responsibilities:
 *   1. Create the Express app + HTTP server
 *   2. Register global middleware (CORS, JSON body parser)
 *   3. Mount all route modules under /api
 *   4. Attach Socket.IO for real-time WebSocket push
 *   5. Start the MQTT bridge (MQTT → Socket.IO → frontend)
 *   6. Register 404 and error-handler middleware (always last)
 *   7. Start the HTTP server
 *
 * To run locally (without Docker):
 *   DB_HOST=127.0.0.1 DB_PASSWORD=weatherdev node src/server.js
 *
 * To run with the dev Docker stack:
 *   docker compose -f dev/docker-compose.dev.yml up
 */

import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import config from "./config.js";
import { startMqttBridge } from "./mqttBridge.js";

// ─── Route modules ────────────────────────────────────────────────────────────
import stationsRouter from "./components/stations/stations.router.js";
import measurementsRouter from "./components/measurements/measurements.router.js";
import historyRouter from "./components/history/history.router.js";
import alertsRouter from "./components/alerts/alerts.router.js";

import mappingsRouter from "./components/mappings/mappings.router.js";
import { loadMappings } from "./components/mappings/mappings.service.js";

// ─── Middleware ───────────────────────────────────────────────────────────────
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// ─── App setup ───────────────────────────────────────────────160eecb7094d─────────────────
const app = express();
const httpServer = createServer(app);

// ─── Socket.IO (real-time push to frontend) ──────────────────────────────────
const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
    console.log(`[WS] Client connected (${socket.id})`);
    socket.on("disconnect", () => {
        console.log(`[WS] Client disconnected (${socket.id})`);
    });
});

// ─── CORS + Private Network Access (Chrome PNA) ──────────────────────────────
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use(cors({ origin: '*' }));

// Parse incoming JSON bodies
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", stationsRouter);     // GET, POST, PATCH, DELETE /api/stations
app.use("/api", measurementsRouter); // GET /api/latest, /api/measurements, DELETE /api/measurements/:id
app.use("/api", historyRouter);      // GET /api/history, /api/compare
app.use("/api", alertsRouter);       // GET, PUT, DELETE /api/alerts
app.use("/api", mappingsRouter);     // GET, POST, PUT, DELETE /api/mappings

import { liveCache } from "./mqttBridge.js";
app.get("/api/live", (req, res) => res.json(liveCache));

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);      // 404 – no route matched
app.use(errorHandler);  // 500 – an async route threw an error

// ─── Start ───────────────────────────────────────────────────────────────────
const { host, port } = config.server;

// Initialize cache before starting the server
await loadMappings();

httpServer.listen(port, host, () => {
    console.log("─────────────────────────────────────────");
    console.log("  LoRaWAN Weather Network API  –  Node.js");
    console.log("─────────────────────────────────────────");
    console.log(`  Listening on  http://${host}:${port}`);
    console.log(`  REST API      /api/*`);
    console.log(`  WebSocket     Socket.IO on same port`);
    console.log(`  Database      ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log("─────────────────────────────────────────");

    // Start the MQTT → Socket.IO bridge after server is ready
    startMqttBridge(io);
});
