import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __pokeJouDb: Database.Database | undefined;
}

type LegacyCastRow = {
  id: string;
  name: string;
  imageUrl?: string | null;
  rarity?: string | null;
  flavorText?: string | null;
};

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as { name: string }[];
  return columns.some((column) => column.name === columnName);
}

function ensureCastQrTokens(db: Database.Database) {
  if (!hasColumn(db, "Cast", "qrToken")) {
    db.exec("ALTER TABLE Cast ADD COLUMN qrToken TEXT;");
  }

  const casts = db
    .prepare("SELECT id, qrToken FROM Cast")
    .all() as { id: string; qrToken: string | null }[];
  const updateToken = db.prepare("UPDATE Cast SET qrToken = ? WHERE id = ?");

  for (const cast of casts) {
    if (!cast.qrToken) {
      updateToken.run(newId(), cast.id);
    }
  }

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_cast_qr_token ON Cast (qrToken);");
}

function migrateLegacyCards(db: Database.Database) {
  if (!hasColumn(db, "Cast", "imageUrl")) {
    return;
  }

  const legacyCasts = db
    .prepare(
      `SELECT id, name, imageUrl, rarity, flavorText
       FROM Cast
       WHERE imageUrl IS NOT NULL AND TRIM(imageUrl) != ''`
    )
    .all() as LegacyCastRow[];

  const hasCardsStmt = db.prepare("SELECT 1 FROM Card WHERE castId = ? LIMIT 1");
  const createCardStmt = db.prepare(
    `INSERT INTO Card (id, castId, title, imageUrl, rarity, flavorText, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const legacyCast of legacyCasts) {
    if (hasCardsStmt.get(legacyCast.id)) {
      continue;
    }

    createCardStmt.run(
      newId(),
      legacyCast.id,
      "基本カード",
      legacyCast.imageUrl,
      legacyCast.rarity || "N",
      legacyCast.flavorText || null,
      new Date().toISOString()
    );
  }
}

function migrateLegacyAcquisitions(db: Database.Database) {
  if (hasColumn(db, "Acquisition", "cardId")) {
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_acq_lookup ON Acquisition (deviceId, type, acquiredOn, storeId, castId);"
    );
    return;
  }

  db.exec(`
    CREATE TABLE Acquisition_new (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL REFERENCES Device(id) ON DELETE CASCADE,
      storeId TEXT NOT NULL REFERENCES Store(id) ON DELETE CASCADE,
      castId TEXT NOT NULL REFERENCES Cast(id) ON DELETE CASCADE,
      cardId TEXT NOT NULL REFERENCES Card(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      acquiredOn TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  db.exec(`
    INSERT INTO Acquisition_new (id, deviceId, storeId, castId, cardId, type, acquiredOn, createdAt)
    SELECT
      a.id,
      a.deviceId,
      a.storeId,
      a.castId,
      (
        SELECT card.id
        FROM Card card
        WHERE card.castId = a.castId
        ORDER BY card.createdAt ASC, card.id ASC
        LIMIT 1
      ) as cardId,
      CASE a.type
        WHEN 'random' THEN 'store'
        WHEN 'targeted' THEN 'cast'
        ELSE a.type
      END,
      a.acquiredOn,
      a.createdAt
    FROM Acquisition a;
  `);

  db.exec("DROP TABLE Acquisition;");
  db.exec("ALTER TABLE Acquisition_new RENAME TO Acquisition;");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_acq_lookup ON Acquisition (deviceId, type, acquiredOn, storeId, castId);"
  );
}

function ensureCardOddsWeight(db: Database.Database) {
  if (!hasColumn(db, "Card", "oddsWeight")) {
    db.exec("ALTER TABLE Card ADD COLUMN oddsWeight REAL NOT NULL DEFAULT 1;");
  }
}

function normalizeOddsWeight(value: unknown): number {
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight <= 0) return 1;
  return weight;
}

function getDb(): Database.Database {
  if (!global.__pokeJouDb) {
    const db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS Device (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS Store (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qrToken TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS Cast (
        id TEXT PRIMARY KEY,
        storeId TEXT NOT NULL REFERENCES Store(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        qrToken TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS Card (
        id TEXT PRIMARY KEY,
        castId TEXT NOT NULL REFERENCES Cast(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        imageUrl TEXT NOT NULL,
        oddsWeight REAL NOT NULL DEFAULT 1,
        rarity TEXT NOT NULL DEFAULT 'N',
        flavorText TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS Acquisition (
        id TEXT PRIMARY KEY,
        deviceId TEXT NOT NULL REFERENCES Device(id) ON DELETE CASCADE,
        storeId TEXT NOT NULL REFERENCES Store(id) ON DELETE CASCADE,
        castId TEXT NOT NULL REFERENCES Cast(id) ON DELETE CASCADE,
        cardId TEXT NOT NULL REFERENCES Card(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        acquiredOn TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    ensureCastQrTokens(db);
    migrateLegacyCards(db);
    ensureCardOddsWeight(db);
    migrateLegacyAcquisitions(db);
    db.exec("CREATE INDEX IF NOT EXISTS idx_card_cast ON Card (castId, createdAt);");
    global.__pokeJouDb = db;
  }
  return global.__pokeJouDb;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function todayJst(): string {
  // 1日区切りを JST 00:00 ではなく JST 12:00 にするため、
  // 判定用時刻を12時間戻してから日付キー(YYYY-MM-DD)を作る。
  const shifted = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(shifted);
}

export function ensureDevice(deviceId: string) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM Device WHERE id = ?").get(deviceId);
  if (!existing) {
    db.prepare("INSERT INTO Device (id, createdAt) VALUES (?, ?)").run(
      deviceId,
      new Date().toISOString()
    );
  }
}

export type StoreRow = {
  id: string;
  name: string;
  qrToken: string;
  createdAt: string;
};

export function createStore(name: string): StoreRow {
  const db = getDb();
  const id = newId();
  const qrToken = newId();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO Store (id, name, qrToken, createdAt) VALUES (?, ?, ?, ?)"
  ).run(id, name, qrToken, createdAt);
  return { id, name, qrToken, createdAt };
}

export function listStores(): (StoreRow & { castCount: number; cardCount: number })[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         s.*,
         COUNT(DISTINCT c.id) as castCount,
         COUNT(card.id) as cardCount
       FROM Store s
       LEFT JOIN Cast c ON c.storeId = s.id
       LEFT JOIN Card card ON card.castId = c.id
       GROUP BY s.id
       ORDER BY s.createdAt DESC`
    )
    .all()
    .map((row: any) => ({ ...row })) as (StoreRow & {
    castCount: number;
    cardCount: number;
  })[];
}

export function getStoreByToken(qrToken: string): StoreRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM Store WHERE qrToken = ?").get(qrToken) as
    | StoreRow
    | undefined;
}

export function getStoreById(id: string): StoreRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM Store WHERE id = ?").get(id) as
    | StoreRow
    | undefined;
}

export function updateStoreName(id: string, name: string): StoreRow | undefined {
  const db = getDb();
  db.prepare("UPDATE Store SET name = ? WHERE id = ?").run(name, id);
  return getStoreById(id);
}

export type CastRow = {
  id: string;
  storeId: string;
  name: string;
  qrToken: string;
  createdAt: string;
};

export type CastSummaryRow = CastRow & {
  cardCount: number;
};

export function createCast(input: { storeId: string; name: string }): CastRow {
  const db = getDb();
  const id = newId();
  const qrToken = newId();
  const createdAt = new Date().toISOString();

  // 旧スキーマ( imageUrl 必須 )が残っているDBでも嬢追加できるよう互換INSERTを行う。
  if (hasColumn(db, "Cast", "imageUrl")) {
    db.prepare(
      `INSERT INTO Cast (id, storeId, name, imageUrl, rarity, flavorText, qrToken, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.storeId, input.name, "", "N", null, qrToken, createdAt);
  } else {
    db.prepare(
      `INSERT INTO Cast (id, storeId, name, qrToken, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, input.storeId, input.name, qrToken, createdAt);
  }

  return {
    id,
    storeId: input.storeId,
    name: input.name,
    qrToken,
    createdAt,
  };
}

export function listCastsByStore(storeId: string): CastSummaryRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.*, COUNT(card.id) as cardCount
       FROM Cast c
       LEFT JOIN Card card ON card.castId = c.id
       WHERE c.storeId = ?
       GROUP BY c.id
       ORDER BY c.createdAt ASC`
    )
    .all(storeId)
    .map((row: any) => ({ ...row })) as CastSummaryRow[];
}

export function getCastById(id: string): CastRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM Cast WHERE id = ?").get(id) as CastRow | undefined;
}

export function updateCastName(id: string, name: string): CastRow | undefined {
  const db = getDb();
  db.prepare("UPDATE Cast SET name = ? WHERE id = ?").run(name, id);
  return getCastById(id);
}

export function getCastByToken(qrToken: string): CastRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM Cast WHERE qrToken = ?").get(qrToken) as
    | CastRow
    | undefined;
}

export type CardRow = {
  id: string;
  castId: string;
  title: string;
  imageUrl: string;
  oddsWeight: number;
  rarity: string;
  flavorText: string | null;
  createdAt: string;
  castName?: string;
  storeId?: string;
  storeName?: string;
};

export function createCard(input: {
  castId: string;
  title: string;
  imageUrl: string;
  oddsWeight?: number;
  rarity: string;
  flavorText?: string;
}): CardRow {
  const db = getDb();
  const id = newId();
  const createdAt = new Date().toISOString();
  const oddsWeight = normalizeOddsWeight(input.oddsWeight);
  db.prepare(
    `INSERT INTO Card (id, castId, title, imageUrl, oddsWeight, rarity, flavorText, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.castId,
    input.title,
    input.imageUrl,
    oddsWeight,
    input.rarity || "N",
    input.flavorText || null,
    createdAt
  );
  return {
    id,
    castId: input.castId,
    title: input.title,
    imageUrl: input.imageUrl,
    oddsWeight,
    rarity: input.rarity || "N",
    flavorText: input.flavorText || null,
    createdAt,
  };
}

export function listCardsByStore(storeId: string): CardRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT card.*, c.name as castName, s.id as storeId, s.name as storeName
       FROM Card card
       JOIN Cast c ON c.id = card.castId
       JOIN Store s ON s.id = c.storeId
       WHERE s.id = ?
       ORDER BY c.createdAt ASC, card.createdAt ASC`
    )
    .all(storeId)
    .map((row: any) => ({
      ...row,
      oddsWeight: normalizeOddsWeight(row.oddsWeight),
    })) as CardRow[];
}

export function listCardsByCast(castId: string): CardRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT card.*, c.name as castName, s.id as storeId, s.name as storeName
       FROM Card card
       JOIN Cast c ON c.id = card.castId
       JOIN Store s ON s.id = c.storeId
       WHERE c.id = ?
       ORDER BY card.createdAt ASC`
    )
    .all(castId)
    .map((row: any) => ({
      ...row,
      oddsWeight: normalizeOddsWeight(row.oddsWeight),
    })) as CardRow[];
}

export function getCardById(id: string): CardRow | undefined {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT card.*, c.name as castName, s.id as storeId, s.name as storeName
       FROM Card card
       JOIN Cast c ON c.id = card.castId
       JOIN Store s ON s.id = c.storeId
       WHERE card.id = ?`
    )
    .get(id) as CardRow | undefined;

  if (!row) return undefined;
  return {
    ...row,
    oddsWeight: normalizeOddsWeight(row.oddsWeight),
  };
}

export function updateCard(input: {
  id: string;
  title: string;
  oddsWeight: number;
  rarity: string;
  flavorText?: string;
}): CardRow | undefined {
  const db = getDb();
  const oddsWeight = normalizeOddsWeight(input.oddsWeight);
  db.prepare(
    `UPDATE Card
     SET title = ?, oddsWeight = ?, rarity = ?, flavorText = ?
     WHERE id = ?`
  ).run(
    input.title,
    oddsWeight,
    input.rarity || "N",
    input.flavorText || null,
    input.id
  );
  return getCardById(input.id);
}

export type AcquisitionType = "store" | "cast";

export type AcquisitionRow = {
  id: string;
  deviceId: string;
  storeId: string;
  castId: string;
  cardId: string;
  type: string;
  acquiredOn: string;
  createdAt: string;
};

function findTodayAcquisitionByTarget(input: {
  deviceId: string;
  type: AcquisitionType;
  day: string;
  storeId?: string;
  castId?: string;
}): AcquisitionRow | undefined {
  const db = getDb();

  if (input.type === "store") {
    return db
      .prepare(
        `SELECT * FROM Acquisition
         WHERE deviceId = ? AND storeId = ? AND type = ? AND acquiredOn = ?`
      )
      .get(input.deviceId, input.storeId, input.type, input.day) as
      | AcquisitionRow
      | undefined;
  }

  return db
    .prepare(
      `SELECT * FROM Acquisition
       WHERE deviceId = ? AND castId = ? AND type = ? AND acquiredOn = ?`
    )
    .get(input.deviceId, input.castId, input.type, input.day) as
    | AcquisitionRow
    | undefined;
}

export function findTodayStoreAcquisition(
  deviceId: string,
  storeId: string,
  day: string
): AcquisitionRow | undefined {
  return findTodayAcquisitionByTarget({ deviceId, storeId, type: "store", day });
}

export function findTodayCastAcquisition(
  deviceId: string,
  castId: string,
  day: string
): AcquisitionRow | undefined {
  return findTodayAcquisitionByTarget({ deviceId, castId, type: "cast", day });
}

export function findTodayCastAcquisitionByStore(
  deviceId: string,
  storeId: string,
  day: string
): AcquisitionRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM Acquisition
       WHERE deviceId = ? AND storeId = ? AND type = ? AND acquiredOn = ?`
    )
    .get(deviceId, storeId, "cast", day) as AcquisitionRow | undefined;
}

export function createAcquisition(input: {
  deviceId: string;
  storeId: string;
  castId: string;
  cardId: string;
  type: AcquisitionType;
  day: string;
}): AcquisitionRow {
  const db = getDb();
  const id = newId();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO Acquisition (id, deviceId, storeId, castId, cardId, type, acquiredOn, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.deviceId,
    input.storeId,
    input.castId,
    input.cardId,
    input.type,
    input.day,
    createdAt
  );
  return {
    id,
    deviceId: input.deviceId,
    storeId: input.storeId,
    castId: input.castId,
    cardId: input.cardId,
    type: input.type,
    acquiredOn: input.day,
    createdAt,
  };
}

export type CollectedCard = CardRow & {
  castName: string;
  storeName: string;
  type: string;
  acquiredOn: string;
  acquisitionCreatedAt: string;
};

export function listCollectionForDevice(deviceId: string): CollectedCard[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         card.*, c.name as castName, s.name as storeName,
         a.type as type, a.acquiredOn as acquiredOn, a.createdAt as acquisitionCreatedAt
       FROM Acquisition a
       JOIN Card card ON card.id = a.cardId
       JOIN Cast c ON c.id = a.castId
       JOIN Store s ON s.id = a.storeId
       WHERE a.deviceId = ?
       GROUP BY card.id
       ORDER BY MIN(a.createdAt) ASC`
    )
    .all(deviceId)
    .map((row: any) => ({ ...row })) as CollectedCard[];
}

export function isCardCollected(deviceId: string, cardId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM Acquisition WHERE deviceId = ? AND cardId = ? LIMIT 1")
    .get(deviceId, cardId);
  return !!row;
}

export type StoreCollectionCard = CardRow & {
  collected: boolean;
  type: string | null;
  acquiredOn: string | null;
  acquisitionCreatedAt: string | null;
};

export type StoreCollection = {
  storeId: string;
  storeName: string;
  totalCount: number;
  collectedCount: number;
  cards: StoreCollectionCard[];
};

export function listStoreCollectionsForDevice(
  deviceId?: string
): StoreCollection[] {
  const db = getDb();
  const stores = db
    .prepare("SELECT id, name FROM Store ORDER BY createdAt DESC")
    .all() as { id: string; name: string }[];

  if (stores.length === 0) {
    return [];
  }

  const cardsWithAcquisitionStmt = db.prepare(
    `SELECT
       card.*, c.name as castName, s.id as storeId, s.name as storeName,
       a.type as type, a.acquiredOn as acquiredOn, a.createdAt as acquisitionCreatedAt
     FROM Card card
     JOIN Cast c ON c.id = card.castId
     JOIN Store s ON s.id = c.storeId
     LEFT JOIN Acquisition a ON a.id = (
       SELECT a2.id
       FROM Acquisition a2
       WHERE a2.deviceId = ? AND a2.cardId = card.id
       ORDER BY a2.createdAt ASC, a2.id ASC
       LIMIT 1
     )
     WHERE s.id = ?
     ORDER BY c.createdAt ASC, card.createdAt ASC`
  );

  const cardsOnlyStmt = db.prepare(
    `SELECT card.*, c.name as castName, s.id as storeId, s.name as storeName
     FROM Card card
     JOIN Cast c ON c.id = card.castId
     JOIN Store s ON s.id = c.storeId
     WHERE s.id = ?
     ORDER BY c.createdAt ASC, card.createdAt ASC`
  );

  return stores.map((store) => {
    const rows = deviceId
      ? (cardsWithAcquisitionStmt.all(deviceId, store.id) as any[])
      : (cardsOnlyStmt.all(store.id) as any[]);

    const cards = rows.map((row) => ({
      ...row,
      collected: !!row.acquisitionCreatedAt,
      type: row.type ?? null,
      acquiredOn: row.acquiredOn ?? null,
      acquisitionCreatedAt: row.acquisitionCreatedAt ?? null,
    })) as StoreCollectionCard[];

    const collectedCount = cards.filter((card) => card.collected).length;
    return {
      storeId: store.id,
      storeName: store.name,
      totalCount: cards.length,
      collectedCount,
      cards,
    };
  });
}
