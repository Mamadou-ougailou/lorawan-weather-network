# Environnement de développement local (`dev/`)

Ce dossier permet de lancer rapidement une stack locale pour développer et tester le projet :
- MariaDB dans Docker (avec schéma + données de test)
- API Flask locale
- configuration dédiée développement

## Ce que contient le dossier

- `docker-compose.dev.yml` : démarre MariaDB (`weather-dev-db`) sur le port `3306`
- `seed_data.sql` : injecte des données météo factices (48 h, 3 stations)
- `config.dev.ini` : configuration locale API/DB
- `start_dev.sh` : script “one-command” pour démarrer l’environnement

## Prérequis

- Linux/macOS (ou WSL)
- Docker + plugin Compose (`docker compose`)
- Python 3 + `venv`

Vérification rapide :

```bash
docker --version
docker compose version
python3 --version
```

## Démarrage rapide

Depuis la racine du projet :

```bash
cd dev
chmod +x start_dev.sh
./start_dev.sh
```

Le script fait automatiquement :
1. Démarrage de MariaDB via `docker compose -f docker-compose.dev.yml up -d`
2. Attente que la base soit “healthy”
3. Création de `/tmp/weather-images`
4. Création d’un virtualenv dans `dev/.venv` (si absent)
5. Installation des dépendances Python (`datacenter/requirements.txt`)
6. Lancement de l’API sur `http://localhost:5000`

## Tester que ça fonctionne

Dans un autre terminal :

```bash
curl http://localhost:5000/api/stations
curl "http://localhost:5000/api/latest"
```

Vous devez recevoir du JSON.

## Frontend local (optionnel)

Le script `start_dev.sh` ne sert pas le frontend. Pour l’ouvrir localement :

```bash
cd web/frontend
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Arrêter l’environnement

- Arrêter l’API : `Ctrl+C` dans le terminal où tourne `start_dev.sh`
- Arrêter MariaDB :

```bash
cd dev
docker compose -f docker-compose.dev.yml down
```

## Réinitialiser complètement la base de dev

Si vous voulez repartir à zéro (schéma + seed) :

```bash
cd dev
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

Le volume `weather_data` sera recréé, et les scripts d’initialisation rejoués.

## Notes utiles

- La configuration DB utilisée par l’API de dev est dans `dev/config.dev.ini`.
- Les images de ciel en dev pointent vers `/tmp/weather-images`.
- Le broker MQTT n’est pas lancé par ce dossier. Le mode dev est surtout prévu pour tester l’API + frontend avec des données seedées.
