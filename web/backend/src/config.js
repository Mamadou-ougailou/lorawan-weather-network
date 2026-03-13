/**
 * config.js
 *
 * Single source of truth for every runtime setting.
 * All values come from environment variables so the same Docker image
 * works in development, staging, and production without code changes.
 *
 * Environment variables and their defaults:
 *
 *   PORT        3000                  HTTP port the API listens on
 *   DB_HOST     localhost             MariaDB hostname
 *   DB_PORT     3306                  MariaDB port
 *   DB_USER     weather               Database user
 *   DB_PASSWORD (empty)               Database password
 *   DB_NAME     weather_network       Database schema name
 *   IMAGE_DIR   /var/weather/images   Directory where sky images are stored
 */

const config = {
    /** HTTP server */
    server: {
        port: parseInt(process.env.PORT ?? "3000", 10),
        host: process.env.HOST ?? "0.0.0.0",
    },

    /** MariaDB / MySQL connection pool */
    db: {
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "3306", 10),
        user: process.env.DB_USER ?? "weather",
        password: process.env.DB_PASSWORD ?? "",
        database: process.env.DB_NAME ?? "weather_network",
    },

    /** File-system paths */
    storage: {
        imageDir: process.env.IMAGE_DIR ?? "/var/weather/images",
    },
};

export default config;
