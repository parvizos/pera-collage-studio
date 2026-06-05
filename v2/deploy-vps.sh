#!/usr/bin/env bash
# Деплой v2 (FastAPI) на VPS. Запускать от root:  sudo bash v2/deploy-vps.sh
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Ошибка: запусти от root (sudo)." >&2
  exit 1
fi

APP_DIR="/var/www/pera-collage-studio"
BACKEND_DIR="$APP_DIR/v2/backend"
DATA_DIR="/var/pera-collage-data"
SERVICE="pera-collage"
BRANCH="${1:-main}"

echo "[1/7] Бэкап данных ($DATA_DIR)..."
if [ -d "$DATA_DIR" ]; then
  BK="${DATA_DIR}.backup-$(date +%F-%H%M%S)"
  cp -a "$DATA_DIR" "$BK"
  echo "      Бэкап создан: $BK"
else
  echo "      ВНИМАНИЕ: $DATA_DIR не найден — будет создан пустой при старте."
fi

echo "[2/7] Обновляем код из GitHub (ветка: $BRANCH)..."
cd "$APP_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "[3/7] Python venv и зависимости..."
cd "$BACKEND_DIR"
[ -d ".venv" ] || python3 -m venv .venv
./.venv/bin/pip install --upgrade pip >/dev/null
./.venv/bin/pip install -r requirements.txt

echo "[4/7] Устанавливаем systemd-сервис..."
cp "$APP_DIR/v2/pera-collage.service" /etc/systemd/system/${SERVICE}.service
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1 || true

echo "[5/7] Перезапуск сервиса..."
systemctl restart "$SERVICE"
sleep 2

echo "[6/7] Статус сервиса:"
systemctl --no-pager --full status "$SERVICE" | head -15 || true

echo "[7/7] Проверка приложения:"
curl -s -o /dev/null -w "      /healthz -> %{http_code}\n" http://127.0.0.1:8080/healthz || true

echo ""
echo "Готово. Если /healthz вернул 200 — v2 работает на порту 8080 (через nginx как раньше)."
echo "Открой свой сайт в браузере и проверь."
