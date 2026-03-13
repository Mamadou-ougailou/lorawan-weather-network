/**
 * db.js
 *
 * Creates and exports a single mysql2 promise-based connection pool.
 *
 * Using a pool (instead of opening a new connection per request) is more
 * efficient: idle connections are reused and the pool handles back-pressure
 * automatically when all connections are busy.
 *
 * Usage in any route:
 *   import pool from "../db.js";
 *   const [rows] = await pool.query("SELECT ...", [params]);
 */

import mysql from "mysql2/promise";
import config from "./config.js";

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: "utf8mb4",
    waitForConnections: true,   // queue requests when the pool is full
    connectionLimit: 10,      // max simultaneous connections
    queueLimit: 0,       // unlimited queue (0 = no limit)
    connectTimeout: 5000,    // fail fast if DB is unreachable (ms)
});

export default pool;
