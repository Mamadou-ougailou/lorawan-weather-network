#!/usr/bin/env bash
# dev/start_dev.sh – One-command dev environment launcher
# Starts MariaDB in Docker, installs Python deps, and runs the API server.
set -euo pipefail
cd "$(dirname "$0")"

DEV_DIR="$(pwd)"
ROOT_DIR="$(dirname "$DEV_DIR")"

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $*"; }

# ─── 1. Start MariaDB ────────────────────────────────────────────────────────
info "Starting MariaDB container …"
docker compose -f docker-compose.dev.yml up -d

info "Waiting for MariaDB to become healthy …"
for i in $(seq 1 30); do
    if docker exec weather-dev-db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1; then
        info "MariaDB is ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        warn "Timed out waiting for MariaDB. Check: docker logs weather-dev-db"
        exit 1
    fi
    sleep 2
done

# ─── 2. Create image directory (for sky-image endpoint) ──────────────────────
mkdir -p /tmp/weather-images

# ─── 3. Python virtual environment ───────────────────────────────────────────
VENV_DIR="$DEV_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    info "Creating Python virtual environment …"
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install -q -r "$ROOT_DIR/datacenter/requirements.txt"

# ─── 4. Start the API server ─────────────────────────────────────────────────
info "Starting Flask API server on http://localhost:5000"
info "Frontend available at: http://localhost:5000  (serve with a separate step — see README)"
echo ""
python3 "$ROOT_DIR/web/backend/api_server.py" --config "$DEV_DIR/config.dev.ini"
