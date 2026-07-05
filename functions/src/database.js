const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'crossword.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Wrapper that provides a convenient API similar to better-sqlite3
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  prepare(sql) {
    const db = this._db;
    return {
      run(...params) {
        db.run(sql, params);
      },
      get(...params) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this._db.run(sql);
  }

  transaction(fn) {
    const self = this;
    return function(...args) {
      self._db.run('BEGIN TRANSACTION');
      try {
        fn(...args);
        self._db.run('COMMIT');
      } catch (e) {
        self._db.run('ROLLBACK');
        throw e;
      }
    };
  }

  save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

let db = null;

async function initializeDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new DatabaseWrapper(sqlDb);

  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      grid_size INTEGER NOT NULL DEFAULT 15,
      layout TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS puzzles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('low', 'medium', 'high')),
      timer_mode INTEGER DEFAULT 0,
      time_limit_seconds INTEGER DEFAULT 0,
      grid_size INTEGER NOT NULL DEFAULT 15,
      grid_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'unpublished')),
      word_count INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 100,
      template_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      puzzle_id TEXT NOT NULL,
      word TEXT NOT NULL,
      hint TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('across', 'down')),
      row INTEGER NOT NULL,
      col INTEGER NOT NULL,
      number INTEGER NOT NULL,
      FOREIGN KEY (puzzle_id) REFERENCES puzzles(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      device_id TEXT UNIQUE NOT NULL,
      display_name TEXT DEFAULT 'Player',
      total_points INTEGER DEFAULT 0,
      puzzles_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_progress (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      puzzle_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
      cell_data TEXT,
      points_earned INTEGER DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      completed_at DATETIME,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (puzzle_id) REFERENCES puzzles(id),
      UNIQUE(player_id, puzzle_id)
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_puzzles_status ON puzzles(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_words_puzzle ON words(puzzle_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_progress_player ON player_progress(player_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_progress_puzzle ON player_progress(puzzle_id)');

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM admin LIMIT 1').get();
  if (!adminExists) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (?, ?, ?)').run(
      uuidv4(), 'admin', hash
    );
    console.log('Default admin created: username=admin, password=admin123');
  }

  db.save();

  // Auto-save periodically
  setInterval(() => {
    if (db) db.save();
  }, 5000);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
  return db;
}

module.exports = { getDb, initializeDatabase };
