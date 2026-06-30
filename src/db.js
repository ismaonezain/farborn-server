import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://farborn-ismaonezain.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize schema — execute one statement at a time (Turso HTTP doesn't support executeMultiple)
const schema = [
  `CREATE TABLE IF NOT EXISTS players (
    fid INTEGER PRIMARY KEY, username TEXT NOT NULL, wallet TEXT NOT NULL,
    hero_name TEXT NOT NULL, level INTEGER DEFAULT 1, class TEXT DEFAULT 'warrior',
    zone INTEGER DEFAULT 1, gold INTEGER DEFAULT 0, total_gold_earned INTEGER DEFAULT 0,
    equipped TEXT DEFAULT '{}', bag TEXT DEFAULT '[]',
    exp INTEGER DEFAULT 0, upg TEXT DEFAULT '{}', skillIdx INTEGER DEFAULT 0,
    totalKills INTEGER DEFAULT 0, zoneKills INTEGER DEFAULT 0,
    prestige INTEGER DEFAULT 0, prestigeMult REAL DEFAULT 1.0,
    last_online TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS gold_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fid INTEGER NOT NULL,
    gold_spent INTEGER NOT NULL, tokens_claimed INTEGER NOT NULL,
    tx_hash TEXT, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fid) REFERENCES players(fid)
  )`,
  `CREATE TABLE IF NOT EXISTS login_tokens (
    fid INTEGER PRIMARY KEY, token TEXT NOT NULL,
    expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_listings (
    listing_id INTEGER PRIMARY KEY, seller_fid INTEGER NOT NULL, buyer_fid INTEGER,
    item_id INTEGER NOT NULL, price INTEGER NOT NULL, status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')), sold_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS anti_cheat (
    fid INTEGER NOT NULL, event_type TEXT NOT NULL, event_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS global_economy (
    id INTEGER PRIMARY KEY CHECK (id = 1), total_gold_supply INTEGER DEFAULT 0,
    total_farborn_burned INTEGER DEFAULT 0, recent_claims INTEGER DEFAULT 0,
    recent_purchases INTEGER DEFAULT 0, avg_gold_per_level INTEGER DEFAULT 1000,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, price INTEGER NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS gold_sink_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fid INTEGER NOT NULL,
    sink_type TEXT NOT NULL, gold_amount INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS token_prices (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    buy_price INTEGER DEFAULT 10000,
    sell_price INTEGER DEFAULT 9000,
    recent_buys INTEGER DEFAULT 0,
    recent_sells INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
];

// Run schema init (non-blocking, don't crash if fails)
for (const sql of schema) {
  db.execute(sql).catch(e => console.warn('Schema warn:', e.message));
}

// Add missing columns for existing databases
const alterStatements = [
  "ALTER TABLE players ADD COLUMN exp INTEGER DEFAULT 0",
  "ALTER TABLE players ADD COLUMN upg TEXT DEFAULT '{}'",
  "ALTER TABLE players ADD COLUMN skillIdx INTEGER DEFAULT 0",
  "ALTER TABLE players ADD COLUMN totalKills INTEGER DEFAULT 0",
  "ALTER TABLE players ADD COLUMN zoneKills INTEGER DEFAULT 0",
  "ALTER TABLE players ADD COLUMN prestige INTEGER DEFAULT 0",
  "ALTER TABLE players ADD COLUMN prestigeMult REAL DEFAULT 1.0",
  "ALTER TABLE players ADD COLUMN last_online TEXT DEFAULT NULL",
  "ALTER TABLE players ADD COLUMN potions TEXT DEFAULT '{\"small\":0,\"medium\":0,\"large\":0}'",
];

for (const stmt of alterStatements) {
  db.execute(stmt).catch(e => {
    if (!e.message.includes('duplicate column')) {
      console.warn('Alter warn:', e.message);
    }
  });
}

// Helper: execute and get first row
async function getOne(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows[0] || null;
}

// Helper: execute and get all rows
async function getAll(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows;
}

// Helper: execute and get last insert rowid
async function run(sql, args = []) {
  const result = await db.execute({ sql, args });
  return { lastInsertRowid: result.lastInsertRowid, rowsAffected: result.rowsAffected };
}

export { db, getOne, getAll, run };

// Add UNIQUE indexes for existing databases
const indexStatements = [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_username ON players(username)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token)",
];

for (const stmt of indexStatements) {
  db.execute(stmt).catch(e => {
    if (!e.message.includes('already exists')) {
      console.warn('Index warn:', e.message);
    }
  });
}
