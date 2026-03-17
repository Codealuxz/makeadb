const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'makeadb.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    container_id TEXT,
    port INTEGER UNIQUE,
    username TEXT,
    password TEXT,
    db_name TEXT,
    connection_url TEXT,
    status TEXT DEFAULT 'creating',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
