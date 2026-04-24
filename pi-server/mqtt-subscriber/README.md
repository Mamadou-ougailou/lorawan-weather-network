# Réseau Météo — Datacenter

Backend Python pour le réseau de stations météo LoRaWAN.
Ce programme s'abonne aux messages MQTT provenant du broker de l'université, analyse les données des capteurs, les stocke dans une base de données MariaDB, et déclenche des alertes configurables selon des seuils.

## Architecture

```
config.ini
  ├── [mqtt]          → paramètres de connexion au broker
  ├── [database]      → identifiants MariaDB
  ├── [field_mapping] → champs des capteurs (clé MQTT → colonne DB) ← Source unique de vérité
  └── [alerting]      → règles d'alertes (détectées automatiquement)

main.py
  ├── build_parsers(cfg)          → crée les parsers en injectant field_map
  ├── Database(cfg)               → connexion à MariaDB
  │     └── sync_sensor_columns() → ALTER TABLE auto pour correspondre à [field_mapping]
  ├── AlertManager(cfg, db)       → construit les seuils d'alerte depuis la config
  └── WeatherMQTTClient(...)      → gère l'abonnement et distribue les messages
            │
            ├── TTNParser(field_map)   → traite les données natives TTN v3
            └── FlatParser(field_map)  → traite le JSON pré-traité par bridge
                      │
                      └── _extract_readings() → mappe les clés du payload vers la BDD
                                │
                                ▼
                      Measurement(readings: dict)
                                │
                                ▼
                      table `measurements` dans MariaDB
```

## Démarrage Rapide

```bash
# 1. Créer l'environnement virtuel
python3 -m venv .venv && source .venv/bin/activate

# 2. Installer les dépendances
pip install -r datacenter/requirements.txt

# 3. Initialiser la base de données
sudo mysql < datacenter/database/schema.sql
sudo mysql -e "
  CREATE USER IF NOT EXISTS 'weather'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
  GRANT SELECT, INSERT, UPDATE, EXECUTE ON weather_network.* TO 'weather'@'localhost';
  FLUSH PRIVILEGES;"

# 4. Configurer
cp datacenter/config.ini /etc/weather/config.ini
nano /etc/weather/config.ini   # Définir ses identifiants

# 5. Lancer
python3 datacenter/main.py --config /etc/weather/config.ini
```

## Référence de Configuration

### `[mqtt]`

