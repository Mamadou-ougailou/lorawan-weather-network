# LoRaWAN Weather Network

Distributed weather monitoring network connecting three educational institutions
in the **Alpes-Maritimes** department of France:

| # | Site | City | Altitude |
|---|------|------|---------|
| 1 | Collège de Mougins | Mougins | 260 m |
| 2 | Lycée de Grasse    | Grasse  | 333 m |
| 3 | IUT Nice Côte d'Azur | Nice  | 25 m  |

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Field stations (×3)                                             │
│  Heltec WiFi LoRa 32 (ESP32)                                     │
│  BME280 (T/H/P) + TSL2591 (lux) + Camera (sky images)           │
└────────────┬─────────────────────────────────────────────────────┘
             │ LoRaWAN (EU868, OTAA)
             ▼
┌──────────────────────────────┐
│  The Things Network (TTN)    │
│  Application: weather-network │
│  Payload formatter (JS)      │
└────────────┬─────────────────┘
             │ MQTT / Webhook
             ▼
┌──────────────────────────────┐
│  University MQTT broker      │
│  topic: weather/stations/#   │
└────────────┬─────────────────┘
             │ WireGuard VPN
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Raspberry Pi data center (500 GB SSD)                           │
│  ┌──────────────────┐  ┌────────────────────┐                   │
│  │ mqtt_subscriber  │  │   api_server        │                   │
│  │ (Python)         │→ │   (Flask REST API)  │→ Web frontend     │
│  └──────────┬───────┘  └────────────────────┘                   │
│             ▼                                                     │
│      MariaDB (weather_network)                                   │
│      measurements | sky_images | hourly_stats                    │
└──────────────────────────────────────────────────────────────────┘
             │ HTTP
             ▼
┌──────────────────────────────┐
│  Public web dashboard        │
│  Real-time + historical      │
│  comparison of 3 stations    │
└──────────────────────────────┘
```

## Repository Structure

```
lorawan-weather-network/
├── firmware/
│   ├── weather_station/
│   │   └── weather_station.ino   ESP32 Heltec LoRaWAN firmware
│   └── README.md                 Hardware, libraries, payload format
├── ttn/
│   ├── payload_formatter.js      TTN uplink/downlink payload formatter
│   └── README.md                 TTN application setup guide
├── datacenter/
│   ├── mqtt_subscriber.py        MQTT → MariaDB subscriber (Python)
│   ├── config.ini.example        Configuration template
│   ├── requirements.txt          Python dependencies
│   ├── database/
│   │   └── schema.sql            MariaDB schema
│   ├── vpn/
│   │   ├── wg0-server.conf       WireGuard server config (university)
│   │   ├── wg0-client.conf       WireGuard client config (Raspberry Pi)
│   │   └── README.md             VPN setup guide
│   ├── scripts/
│   │   ├── weather-subscriber.service  Systemd unit
│   │   ├── weather-api.service         Systemd unit
│   │   └── aggregate_hourly.sh         Cron: refresh hourly stats
│   └── README.md                 Data center setup guide
└── web/
    ├── backend/
    │   └── api_server.py         Flask REST API
    └── frontend/
        ├── index.html            Public dashboard
        ├── css/style.css         Styles
        └── js/app.js             Chart.js + Leaflet frontend logic
```

## Quick Start

### Firmware

See [firmware/README.md](firmware/README.md).

### TTN

See [ttn/README.md](ttn/README.md).

### Data Center (Raspberry Pi)

See [datacenter/README.md](datacenter/README.md).

### Web Dashboard

The frontend is a static HTML/CSS/JS site. Serve it with any web server:

```bash
# Development (Python built-in server)
cd web/frontend
python3 -m http.server 8080

# Production (nginx)
# Copy web/frontend/ to /var/www/weather/
# Configure nginx to proxy /api/ to localhost:5000
```

Configure `API_BASE` in `web/frontend/js/app.js` if the API server is on a
different host.

## Measured Parameters

| Parameter | Sensor | Unit |
|-----------|--------|------|
| Temperature | BME280 | °C |
| Relative Humidity | BME280 | % |
| Atmospheric Pressure | BME280 | hPa |
| Ambient Light (lux) | TSL2591 | lux |
| Sky Image | OV2640 | JPEG |
| Battery | ADC (Heltec V2) | % |

## Transmission Schedule

- Sensor data: every **5 minutes** (configurable)
- Sky images: every **30 minutes** (configurable)

## Security

- All traffic between the university infrastructure and the Raspberry Pi
  data center flows through a **WireGuard VPN** tunnel.
- The MariaDB database user has only `SELECT`, `INSERT`, `UPDATE` privileges
  (no `DROP`, `DELETE`, `CREATE`).
- The API server exposes only read endpoints; no authentication is required
  for the public dashboard (read-only data).
