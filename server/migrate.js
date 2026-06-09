const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'hotel.db');
const db = new Database(dbPath);

console.log('Starting rate_plans migration...');

try {
  db.exec('PRAGMA foreign_keys = OFF;');
  
  console.log('Dropping old rate_plans table...');
  db.exec('DROP TABLE IF EXISTS rate_plans;');
  
  console.log('Creating new rate_plans table...');
  db.exec(`
    CREATE TABLE rate_plans (
      id TEXT PRIMARY KEY,
      room_type_id TEXT NOT NULL,
      name TEXT NOT NULL,
      night_price REAL NOT NULL,
      day_use_price REAL NOT NULL,
      hourly_prices TEXT NOT NULL, -- JSON string
      FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
    );
  `);
  
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Migration successful.');
} catch (error) {
  console.error('Migration failed:', error);
}

db.close();
