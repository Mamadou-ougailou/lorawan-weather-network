# Interface Web (React) pour le Réseau Météo LoRaWAN

Ce dossier contient l'interface utilisateur finalisée en **React 19** propulsée par **Vite**.

## Caractéristiques
- **Statut en temps réel** des capteurs météo via l'API (Mougins, Grasse, Nice)
- Graphiques **Chart.js** pour la température de la journée en direct (`WeatherChart.jsx`)
- Interface Premium "Glassmorphism" avec **animations fluides** (`index.css`)
- **Adaptatif (Responsive)** pour une consultation optimale sur téléphone mobile
- **Cartographie interactive** via Leaflet et OpenStreetMap

## Comment la lancer en développement

Assurez-vous d'avoir Node.js installé, puis depuis le dossier `react-app/` :

```bash
npm install # Installer les dépendances
npm run dev # Démarrer le serveur Vite avec Hot Reload
```

Rendez-vous sur [http://localhost:5173](http://localhost:5173) dans votre navigateur.
*(Besoins préalables : l'API et la base de données MariaDB doivent fonctionner)*

## Production / Docker
Cette application possède son propre `Dockerfile` qui génère le build avec Vite (`npm run build`) et le sert avec **Nginx** sur le port 80 de l'hôte Docker.
Il suffit d'exécuter `docker compose up -d --build` depuis la racine du projet principal pour que l'interface globale soit en ligne sur http://localhost/.
