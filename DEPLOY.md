# EC2デプロイ手順

対象インスタンス:

- Instance ID: `i-09c623d3cadd54e29`（他サイト/DBと共用中の既存インスタンス）
- OS: Amazon Linux 2023
- Public DNS: `ec2-57-183-16-181.ap-northeast-1.compute.amazonaws.com`
- SSH鍵: `~/.ssh/signiaweb.pem`（ユーザー: `ec2-user`）
- GitHubリポジトリ: `https://github.com/okegawaatclink/pokejo.git`（public）

共用サーバーのため、専用ディレクトリ（`~/apps/poke-jou-app`）・専用ポート（`3001`）・
専用systemdサービス名（`pokejou`）・専用nginx設定ファイル（`/etc/nginx/conf.d/pokejou.conf`）で
既存の設定に影響しないようにしています。

## 事前の注意事項

- このインスタンスにはElastic IPが割り当てられていません。再起動すると公開IP/ホスト名が
  変わる可能性があります。固定したい場合は `deploy/aws-prep.sh`内の案内を参照してください。
- セキュリティグループには現在 `3306番(MySQL)` が全世界に公開されています。今回の作業とは
  別件ですが、他用途で不要であれば絞ることをおすすめします。
- 手順1・4はローカルPC、手順2・3・5〜8はEC2上（SSH接続後）で実行します。

## 手順

### 1. セキュリティグループで 80/443 を開放（ローカルPCで実行）

```bash
bash deploy/aws-prep.sh
```

確認プロンプトが出るので `y` で実行します。

### 2. EC2にSSH接続

```bash
ssh -i ~/.ssh/signiaweb.pem ec2-user@ec2-57-183-16-181.ap-northeast-1.compute.amazonaws.com
```

### 3. リポジトリの取得とセットアップスクリプト実行

初回のみ、setup.shを取得して実行します（まだEC2上にコードがないので、スクリプトだけ
curlで取得します）。

```bash
curl -o setup.sh https://raw.githubusercontent.com/okegawaatclink/pokejo/main/deploy/setup.sh
bash setup.sh
```

このスクリプトが行うこと:

- 空いているポート確認（3001番が使用中なら停止して知らせます）
- Node.js 20 / nginx のインストール（未導入の場合のみ）
- リポジトリのclone、`.env`自動生成（管理画面パスコードをランダム生成）
- `npm ci && npm run build`（t3.microはメモリ1GBのため、必要なら1GBスワップを自動作成）
- systemdサービス `pokejou` の登録・起動
- nginxリバースプロキシ設定の追加（このホスト名専用、他のserver blockには触れません）

実行後、表示された **管理画面パスコード** を必ず控えてください（`.env`にも保存されています）。

### 4. 動作確認（ローカルPCまたはブラウザ）

```
http://ec2-57-183-16-181.ap-northeast-1.compute.amazonaws.com/
```

が表示されればOKです。

### 5. HTTPS化（EC2上で実行）

```bash
bash setup.sh # まだの場合
curl -o certbot.sh https://raw.githubusercontent.com/okegawaatclink/pokejo/main/deploy/certbot.sh
bash certbot.sh
```

Let's EncryptがAWSのデフォルトDNS名に対して証明書を発行できない場合、このステップは
失敗します。その場合は独自ドメインの取得をご検討ください（このアプリのAWSアカウントには
現在Route53のホストゾーンが存在しませんでした）。

### 6. 今後の更新デプロイ

コードを更新した場合はEC2上で:

```bash
cd ~/apps/poke-jou-app
bash deploy/update.sh
```

## トラブルシューティング

```bash
# アプリのログ
sudo journalctl -u pokejou -f

# nginxのエラーログ
sudo tail -f /var/log/nginx/error.log

# サービス再起動
sudo systemctl restart pokejou
```

## 既知の注意点

- `data/app.db` はSQLiteファイルで、EC2上のEBSボリュームに保存されます（インスタンス
  terminate時は失われるため、必要であれば定期的にS3等へバックアップしてください）。
- アップロード画像 (`public/uploads`) も同様にEBS上に保存されます。
- リポジトリに `data/app.db-shm` / `data/app.db-wal` という開発時の一時ファイルが誤って
  コミットされています。実害はほぼありませんが、気になる場合は削除してコミットしてください。
