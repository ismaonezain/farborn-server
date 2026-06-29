import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'farborn.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    fid INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    wallet TEXT NOT NULL,
    hero_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    class TEXT DEFAULT 'warrior',
    zone INTEGER DEFAULT 1,
    gold INTEGER DEFAULT 0,
    total_gold_earned INTEGER DEFAULT 0,
    equipped TEXT DEFAULT '{}',
    bag TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gold_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fid INTEGER NOT NULL,
    gold_spent INTEGER NOT NULL,
    tokens_claimed INTEGER NOT NULL,
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fid) REFERENCES players(fid)
  );

  CREATE TABLE IF NOT EXISTS login_tokens (
    fid INTEGER PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketplace_listings (
    listing_id INTEGER PRIMARY KEY,
    seller_fid INTEGER NOT NULL,
    buyer_fid INTEGER,
    item_id INTEGER NOT NULL,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    sold_at TEXT
  );

  CREATE TABLE IF NOT EXISTS anti_cheat (
    fid INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS global_economy (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_gold_supply INTEGER DEFAULT 0,
    total_farborn_burned INTEGER DEFAULT 0,
    recent_claims INTEGER DEFAULT 0,
    recent_purchases INTEGER DEFAULT 0,
    avg_gold_per_level INTEGER DEFAULT 1000,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price INTEGER NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gold_sink_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fid INTEGER NOT NULL,
    sink_type TEXT NOT NULL,
    gold_amount INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );


  CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet);
  CREATE INDEX IF NOT EXISTS idx_claims_fid ON gold_claims(fid);
  CREATE INDEX IF NOT EXISTS idx_claims_date ON gold_claims(created_at);
  CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status);
`);

export default db;
