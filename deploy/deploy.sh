#!/usr/bin/env bash
# LinkPortal - build & deploy script (run ON the Ubuntu server).
# Pulls the latest code, installs deps, builds backend + frontend, applies DB
# migrations and restarts the systemd service. Safe to run repeatedly.
#
# Usage:   sudo -u linkportal APP_DIR=/opt/linkportal bash deploy/deploy.sh
# Override APP_DIR / SERVICE via env vars if your paths differ.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/linkportal}"
SERVICE="${SERVICE:-linkportal}"

echo "==> Updating source in $APP_DIR"
cd "$APP_DIR"
git pull --ff-only

echo "==> Backend: install -> generate -> build -> migrate"
cd "$APP_DIR/backend"
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy   # apply committed migrations (never 'migrate dev' in prod)

echo "==> Frontend: install -> build"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> Restarting service: $SERVICE"
sudo systemctl restart "$SERVICE"
sleep 1
sudo systemctl --no-pager --lines=0 status "$SERVICE" || true

echo "==> Health check"
curl -fsS http://127.0.0.1:4000/api/health && echo

echo "==> Done."
