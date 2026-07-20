#!/usr/bin/env bash
# HTTPS化スクリプト（EC2上で実行、setup.sh 完了後・http://<host>/ が表示確認できてから実行）
#
# 注意: このホスト名はAWSのデフォルト公開DNS名です。Let's Encryptで発行できる場合が
# 多いですが、CAのポリシーにより拒否される可能性もゼロではありません。失敗した場合は
# 独自ドメインの取得をご検討ください。

set -euo pipefail

HOSTNAME="ec2-57-183-16-181.ap-northeast-1.compute.amazonaws.com"

if ! command -v certbot >/dev/null 2>&1; then
  sudo dnf install -y python3 augeas-libs || true
  sudo python3 -m venv /opt/certbot
  sudo /opt/certbot/bin/pip install --upgrade pip
  sudo /opt/certbot/bin/pip install certbot certbot-nginx
  sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
fi

sudo certbot --nginx -d "${HOSTNAME}" --redirect -m "$(whoami)@localhost" --agree-tos -n

echo ""
echo "完了。https://${HOSTNAME}/ でアクセスできるか確認してください。"
echo "証明書の自動更新は certbot が systemd timer (certbot-renew) を自動登録します。"
echo "確認: sudo systemctl list-timers | grep certbot"
