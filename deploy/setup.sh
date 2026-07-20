#!/usr/bin/env bash
# poke-jou-app 初回セットアップスクリプト
# EC2 (Amazon Linux 2023) 上で実行してください: bash setup.sh
#
# このインスタンスは他サイト/DBと共用のため、以下の点に配慮しています。
#  - 専用ディレクトリ・専用ポート・専用systemdサービス名を使用
#  - dnf install は個別パッケージ指定のみ（dnf update -y のような全体更新は行わない）
#  - nginx は conf.d/ に新規ファイルを追加するだけで、既存の設定には触れない

set -euo pipefail

APP_DIR="$HOME/apps/poke-jou-app"
REPO_URL="https://github.com/okegawaatclink/pokejo.git"
APP_PORT=3001
HOSTNAME="ec2-57-183-16-181.ap-northeast-1.compute.amazonaws.com"
SERVICE_NAME="pokejou"

echo "== 1. 事前確認 =="
echo "-- リッスン中のポート --"
sudo ss -tlnp || true
echo "-- ${APP_PORT}番ポートが空いているか --"
if sudo ss -tln | grep -q ":${APP_PORT} "; then
  echo "!! ポート ${APP_PORT} は既に使用中です。APP_PORT を変更して再実行してください。"
  exit 1
fi
echo "-- nginx の有無 --"
if command -v nginx >/dev/null 2>&1; then
  echo "nginx は既にインストール済みです（既存設定は変更しません）"
  NGINX_ALREADY_INSTALLED=1
else
  echo "nginx は未インストールです"
  NGINX_ALREADY_INSTALLED=0
fi

echo "== 2. Node.js のインストール（未インストールの場合のみ） =="
if command -v node >/dev/null 2>&1; then
  echo "node は既にインストール済みです: $(node -v)"
else
  sudo dnf install -y nodejs20 || sudo dnf install -y nodejs
fi
node -v
npm -v
NODE_MAJOR=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "!! Node.js 18以上が必要です（Next.js 14の要件）。現在: $(node -v)"
  echo "!! 手動で新しいNode.jsを入れてから再実行してください。"
  exit 1
fi

echo "== 3. nginx のインストール（未インストールの場合のみ） =="
if [ "$NGINX_ALREADY_INSTALLED" -eq 0 ]; then
  sudo dnf install -y nginx
  sudo systemctl enable --now nginx
fi

echo "== 4. アプリのソース取得 =="
if [ -d "$APP_DIR/.git" ]; then
  echo "既存のクローンを更新します"
  git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "== 5. .env の作成（初回のみ・既存があれば保持） =="
if [ ! -f .env ]; then
  ADMIN_PASSCODE=$(openssl rand -hex 8)
  cat > .env <<EOF
ADMIN_PASSCODE=${ADMIN_PASSCODE}
NODE_ENV=production
EOF
  echo "管理画面パスコードを自動生成しました: ${ADMIN_PASSCODE}"
  echo "（このパスコードは $APP_DIR/.env に保存されています。忘れずに控えてください）"
else
  echo ".env は既に存在するため変更しませんでした"
fi

echo "== 6. 依存関係インストール & ビルド =="
# t3.micro は RAM 1GB のためビルド時にメモリ不足になることがあります。
# 事前に一時スワップを作成しておくと安全です（未作成の場合のみ）。
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  echo "スワップが無いため 1GB の一時スワップファイルを作成します"
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
fi

npm ci
npm run build

echo "== 7. systemd サービスの登録 =="
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=poke-jou-app (Next.js)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/node_modules/.bin/next start -p ${APP_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ${SERVICE_NAME}
sleep 2
sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -15

echo "== 8. nginx リバースプロキシ設定（このホスト名専用、他の設定には影響しません） =="
sudo tee /etc/nginx/conf.d/${SERVICE_NAME}.conf > /dev/null <<EOF
server {
    listen 80;
    server_name ${HOSTNAME};

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "===================================================="
echo "セットアップ完了。以下でアクセスできるか確認してください："
echo "  http://${HOSTNAME}/"
echo ""
echo "続けて HTTPS 化する場合は certbot.sh を実行してください。"
echo "===================================================="
