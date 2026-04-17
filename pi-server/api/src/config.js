

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
