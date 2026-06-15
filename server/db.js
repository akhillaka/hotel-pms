require('dotenv').config();

// Determine which client to use
const useMySQL = process.env.DB_CLIENT === 'mysql';

let pool;

if (useMySQL) {
  const mysql = require('mysql2/promise');
  const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_pms',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  pool = {
    query: async (sql, params = []) => await mysqlPool.query(sql, params),
    querySingle: async (sql, params = []) => {
      const [rows] = await mysqlPool.query(sql, params);
      return rows.length > 0 ? rows[0] : undefined;
    },
    initializeDB: async () => {
      // Basic initialization for MySQL can be added here if needed
      console.log("MySQL Database connected via Hostinger config.");
    },
    transaction: async (callback) => {
      const connection = await mysqlPool.getConnection();
      await connection.beginTransaction();
      try {
        const result = await callback(connection);
        await connection.commit();
        connection.release();
        return result;
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }
  };
} else {
  const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'hotel.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

pool = {
  query: async (sql, params = []) => {
    try {
      const safeParams = params.map(p => p === undefined ? null : p);
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || 
        (sql.trim().toUpperCase().startsWith('PRAGMA') && !sql.includes('=')) || 
        sql.trim().toUpperCase().startsWith('SHOW');
      
      // Handle MySQL 'SHOW DATABASES;' gracefully if anything tries it
      if (sql.trim().toUpperCase().startsWith('SHOW')) return [[], []];

      if (isSelect) {
        const rows = db.prepare(sql).all(...safeParams);
        return [rows, []];
      } else {
        const info = db.prepare(sql).run(...safeParams);
        return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, []];
      }
    } catch (err) {
      console.error("SQLite Query Error:", err, sql, params);
      throw err;
    }
  },
  querySingle: async (sql, params = []) => {
    try {
      const safeParams = params.map(p => p === undefined ? null : p);
      const row = db.prepare(sql).get(...safeParams);
      return row;
    } catch (err) {
      console.error("SQLite Query Error:", err, sql, params);
      throw err;
    }
  },
  initializeDB: async () => {
    console.log("SQLite Database initialized.");
  },
  transaction: async (callback) => {
    try {
      db.prepare('BEGIN').run();
      const result = await callback(pool);
      db.prepare('COMMIT').run();
      return result;
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  },
  prepare: (sql) => {
    return db.prepare(sql);
  },
  close: () => {
    return db.close();
  }
  };
}

module.exports = pool;
