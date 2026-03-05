#!/usr/bin/env python3
"""
api_server.py – REST API for the Weather Network web frontend

Endpoints:
  GET /api/stations                     List all stations
  GET /api/latest                       Latest measurement for each station
  GET /api/measurements?site=1&limit=50 Recent raw measurements
  GET /api/history?site=1&hours=24      Hourly aggregates
  GET /api/compare?hours=24             All sites, hourly averages side-by-side
  GET /api/images?site=1&limit=5        Recent sky images metadata
  GET /images/<filename>                Serve a sky image

Run:
  python3 api_server.py --config /etc/weather/config.ini
"""

import argparse
import configparser
import os
import sys
from datetime import datetime, timezone

import pymysql
import pymysql.cursors
from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Global config & DB ───────────────────────────────────────────────────────
_cfg: configparser.ConfigParser = None
_image_dir: str = "/var/weather/images"


def get_db():
    db = _cfg["database"]
    return pymysql.connect(
        host=db["host"],
        port=int(db["port"]),
        user=db["user"],
        password=db["password"],
        database=db["database"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )


def rows_to_json(rows):
    """Convert pymysql rows (may contain datetime objects) to JSON-safe dicts."""
    result = []
    for row in rows:
        clean = {}
        for k, v in row.items():
            if isinstance(v, datetime):
                clean[k] = v.isoformat()
            else:
                clean[k] = v
        result.append(clean)
    return result


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/stations")
def stations():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM sites ORDER BY id")
            return jsonify(cur.fetchall())


@app.route("/api/latest")
def latest():
    """Return the most recent measurement for every station."""
    sql = """
        SELECT m.*, s.name AS site_name, s.city
        FROM measurements m
        JOIN sites s ON s.id = m.site_id
        WHERE m.id = (
            SELECT id FROM measurements m2
            WHERE m2.site_id = m.site_id
            ORDER BY received_at DESC LIMIT 1
        )
        ORDER BY m.site_id
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            return jsonify(rows_to_json(cur.fetchall()))


@app.route("/api/measurements")
def measurements():
    site_id = request.args.get("site", type=int)
    limit   = min(request.args.get("limit", 50, type=int), 500)

    sql  = "SELECT * FROM measurements"
    args = []
    if site_id:
        sql += " WHERE site_id = %s"
        args.append(site_id)
    sql += " ORDER BY received_at DESC LIMIT %s"
    args.append(limit)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return jsonify(rows_to_json(cur.fetchall()))


@app.route("/api/history")
def history():
    site_id = request.args.get("site", type=int)
    hours   = min(request.args.get("hours", 24, type=int), 720)  # max 30 days

    sql  = """
        SELECT hs.*, s.name AS site_name
        FROM hourly_stats hs
        JOIN sites s ON s.id = hs.site_id
        WHERE hs.hour_start >= NOW() - INTERVAL %s HOUR
    """
    args = [hours]
    if site_id:
        sql += " AND hs.site_id = %s"
        args.append(site_id)
    sql += " ORDER BY hs.site_id, hs.hour_start"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return jsonify(rows_to_json(cur.fetchall()))


@app.route("/api/compare")
def compare():
    """Return hourly averages for all sites, suitable for a comparison chart."""
    hours = min(request.args.get("hours", 24, type=int), 720)
    sql = """
        SELECT
            DATE_FORMAT(hs.hour_start, '%Y-%m-%dT%H:00:00') AS hour,
            s.name   AS site_name,
            s.id     AS site_id,
            hs.temp_avg,
            hs.temp_min,
            hs.temp_max,
            hs.humidity_avg,
            hs.pressure_avg,
            hs.lux_avg,
            hs.sample_count
        FROM hourly_stats hs
        JOIN sites s ON s.id = hs.site_id
        WHERE hs.hour_start >= NOW() - INTERVAL %s HOUR
        ORDER BY hs.hour_start, hs.site_id
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, [hours])
            return jsonify(rows_to_json(cur.fetchall()))


@app.route("/api/images")
def images():
    site_id = request.args.get("site", type=int)
    limit   = min(request.args.get("limit", 5, type=int), 50)

    sql  = "SELECT * FROM sky_images"
    args = []
    if site_id:
        sql += " WHERE site_id = %s"
        args.append(site_id)
    sql += " ORDER BY captured_at DESC LIMIT %s"
    args.append(limit)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            rows = rows_to_json(cur.fetchall())
            # Add URL for each image
            for row in rows:
                row["url"] = f"/images/{row['filename']}"
            return jsonify(rows)


@app.route("/images/<path:filename>")
def serve_image(filename):
    # Prevent path traversal
    safe = os.path.normpath(filename)
    if safe.startswith("..") or safe.startswith("/"):
        abort(400)
    return send_from_directory(_image_dir, safe)


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ─── Entry point ─────────────────────────────────────────────────────────────
def main():
    global _cfg, _image_dir

    parser = argparse.ArgumentParser(description="Weather Network API server")
    parser.add_argument("--config", default="/etc/weather/config.ini")
    args = parser.parse_args()

    _cfg = configparser.ConfigParser()
    _cfg.read_dict({
        "database": {"host": "localhost", "port": "3306",
                     "user": "weather", "password": "", "database": "weather_network"},
        "api":      {"host": "0.0.0.0", "port": "5000"},
        "storage":  {"image_dir": "/var/weather/images"},
    })
    if os.path.exists(args.config):
        _cfg.read(args.config)

    _image_dir = _cfg["storage"]["image_dir"]

    app.run(
        host=_cfg["api"]["host"],
        port=int(_cfg["api"]["port"]),
        debug=False,
    )


if __name__ == "__main__":
    main()
