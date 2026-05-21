#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/pera-collage-studio"
SERVICE_NAME="pera-collage"
BRANCH_NAME="${1:-main}"

echo "[1/5] Переходим в папку проекта..."
cd "$APP_DIR"

echo "[2/5] Забираем изменения из GitHub (branch: $BRANCH_NAME)..."
git fetch origin "$BRANCH_NAME"
git reset --hard "origin/$BRANCH_NAME"

echo "[3/5] Перезапускаем сервис..."
systemctl restart "$SERVICE_NAME"

echo "[4/5] Проверяем статус сервиса..."
systemctl --no-pager --full status "$SERVICE_NAME"

echo "[5/5] Готово."
echo "Сайт обновлён из GitHub."
