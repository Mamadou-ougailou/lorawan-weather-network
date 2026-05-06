# 🌦️ LoRaWAN Weather Network — API REST

API Node.js (Express 5) pour le réseau de stations météo LoRaWAN.  
Fournit les données en temps réel via REST et WebSocket (Socket.IO).

**Base URL** : `http://localhost:3000/api`

---

## 📡 Stations

### Lister toutes les stations

```bash
curl http://localhost:3000/api/stations
```

### Créer une station

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Station Nice",
    "city": "Nice",
    "latitude": 43.710173,
    "longitude": 7.261953,
    "altitudeM": 25,
    "description": "Université Côte d'\''Azur"
  }'
```

### Modifier une station (mise à jour partielle)

Seuls les champs envoyés sont modifiés, les autres restent inchangés.

```bash
curl -X PATCH http://localhost:3000/api/stations/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Nouveau Nom"}'
```

### Supprimer une station (suppression douce)

La station passe en `is_active = 0` pour ne pas casser les clés étrangères des mesures.

```bash
curl -X DELETE http://localhost:3000/api/stations/1
```

---

## 📊 Mesures

### Dernière mesure par station

Retourne la mesure la plus récente de chaque station active.

```bash
curl http://localhost:3000/api/latest
```

### Lister les mesures

Paramètres optionnels : `site` (ID de station), `limit` (max 500, défaut 50).

```bash
# Toutes les mesures (50 dernières)
curl http://localhost:3000/api/measurements

# Filtrées par station, avec limite
curl "http://localhost:3000/api/measurements?site=1&limit=20"
```

### Tendances (agrégation par intervalle)

Paramètres optionnels : `hours` (max 168, défaut 24), `interval` en minutes (max 360, défaut 30).

```bash
# Dernières 6 heures, intervalles de 30 min
curl "http://localhost:3000/api/trend?hours=6&interval=30"
```

### Supprimer une mesure

Suppression définitive d'une mesure corrompue.

```bash
curl -X DELETE http://localhost:3000/api/measurements/42
```

---

## 📈 Historique

### Historique horaire

Agrégation par heure (avg, min, max) de chaque capteur. Paramètres : `site` (optionnel), `hours` (max 720, défaut 24).

```bash
# Toutes les stations, 24 dernières heures
curl http://localhost:3000/api/history

# Une station spécifique, 48 dernières heures
curl "http://localhost:3000/api/history?site=1&hours=48"
```

### Comparaison inter-stations

Mêmes agrégations que l'historique, mais groupées pour comparer les stations entre elles.

```bash
curl "http://localhost:3000/api/compare?hours=24"
```

---

## 🚨 Alertes

### Lister les alertes

```bash
curl http://localhost:3000/api/alerts
```

### Résoudre une alerte

Marque l'alerte comme résolue (met `resolved_at` à l'heure actuelle).

```bash
curl -X PUT http://localhost:3000/api/alerts/1
```

### Supprimer une alerte

```bash
curl -X DELETE http://localhost:3000/api/alerts/1
```

---

## 🔧 Mappings capteurs

Gestion dynamique des correspondances entre les clés brutes du capteur (ex: `temp1`) et les alias exposés par l'API (ex: `temperature`). Un cache en mémoire est automatiquement rafraîchi à chaque modification.

### Lister tous les mappings

```bash
curl http://localhost:3000/api/mappings
```

### Créer un mapping

```bash
curl -X POST http://localhost:3000/api/mappings \
  -H "Content-Type: application/json" \
  -d '{"rawKey": "temp2", "alias": "temperatureExterieure"}'
```

### Modifier un mapping (mise à jour partielle)

```bash
# Changer uniquement l'alias
curl -X PATCH http://localhost:3000/api/mappings/1 \
  -H "Content-Type: application/json" \
  -d '{"alias": "temperatureInterieure"}'

