# Réseau météo LoRaWAN

Réseau distribué de surveillance météorologique reliant trois établissements
d’enseignement dans le département des **Alpes-Maritimes** :

| # | Site | Ville | Altitude |
|---|------|------|---------|
| 1 | Collège de Mougins | Mougins | 260 m |
| 2 | Lycée de Grasse    | Grasse  | 333 m |
| 3 | IUT Nice Côte d'Azur | Nice  | 25 m  |

## Architecture du système

```
┌──────────────────────────────────────────────────────────────────┐
│  Stations de terrain (×3)                                        │
│  Heltec WiFi LoRa 32 (ESP32)                                     │
│  BME280 (T/H/P) + TSL2591 (lux) + Caméra (images du ciel)       │
└────────────┬─────────────────────────────────────────────────────┘
             │ LoRaWAN (EU868, OTAA)
             ▼
┌──────────────────────────────┐
│  The Things Network (TTN)     │
│  Application : weather-network│
│  Formateur de payload (JS)    │
└────────────┬─────────────────┘
             │ MQTT / Webhook
             ▼
┌──────────────────────────────┐
│  Broker MQTT universitaire    │
│  topic : weather/stations/#   │
└────────────┬─────────────────┘
             │ WireGuard VPN
             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Centre de données Raspberry Pi (SSD 500 Go)                     │
│  ┌──────────────────┐  ┌────────────────────┐                   │
│  │ mqtt_subscriber  │  │   api_server         │                  │
│  │ (Python)         │→ │   (API REST Flask)   │→ Frontend web    │
│  └──────────┬───────┘  └────────────────────┘                   │
│             ▼                                                     │
│      MariaDB (weather_network)                                   │
│      measurements | sky_images | hourly_stats                    │
└──────────────────────────────────────────────────────────────────┘
             │ HTTP
             ▼
┌──────────────────────────────┐
│  Tableau de bord web public  │
│  Temps réel + historique     │
│  comparaison de 3 stations   │
└──────────────────────────────┘
```

## Structure du dépôt

```
lorawan-weather-network/
├── firmware/
│   ├── weather_station/
│   │   └── weather_station.ino   Firmware LoRaWAN ESP32 Heltec
│   └── README.md                 Matériel, bibliothèques, format payload
├── ttn/
│   ├── payload_formatter.js      Formateur de payload uplink/downlink TTN
│   └── README.md                 Guide de configuration de l’application TTN
├── datacenter/
│   ├── mqtt_subscriber.py        Abonné MQTT → MariaDB (Python)
│   ├── config.ini.example        Modèle de configuration
│   ├── requirements.txt          Dépendances Python
│   ├── database/
│   │   └── schema.sql            Schéma MariaDB
│   ├── vpn/
│   │   ├── wg0-server.conf       Config serveur WireGuard (université)
│   │   ├── wg0-client.conf       Config client WireGuard (Raspberry Pi)
│   │   └── README.md             Guide d’installation VPN
│   ├── scripts/
│   │   ├── weather-subscriber.service  Unité systemd
│   │   ├── weather-api.service         Unité systemd
│   │   └── aggregate_hourly.sh         Cron : mise à jour des stats horaires
│   └── README.md                 Guide de mise en place du centre de données
└── web/
    ├── backend/
  │   └── api_server.py         API REST Flask
    └── frontend/
    ├── index.html            Tableau de bord public
    ├── css/style.css         Styles
    └── js/app.js             Logique frontend Chart.js + Leaflet
```

## Démarrage rapide

### Firmware

Voir [firmware/README.md](firmware/README.md).

### TTN

Voir [ttn/README.md](ttn/README.md).

### Centre de données (Raspberry Pi)

Voir [datacenter/README.md](datacenter/README.md).

### Tableau de bord web

Le frontend est un site statique HTML/CSS/JS. Servez-le avec n’importe quel serveur web :

```bash
# Développement (serveur intégré Python)
cd web/frontend
python3 -m http.server 8080

# Production (nginx)
# Copier web/frontend/ vers /var/www/weather/
# Configurer nginx pour proxyfier /api/ vers localhost:5000
```

Configurez `API_BASE` dans `web/frontend/js/app.js` si le serveur API est sur
un hôte différent.

## Paramètres mesurés

| Paramètre | Capteur | Unité |
|-----------|--------|------|
| Température | BME280 | °C |
| Humidité relative | BME280 | % |
| Pression atmosphérique | BME280 | hPa |
| Luminosité ambiante (lux) | TSL2591 | lux |
| Image du ciel | OV2640 | JPEG |
| Batterie | ADC (Heltec V2) | % |

## Fréquence de transmission

- Données capteurs : toutes les **5 minutes** (configurable)
- Images du ciel : toutes les **30 minutes** (configurable)

## Sécurité

- Tout le trafic entre l’infrastructure universitaire et le centre de données
  Raspberry Pi passe par un tunnel **VPN WireGuard**.
- L’utilisateur de la base MariaDB ne possède que les privilèges `SELECT`,
  `INSERT`, `UPDATE` (pas de `DROP`, `DELETE`, `CREATE`).
- Le serveur API n’expose que des endpoints en lecture ; aucune
  authentification n’est requise pour le tableau de bord public (données
  en lecture seule).
