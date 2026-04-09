# Data Center

Le data center tourne sur un **Raspberry Pi** équipé d'un SSD 500 Go,
connecté au réseau de l'université via VPN WireGuard.

## Architecture modulaire

```
datacenter/
├── main.py                    Point d'entrée CLI
├── config.ini                 Configuration locale
├── config.ini.example         Template de configuration
├── requirements.txt           Dépendances Python
├── weather/                   Package principal
│   ├── __init__.py
│   ├── config.py              Chargement config (INI + env vars)
│   ├── models.py              Dataclass Measurement
│   ├── database.py            Accès MariaDB (reconnexion auto)
│   ├── mqtt_client.py         Client MQTT + dispatch des parsers
│   ├── alerting.py            Système d'alertes configurable
│   └── parsers/               Parsers de payload (extensible)
│       ├── __init__.py        Registre des parsers
│       ├── base.py            Classe abstraite PayloadParser
│       ├── ttn_parser.py      Parser format TTN uplink
│       └── flat_parser.py     Parser format JSON plat
├── database/
│   └── schema.sql             Schéma MariaDB
├── docs/
│   └── ttn_mqtt_bridge.md     Guide bridge TTN→MQTT
├── scripts/
│   ├── weather-subscriber.service   Unité systemd
│   ├── weather-api.service
│   └── aggregate_hourly.sh
└── vpn/
    ├── README.md              Guide WireGuard
    ├── wg0-client.conf        Config client (Raspberry Pi)
    └── wg0-server.conf        Config serveur (université)
```

## Quick Start

### 1. Installer les dépendances système

```bash
sudo apt update && sudo apt install -y \
    python3-pip python3-venv \
    mariadb-server \
    wireguard
```

### 2. Configurer le VPN WireGuard

Voir [vpn/README.md](vpn/README.md) pour connecter le Pi au réseau de l'université.

### 3. Installer la base de données

```bash
sudo mysql < database/schema.sql
# Créer un utilisateur restreint :
sudo mysql -e "
  CREATE USER IF NOT EXISTS 'weather'@'localhost' IDENTIFIED BY 'CHANGE_ME';
  GRANT SELECT,INSERT,UPDATE ON weather_network.* TO 'weather'@'localhost';
  FLUSH PRIVILEGES;"
```

### 4. Installer les dépendances Python

```bash
python3 -m venv /opt/weather/venv
/opt/weather/venv/bin/pip install -r requirements.txt
```

### 5. Configurer

```bash
sudo mkdir -p /etc/weather
sudo cp config.ini.example /etc/weather/config.ini
sudo nano /etc/weather/config.ini   # remplir les identifiants
```

Variables d'environnement disponibles (surchargent le fichier INI) :
- `WEATHER_MQTT_HOST`, `WEATHER_MQTT_PORT`, `WEATHER_MQTT_USERNAME`, `WEATHER_MQTT_PASSWORD`
- `WEATHER_DB_HOST`, `WEATHER_DB_USER`, `WEATHER_DB_PASSWORD`, `WEATHER_DB_NAME`
- `WEATHER_ALERTING_ENABLED`

### 6. Lancer manuellement (test)

```bash
# Test rapide
/opt/weather/venv/bin/python3 main.py --config /etc/weather/config.ini --log-level DEBUG

# Ou avec des variables d'environnement
WEATHER_MQTT_HOST=10.200.0.1 /opt/weather/venv/bin/python3 main.py
```

### 7. Installer le service systemd

```bash
sudo useradd -r -s /bin/false weather
sudo mkdir -p /var/log/weather /var/weather/images
sudo chown weather:weather /var/log/weather /var/weather/images

# Copier le service
sudo cp scripts/weather-subscriber.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now weather-subscriber

# Vérifier
sudo systemctl status weather-subscriber
sudo journalctl -u weather-subscriber -f
```

### 8. Agrégation horaire (cron)

```bash
sudo crontab -u weather -e
# Ajouter :
# 0 * * * * /opt/weather/datacenter/scripts/aggregate_hourly.sh >> /var/log/weather/aggregate.log 2>&1
```

## Flux de données

```
Broker MQTT université (10.200.0.x:1883)
    │  (données TTN relayées par le bridge)
    │
    │  VPN WireGuard
    ▼
main.py → WeatherMQTTClient
    │  dispatch automatique
    ├── TTNParser (format TTN natif)
    └── FlatParser (format JSON plat)
    │
    ▼
MariaDB (weather_network)
    │
    ├── measurements  (données brutes)
    ├── alerts        (alertes seuils)
    ├── sky_images    (métadonnées caméra)
    └── hourly_stats  (cron agrégation)
```

## Ajouter un nouveau format de payload

1. Créer `weather/parsers/mon_parser.py`
2. Implémenter la classe `PayloadParser` (voir `base.py`)
3. L'enregistrer dans `weather/parsers/__init__.py` → `DEFAULT_PARSERS`
4. Redémarrer le service

## Bridge TTN → MQTT

Voir [docs/ttn_mqtt_bridge.md](docs/ttn_mqtt_bridge.md) pour la documentation
sur la mise en place du bridge côté université.
