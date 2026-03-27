# Réseau météo LoRaWAN – PACA

Réseau de surveillance météorologique reliant trois établissements des Alpes-Maritimes (Mougins, Grasse, Nice) via LoRaWAN. Les capteurs (BME280, TSL2591, caméra) transmettent via TTN → MQTT → MariaDB. Ce dépôt contient le firmware ESP32, le formateur de payload TTN, le subscriber MQTT, et l'API REST + tableau de bord web.

---

## Lancer la stack complète (Docker)

```bash
# Depuis la racine du projet
sudo docker compose up -d --build
```

Démarre **MariaDB** (`:3306`), l'**API Node.js** (`:3000`) et le **Frontend React** (`:80`).
Vous pourrez accéder à l'interface web finale sur `http://localhost`.

```bash
sudo docker compose down   # arrêter la stack
sudo docker compose logs api -f  # voir les logs de l'API
```

---

## Lancer le frontend seul (Mode Développement Vite)
Allez dans le dossier du React et exécutez la commande dev :
```bash
cd web/frontend/react-app
npm install
npm run dev
```
Accès à l'UI sur http://localhost:5173

---

## API – Endpoints

Base URL API : `http://localhost:3000`

| Méthode | Endpoint | Paramètres | Description |
|---------|----------|------------|-------------|
| GET | `/api/stations` | — | Liste des stations |
| GET | `/api/latest` | — | Dernière mesure par station |
| GET | `/api/measurements` | `site`, `limit` (max 500) | Mesures brutes |
| GET | `/api/history` | `site`, `hours` (max 720) | Agrégats horaires |
| GET | `/api/compare` | `hours` (max 720) | Agrégats toutes stations |
| GET | `/api/images` | `site`, `limit` (max 50) | Métadonnées images |
| GET | `/images/:filename` | — | Fichier image |

---

## Structure du backend (`web/backend/`)

```
src/
├── server.js          Point d'entrée Express
├── config.js          Variables d'environnement
├── db.js              Pool MySQL2
├── routes/
│   ├── stations.js
│   ├── measurements.js
│   ├── history.js
│   └── images.js
└── middleware/
    └── errorHandler.js
```

Configuration via variables d'environnement : `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `IMAGE_DIR`.
