# ポケ嬢 - デジタルカードコレクションアプリ（プロトタイプ）

スナック等のキャスト画像をもとにしたポケモンカード風デジタルカード「ポケ嬢」を、
来店時にQRコードを読み取って集められるWebアプリです。

## 主な機能

- QRコード読み取り（カメラ）→ 店舗QRまたは嬢QRへ遷移
- 店舗QR: その店舗に在籍する嬢の全カードからランダムで1枚入手
- 嬢QR: その嬢に紐づく全カードからランダムで1枚入手
- 入手したカードのコレクション一覧・タップで拡大表示
- 管理画面から店舗・嬢・カード種類を階層で登録、各QRコードを発行
- ブラウザCookieによる端末識別（ログイン不要の認証代わり）

## 技術構成

- Next.js 14 (App Router) / React / TypeScript / Tailwind CSS
- DB: `better-sqlite3` によるローカルSQLite
- QRコード生成: `qrcode` / QR読み取り: `html5-qrcode`（ブラウザカメラ使用）

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000/pokejo` にアクセスしてください。

本番起動する場合:

```bash
npm run build
npm run start
```

## 初期設定

1. `.env` の `ADMIN_PASSCODE` を任意の値に変更してください（初期値: `pokejou-admin`）。
2. ブラウザで `/admin` にアクセスし、パスコードでログイン。
3. 「店舗を追加」で店舗を登録。
4. 店舗を選択するとQRコードが表示されるので、店舗に印刷して設置してください。
5. 店舗ごとに「在籍する嬢を登録」から嬢を追加します。
6. 嬢を選択し、「カード種類を登録」から画像・種類名・レアリティを登録します。
7. 必要に応じて嬢QRも印刷して設置してください。

## 使い方（お客様側）

1. トップページまたは `/scan` からQRコードを読み取る。
2. 店舗QRならその店舗の全カードから、嬢QRならその嬢の全カードから1枚入手します。
3. 入手したカードは `/collection` でいつでも見返せます。

店舗QRは1日1回・店舗ごと、嬢QRは1日1回・嬢ごとの制限です（日付は日本時間基準）。同一端末（Cookie）で判定するため、
Cookieを削除したり別ブラウザ・別端末でアクセスすると別ユーザー扱いになります。

## ディレクトリ構成

```
app/
  page.tsx                トップページ
  scan/page.tsx            QRスキャンページ
  store/[token]/page.tsx   店舗ガチャページ
  cast/[token]/page.tsx    嬢ガチャページ
  collection/page.tsx      コレクション一覧
  admin/page.tsx           管理画面
  api/gacha/random         ランダム入手API
  api/gacha/targeted       嬢QR入手API
  api/admin/*              管理用API（店舗・嬢・カード登録、QR発行）
lib/
  db.ts        DBアクセス層（better-sqlite3）
  device.ts    端末Cookie発行・読み取り
  adminAuth.ts 管理画面パスコード認証
components/
  PokeCard.tsx       カードUI
  StoreGacha.tsx     店舗ガチャの操作UI
  CastGacha.tsx      嬢ガチャの操作UI
  CollectionGrid.tsx コレクション一覧＋拡大表示
data/app.db    SQLiteデータベース（自動生成。初回起動時に作成されます）
public/uploads 管理画面からアップロードしたカード画像の保存先
```

## 既知の制限・今後の展望

- 現状はWebアプリのみです。iPhone/Androidアプリ化する場合、React Native (Expo) や
  Capacitor でこのAPIをそのまま流用してネイティブラッパーを作る方法が現実的です。
- 端末識別はブラウザCookieのため、Cookie削除・別ブラウザ利用で識別がリセットされます。
  厳密な不正防止が必要な場合は電話番号認証やLINEログイン等への切り替えを検討してください。
- 画像はサーバーのローカルディスク（`public/uploads`）に保存されます。複数台構成やクラウド
  デプロイ（Vercel等）では、S3やCloudinaryなどの外部ストレージへの切り替えが必要です。
- 管理画面の認証はパスコードのみの簡易実装です。本運用前により堅牢な認証への強化を推奨します。
