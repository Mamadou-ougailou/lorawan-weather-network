/**
 * server.js  –  Application entry point
 *
 * Responsibilities:
 *   1. Create the Express app
 *   2. Register global middleware (CORS, JSON body parser)
 *   3. Mount all route modules under /api
 *   4. Register 404 and error-handler middleware (always last)
 *   5. Start the HTTP server
 *
 * To run locally (without Docker):
 *   DB_HOST=127.0.0.1 DB_PASSWORD=weatherdev node src/server.js
 *
 * To run with the dev Docker stack:
 *   docker compose -f dev/docker-compose.dev.yml up
 */

import express from "express";
import cors from "cors";
import config from "./config.js";

// ─── Route modules ────────────────────────────────────────────────────────────
import stationsRouter from "./routes/stations.js";
import measurementsRouter from "./routes/measurements.js";
import historyRouter from "./routes/history.js";
import imagesRouter from "./routes/images.js";

// ─── Middleware ───────────────────────────────────────────────────────────────
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();

// Allow cross-origin requests (needed when the frontend is served from a
// different port or domain than the API, e.g. during local development)
app.use(cors());

// Parse incoming JSON bodies (useful if POST endpoints are added later)
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
//
// Each router covers one domain.  The /api prefix is applied here so the
// individual route files stay clean (they just use /stations, /latest, etc.).
//
app.use("/api", stationsRouter);     // GET /api/stations
app.use("/api", measurementsRouter); // GET /api/latest, /api/measurements
app.use("/api", historyRouter);      // GET /api/history, /api/compare
app.use("/", imagesRouter);       // GET /api/images  +  GET /images/:filename

// ─── Error handling ──────────────────────────────────────────────────────────
// These two must be registered AFTER all routes.
app.use(notFound);      // 404 – no route matched
app.use(errorHandler);  // 500 – an async route threw an error

// ─── Start ───────────────────────────────────────────────────────────────────
const { host, port } = config.server;

app.listen(port, host, () => {
    console.log("─────────────────────────────────────────");
    console.log("  LoRaWAN Weather Network API  –  Node.js");
    console.log("─────────────────────────────────────────");
    console.log(`  Listening on  http://${host}:${port}`);
    console.log(`  Database      ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log(`  Image dir     ${config.storage.imageDir}`);
    console.log("─────────────────────────────────────────");
});
