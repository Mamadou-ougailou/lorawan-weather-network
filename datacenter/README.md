# Data Center

The data center runs on a **Raspberry Pi** (any model with USB 3.0) equipped with
a 500 GB SSD, connected to the university VPN.

## Components

| Component | Description |
|-----------|-------------|
| `mqtt_subscriber.py` | Subscribes to MQTT, decodes TTN payloads, writes to MariaDB |
| `database/schema.sql` | MariaDB schema (tables, stored procedures) |
| `config.ini.example` | Template for `/etc/weather/config.ini` |
| `requirements.txt` | Python dependencies |
| `vpn/` | WireGuard VPN configuration |
| `scripts/` | Systemd units, cron scripts |

## Quick Start

### 1. Install OS dependencies

```bash
sudo apt update && sudo apt install -y \
    python3-pip python3-venv \
    mariadb-server \
    mosquitto mosquitto-clients \
    wireguard
```

### 2. Set up the database

```bash
sudo mysql < database/schema.sql
# Create a restricted user:
sudo mysql -e "
  CREATE USER IF NOT EXISTS 'weather'@'localhost' IDENTIFIED BY 'CHANGE_ME';
  GRANT SELECT,INSERT,UPDATE ON weather_network.* TO 'weather'@'localhost';
  FLUSH PRIVILEGES;"
```

### 3. Install Python dependencies

```bash
python3 -m venv /opt/weather/venv
/opt/weather/venv/bin/pip install -r requirements.txt
```

### 4. Configure

```bash
sudo mkdir -p /etc/weather
sudo cp config.ini.example /etc/weather/config.ini
sudo nano /etc/weather/config.ini   # fill in credentials
```

### 5. Install systemd services

```bash
sudo useradd -r -s /bin/false weather
sudo mkdir -p /var/log/weather /var/weather/images
sudo chown weather:weather /var/log/weather /var/weather/images

# Copy service files
sudo cp scripts/weather-subscriber.service /etc/systemd/system/
sudo cp scripts/weather-api.service        /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now weather-subscriber
sudo systemctl enable --now weather-api
```

### 6. Set up the VPN

See [vpn/README.md](vpn/README.md) for WireGuard configuration.

### 7. Schedule hourly aggregation

```bash
sudo crontab -u weather -e
# Add:
# 0 * * * * /opt/weather/datacenter/scripts/aggregate_hourly.sh >> /var/log/weather/aggregate.log 2>&1
```

## Data flow

```
TTN MQTT broker (eu1.cloud.thethings.network:8883)
    │  (or university MQTT broker)
    │  topic: weather/stations/#
    ▼
mqtt_subscriber.py
    │
    ▼
MariaDB (weather_network DB)
    │
    ├── measurements  (raw rows)
    ├── sky_images    (camera captures metadata)
    └── hourly_stats  (materialised by cron)
    │
    ▼
api_server.py (Flask REST API, port 5000)
    │
    ▼
Web frontend (index.html)
```
