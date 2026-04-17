# Bridge TTN → MQTT (Documentation)

Ce document explique comment mettre en place un **bridge** (pont) entre le broker MQTT de **The Things Network (TTN)** et un broker MQTT privé (par exemple celui de l'université).

> **Note** : Ce bridge est déjà mis en place côté université.
> Ce document sert de référence si vous devez le reconfigurer ou en déployer un nouveau.

---

## Architecture

```
TTN Cloud                        Serveur Université
┌──────────────────────┐        ┌──────────────────────────┐
│ eu1.cloud.thethings  │        │  Mosquitto (broker local)│
│ .network:8883        │───────▶│  port 1883               │
│ (broker MQTT public) │  MQTT  │                          │
│                      │ Bridge │  topic: weather/stations/#│
└──────────────────────┘        └────────────┬─────────────┘
                                             │ VPN WireGuard
                                             │
                                ┌────────────▼─────────────┐
                                │   Raspberry Pi (chez toi)│
                                │   mqtt_subscriber.py     │
                                │   MariaDB                │
                                └──────────────────────────┘
```

## Principe

Le **bridge** est un script ou un service qui :
1. Se connecte au broker MQTT **public** de TTN (en TLS)
2. S'abonne aux messages `uplink` de votre application
3. Re-publie les messages (tels quels ou transformés) sur le broker **privé** de l'université

---

## Méthode 1 : Bridge Mosquitto natif (recommandé)

Mosquitto supporte nativement le "bridging" entre deux brokers.

### Configuration

Ajouter dans `/etc/mosquitto/conf.d/ttn-bridge.conf` **sur le serveur de l'université** :

```conf
# ── Bridge TTN → Broker local ─────────────────────────────────────────

connection ttn-weather
address eu1.cloud.thethings.network:8883

# Authentification TTN
remote_username <APPLICATION_ID>@ttn
remote_password <API_KEY>

# TLS obligatoire pour TTN
bridge_capath /etc/ssl/certs
bridge_protocol_version mqttv311

# Topics à bridger :
#   - direction: in = TTN → local
#   - le message TTN est republié sur le topic local
topic v3/<APPLICATION_ID>@ttn/devices/+/up in 1 weather/stations/ v3/<APPLICATION_ID>@ttn/devices/

# Reconnexion automatique
start_type automatic
try_private false
cleansession true
keepalive_interval 60
restart_timeout 10
```

### Explication des paramètres

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `address` | `eu1.cloud.thethings.network:8883` | Broker TTN Europe (TLS) |
| `remote_username` | `<APP_ID>@ttn` | ID de votre application TTN |
| `remote_password` | `NNSXS.XXXX...` | API Key TTN (avec droit MQTT) |
| `bridge_capath` | `/etc/ssl/certs` | Certificats CA pour la connexion TLS |
| `topic ... in` | `v3/.../+/up` | S'abonne aux uplinks et les republie localement |

### Déploiement

```bash
# 1. Créer le fichier de configuration
sudo nano /etc/mosquitto/conf.d/ttn-bridge.conf

# 2. Vérifier la syntaxe
mosquitto -c /etc/mosquitto/mosquitto.conf -t

# 3. Redémarrer Mosquitto
sudo systemctl restart mosquitto

# 4. Vérifier les logs
sudo journalctl -u mosquitto -f

# 5. Tester que les messages arrivent
mosquitto_sub -h localhost -t "weather/stations/#" -v
```

---

## Méthode 2 : Script Python

Si vous préférez un bridge personnalisé (pour transformer les messages avant de les republier) :

```python
#!/usr/bin/env python3
"""
Bridge TTN MQTT → Broker local.
Republishes TTN uplinks to a local MQTT broker.
"""

import json
import paho.mqtt.client as mqtt

# ── Configuration TTN ──────────────────────────────────────────────────
TTN_HOST     = "eu1.cloud.thethings.network"
TTN_PORT     = 8883
TTN_APP_ID   = "<APPLICATION_ID>"
TTN_API_KEY  = "NNSXS.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
TTN_TOPIC    = f"v3/{TTN_APP_ID}@ttn/devices/+/up"

# ── Configuration broker local ────────────────────────────────────────
LOCAL_HOST   = "localhost"
LOCAL_PORT   = 1883
LOCAL_TOPIC  = "weather/stations"

# ── Client local (publisher) ──────────────────────────────────────────
local_client = mqtt.Client(client_id="ttn-bridge-local")
local_client.connect(LOCAL_HOST, LOCAL_PORT)
local_client.loop_start()

# ── Client TTN (subscriber) ──────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[TTN] Connecté, abonnement à {TTN_TOPIC}")
        client.subscribe(TTN_TOPIC, qos=1)
    else:
        print(f"[TTN] Erreur de connexion: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload)
        
        # Extraire le device_id
        device_id = payload.get("end_device_ids", {}).get("device_id", "unknown")
        
        # Republier sur le broker local
        local_topic = f"{LOCAL_TOPIC}/{device_id}"
        local_client.publish(local_topic, msg.payload, qos=1, retain=False)
        
        print(f"[BRIDGE] {msg.topic} → {local_topic}")
    except Exception as e:
        print(f"[ERREUR] {e}")

ttn_client = mqtt.Client(client_id="ttn-bridge-ttn")
ttn_client.username_pw_set(f"{TTN_APP_ID}@ttn", TTN_API_KEY)
ttn_client.tls_set()

ttn_client.on_connect = on_connect
ttn_client.on_message = on_message

ttn_client.connect(TTN_HOST, TTN_PORT)
ttn_client.loop_forever()
```

---

## Méthode 3 : Node-RED

Si Node-RED est installé sur le serveur :

1. Ajouter un nœud **mqtt in** → configuré sur `eu1.cloud.thethings.network:8883`
2. Ajouter un nœud **mqtt out** → configuré sur `localhost:1883`
3. Relier les deux nœuds
4. Déployer

---

## Vérification

Pour vérifier que le bridge fonctionne, depuis **n'importe quelle machine connectée au broker local** :

```bash
# S'abonner aux messages sur le broker local
mosquitto_sub -h <BROKER_IP> -t "weather/stations/#" -v
```

Vous devriez voir les messages JSON de TTN apparaître à chaque uplink des stations.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Pas de messages | API Key expirée ou invalide | Régénérer une API Key dans la console TTN |
| `Connection refused` | Mauvais host/port | Vérifier `eu1.cloud.thethings.network:8883` |
| `TLS handshake failed` | Certificats CA manquants | `sudo apt install ca-certificates` |
| Messages reçus sur TTN mais pas en local | Topic mal configuré | Vérifier le topic pattern avec `mosquitto_sub` |
| Erreur `Not authorized` | Username/password incorrects | Format : `<app-id>@ttn` / `NNSXS.xxx` |
