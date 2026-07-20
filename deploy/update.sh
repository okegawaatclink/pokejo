#!/usr/bin/env bash
# 更新デプロイスクリプト（2回目以降。EC2上で実行）
# 使い方: bash update.sh

set -euo pipefail

APP_DIR="$HOME/apps/poke-jou-app"
SERVICE_NAME="pokejou"

cd "$APP_DIR"
git pull --ff-only
npm ci
npm run build
sudo systemctl restart ${SERVICE_NAME}
sleep 2
sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -10