# Désactiver un mapping (le capteur disparaît de toutes les réponses)
curl -X PATCH http://localhost:3000/api/mappings/5 \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Supprimer un mapping (suppression douce)

Le mapping passe en `is_active = 0` et disparaît des réponses API.

```bash
curl -X DELETE http://localhost:3000/api/mappings/5
```

---

## 🔐 Authentification & Utilisateurs

Toutes les routes de modification (POST, PATCH, DELETE) de l'API nécessitent d'être authentifié en tant qu'administrateur. N'oubliez pas de passer le token JWT dans le header `Authorization: Bearer <votre_token>`.

### Connexion (Login)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@weather.local", "password": "admin123"}'
```

### Lister les utilisateurs (Admin)

Protégé : seul un compte "admin" y a accès.

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <votre_token>"
```

### Créer un utilisateur (Admin)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "nouveau@weather.local", "password": "mot_de_passe", "role": "viewer"}'
```

### Modifier le rôle ou mot de passe d'un utilisateur (Admin)

Mise à jour partielle (envoyer uniquement le `role` ou le `password`).

```bash
curl -X PATCH http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Supprimer un utilisateur (Admin)

```bash
curl -X DELETE http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer <votre_token>"
```

---

## 🔴 Données en direct

### Cache temps réel (dernière trame MQTT)

Retourne la dernière trame reçue par le bridge MQTT pour chaque station, sans passer par la base de données.

```bash
curl http://localhost:3000/api/live
```

### WebSocket (Socket.IO)

Le serveur pousse les trames en temps réel via l'événement `weather:live`.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
});

socket.on("weather:live", (data) => {
  console.log(`Station ${data.site_id}:`, data);
  // { site_id: 1, temperature: 22.5, humidity: 65, windSpeed: 12, ... }
});
```

---

## 📋 Récapitulatif des endpoints

| Méthode  | Endpoint                  | Description                          |
|----------|---------------------------|--------------------------------------|
| `GET`    | `/api/stations`           | Lister les stations                  |
| `POST`   | `/api/stations`           | Créer une station                    |
| `PATCH`  | `/api/stations/:id`       | Modifier une station (partiel)       |
| `DELETE` | `/api/stations/:id`       | Supprimer une station (soft)         |
| `GET`    | `/api/latest`             | Dernière mesure par station          |
| `GET`    | `/api/measurements`       | Lister les mesures                   |
| `GET`    | `/api/trend`              | Tendances agrégées                   |
| `DELETE` | `/api/measurements/:id`   | Supprimer une mesure                 |
| `GET`    | `/api/history`            | Historique horaire                   |
| `GET`    | `/api/compare`            | Comparaison inter-stations           |
| `GET`    | `/api/alerts`             | Lister les alertes                   |
| `PUT`    | `/api/alerts/:id`         | Résoudre une alerte                  |
| `DELETE` | `/api/alerts/:id`         | Supprimer une alerte                 |
| `GET`    | `/api/mappings`           | Lister les mappings capteurs         |
| `POST`   | `/api/mappings`           | Créer un mapping                     |
| `PATCH`  | `/api/mappings/:id`       | Modifier un mapping (partiel)        |
| `DELETE` | `/api/mappings/:id`       | Supprimer un mapping (soft)          |
| `POST`   | `/api/auth/login`         | Connexion (récupérer le token)       |
| `GET`    | `/api/auth/me`            | Infos de l'utilisateur connecté      |
| `GET`    | `/api/users`              | Lister les utilisateurs (admin)      |
| `POST`   | `/api/users`              | Créer un utilisateur (admin)         |
| `PATCH`  | `/api/users/:id`          | Modifier un utilisateur (admin)      |
| `DELETE` | `/api/users/:id`          | Supprimer un utilisateur (admin)     |
| `GET`    | `/api/live`               | Cache temps réel (dernière trame)    |
| `WS`     | `weather:live`            | Push temps réel via Socket.IO        |
