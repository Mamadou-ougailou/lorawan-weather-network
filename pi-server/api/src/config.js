

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

    /** MQTT broker (for real-time WebSocket push) */
    mqtt: {
        host: process.env.MQTT_HOST ?? "mqtt.univ-cotedazur.fr",
        port: parseInt(process.env.MQTT_PORT ?? "443", 10),
        tls: (process.env.MQTT_TLS ?? "true") === "true",
        username: process.env.MQTT_USERNAME ?? "fablab2122",
        password: process.env.MQTT_PASSWORD ?? "2122",
        clientId: process.env.MQTT_CLIENT_ID ?? "weather-api-realtime",
        // Comma-separated list of "topic=siteId" pairs
        // e.g. "ttn/v3/.../up=1,ttn/v3/.../up=2"
        topics: process.env.MQTT_TOPICS ?? "ttn/v3/fablab2223@ttn/devices/weather-station-davis/up=1,ttn/v3/fablab2223@ttn/devices/l3-arduino-mega-meteo/up=2",
    },
};

export default config;
