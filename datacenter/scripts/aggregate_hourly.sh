#!/bin/bash
# aggregate_hourly.sh
# Cron job that refreshes the hourly_stats materialised table.
# Add to cron:  0 * * * * /opt/weather/datacenter/scripts/aggregate_hourly.sh

set -euo pipefail

CONFIG="/etc/weather/config.ini"

# Read DB credentials from config
DB_HOST=$(awk -F= '/^\[database\]/,/^\[/ { if (/^host/) print $2 }' "$CONFIG" | tr -d ' ' | head -1)
DB_PORT=$(awk -F= '/^\[database\]/,/^\[/ { if (/^port/) print $2 }' "$CONFIG" | tr -d ' ' | head -1)
DB_USER=$(awk -F= '/^\[database\]/,/^\[/ { if (/^user/) print $2 }' "$CONFIG" | tr -d ' ' | head -1)
DB_PASS=$(awk -F= '/^\[database\]/,/^\[/ { if (/^password/) print $2 }' "$CONFIG" | tr -d ' ' | head -1)
DB_NAME=$(awk -F= '/^\[database\]/,/^\[/ { if (/^database/) print $2 }' "$CONFIG" | tr -d ' ' | head -1)

# Refresh last 25 hours to cover the current and previous hour
mysql -h "${DB_HOST:-localhost}" \
      -P "${DB_PORT:-3306}" \
      -u "${DB_USER:-weather}" \
      -p"${DB_PASS}" \
      "${DB_NAME:-weather_network}" \
      -e "CALL refresh_hourly_stats(25);" 2>/dev/null

echo "$(date -Iseconds) hourly stats refreshed"
