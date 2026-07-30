#!/bin/bash
# Auto-restarting wrapper for the VyOS Web Config development server.
# Restarts the server if it crashes (e.g. due to segmentation faults in
# the VyOS Config C extensions).

cd /opt/vyos-web-config || exit 1

while true; do
    python3 scripts/run_server.py --host "${WEB_HOST:-0.0.0.0}" --port "${WEB_PORT:-8080}" >> /tmp/vyos-web.log 2>&1
    exit_code=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] server exited with code ${exit_code}, restarting in 2s..." >> /tmp/vyos-web.log
    sleep 2
done