| Clé | Défaut | Description |
|---|---|---|
| `host` | `localhost` | Adresse du broker MQTT |
| `port` | `1883` | Port (`443` force l'utilisation de WebSocket+TLS) |
| `tls` | `false` | Activer TLS |
| `username` / `password` | — | Identifiants du broker |
| `topic` | `weather/stations/#` | Topic MQTT auquel s'abonner |
| `client_id` | `weather-datacenter` | Identifiant du client MQTT |
| `keepalive` | `60` | Intervalle de keepalive en secondes |

### `[database]`

| Clé | Défaut | Description |
|---|---|---|
| `host` | `localhost` | Adresse MariaDB |
| `port` | `3306` | Port MariaDB |
| `user` | `weather` | Utilisateur BDD |
| `password` | — | Mot de passe BDD |
| `database` | `weather_network` | Nom de la base de données |

### `[stations]`

Permet de lier l'identifiant MQTT du capteur (`device_id`) à son numéro de site physique (`site_id`) défini dans la base de données.

```ini
[stations]
weather-station-davis = 1
mougins-station = 3
grasse-station = 2
```

### `[field_mapping]` ← Le plus important

Fait la correspondance entre les noms des colonnes de la base de données (en interne) et les noms des clés reçues dans le fichier JSON du payload MQTT.

```ini
[field_mapping]
temperature    = temp1      # Le broker envoie "temp1" → stocké dans la colonne "temperature"
humidity       = humid
wind_speed     = vitvent
wind_direction = dirvent
rain_quantity  = hpluie
```

**Ajouter un nouveau capteur :** ajoutez une seule ligne ici. Le programme va automatiquement :
1. Exécuter `ALTER TABLE measurements ADD COLUMN <nom> DECIMAL(10,4) NULL` au prochain démarrage.
2. Récupérer la valeur associée à cette clé pour chaque nouveau message MQTT reçu.
3. L'insérer dans la base de données.

**Retirer un capteur :** supprimez la ligne. La colonne correspondante sera drop de la base de données au prochain démarrage.

> **Attention:** Retirer une ligne de `[field_mapping]` supprime définitivement la colonne correspondante et toutes les données historiques associées dans la base.

### `[alerting]`

| Clé | Description |
|---|---|
| `enabled` | `true` / `false` |
| `<metric>_min` | Seuil minimum — peut s'appliquer sur n'importe quel capteur de `[field_mapping]` |
| `<metric>_max` | Seuil maximum — peut s'appliquer sur n'importe quel capteur de `[field_mapping]` |

```ini
[alerting]
enabled         = true
temperature_min = -10
temperature_max = 50
humidity_max    = 100
```

Les règles sont **détectées automatiquement** : toute clé finissant par `_min` ou `_max` crée automatiquement une nouvelle règle d'alerte.

## Surcharges par Variables d'Environnement

Tous les paramètres sensibles peuvent être surchargés via les variables d'environnement (très utile avec Docker/CI) :

| Variable | Clé de configuration |
|---|---|
| `WEATHER_MQTT_HOST` | `[mqtt] host` |
| `WEATHER_MQTT_PORT` | `[mqtt] port` |
| `WEATHER_MQTT_USERNAME` | `[mqtt] username` |
| `WEATHER_MQTT_PASSWORD` | `[mqtt] password` |
| `WEATHER_MQTT_TOPIC` | `[mqtt] topic` |
| `WEATHER_DB_HOST` | `[database] host` |
| `WEATHER_DB_USER` | `[database] user` |
| `WEATHER_DB_PASSWORD` | `[database] password` |
| `WEATHER_DB_NAME` | `[database] database` |
| `WEATHER_ALERTING_ENABLED` | `[alerting] enabled` |

## Options CLI

```
python3 datacenter/main.py [OPTIONS]

  --config CHEMIN      Chemin vers config.ini  (défaut: config.ini)
  --log-level NIVEAU   DEBUG / INFO / WARNING / ERROR  (défaut: INFO)
  --log-file  CHEMIN   Chemin du fichier log. Vide = stdout uniquement  (défaut: mqtt_subscriber.log)
```

La rotation des logs est gérée automatiquement : 5 Mo maximum par fichier de log, 3 fichiers de sauvegarde conservés (total max : 20 Mo).

## Design Patterns Utilisés

| Pattern | Utilisation |
|---|---|
| **Repository** | Classe `Database` — isole tout le code SQL derrière une interface propre |
| **Strategy** | `PayloadParser` / `TTNParser` / `FlatParser` — algorithmes de parsing interchangeables |
| **Factory** | `build_parsers(cfg)` — construit dynamiquement la chaîne de parsers depuis la configuration |
| **Chain of Responsibility** | Boucle de traitement MQTT — chaque parser décide s'il est capable de traîter le message |
| **Dependency Injection** | `WeatherMQTTClient(db, alert_manager, parsers)` — les dépendances ne sont pas instanciées en interne mais reçues par constructeur |
| **Observer** | `AlertManager.evaluate()` — exécuté à chaque nouvelle insertion d'une mesure |

## Étendre le Système

### Ajouter un nouveau format de message

1. Créez `datacenter/weather/parsers/mon_parser.py`:

```python
from weather.parsers.base import PayloadParser

class MonParser(PayloadParser):
    @property
    def name(self): return "Mon Format"

    def can_parse(self, payload): return "ma_cle" in payload

    def parse(self, payload):
        readings = self._extract_readings(payload)
        return Measurement(site_id=payload["site_id"], received_at=..., readings=readings)
```

2. Enregistrez-le dans `build_parsers()` au sein de `datacenter/weather/parsers/__init__.py`.

### Ajouter un nouveau champ capteur

```ini
# config.ini
[field_mapping]
co2 = co2_ppm
```

Redémarrez l'application. C'est tout.

## Utilisation en service système (systemd)

```bash
sudo cp datacenter/scripts/weather-subscriber.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now weather-subscriber
sudo journalctl -u weather-subscriber -f
```
