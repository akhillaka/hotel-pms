require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('Connecting to MySQL...', process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME);
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hotel_pms'
    });

    console.log('Connected! Creating tables...');

    // Detect schema mismatch for guests table and recreate tables if necessary
    const [tableExists] = await connection.query("SHOW TABLES LIKE 'guests'");
    if (tableExists.length > 0) {
      const [columns] = await connection.query("SHOW COLUMNS FROM guests LIKE 'name'");
      if (columns.length === 0) {
        console.log("Mismatched guests table schema detected. Dropping tables to rebuild...");
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        const tablesToDrop = [
          'refunds', 'deposits', 'folio_entries', 'folios', 'reservations', 
          'housekeeping_history', 'housekeeping_tasks', 'maintenance_tickets', 
          'whatsapp_messages', 'whatsapp_conversations', 'guests'
        ];
        for (const t of tablesToDrop) {
          await connection.query(`DROP TABLE IF EXISTS ${t}`);
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        console.log("Tables dropped successfully.");
      }
    }

    // Detect schema mismatch for reservations table (reservation_number column check)
    const [resTableExists] = await connection.query("SHOW TABLES LIKE 'reservations'");
    if (resTableExists.length > 0) {
      const [resColumns] = await connection.query("SHOW COLUMNS FROM reservations LIKE 'reservation_number'");
      if (resColumns.length === 0) {
        console.log("Mismatched reservations table schema detected. Dropping tables to rebuild...");
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        const tablesToDrop = [
          'refunds', 'deposits', 'folio_entries', 'folios', 'reservations', 
          'housekeeping_history', 'housekeeping_tasks', 'maintenance_tickets', 
          'whatsapp_messages', 'whatsapp_conversations'
        ];
        for (const t of tablesToDrop) {
          await connection.query(`DROP TABLE IF EXISTS ${t}`);
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        console.log("Tables dropped successfully.");
      }
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          discount_limit REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS room_types (
          id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          capacity INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rate_plans (
          id VARCHAR(255) PRIMARY KEY,
          room_type_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          night_price REAL NOT NULL,
          day_use_price REAL NOT NULL,
          hourly_prices JSON,
          FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(255) PRIMARY KEY,
          room_number VARCHAR(50) NOT NULL UNIQUE,
          room_type_id VARCHAR(255) NOT NULL,
          floor INTEGER NOT NULL,
          capacity INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Vacant Clean',
          FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS guests (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          mobile VARCHAR(50) NOT NULL UNIQUE,
          gender VARCHAR(50),
          dob VARCHAR(50),
          address TEXT,
          nationality VARCHAR(100),
          id_type VARCHAR(100),
          id_number VARCHAR(100),
          photo_url VARCHAR(255),
          id_front_url VARCHAR(255),
          id_back_url VARCHAR(255),
          is_blacklisted BOOLEAN DEFAULT FALSE,
          blacklist_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS reservations (
          id VARCHAR(255) PRIMARY KEY,
          reservation_number VARCHAR(255) NOT NULL,
          guest_id VARCHAR(255) NOT NULL,
          room_type_id VARCHAR(255) NOT NULL,
          room_id VARCHAR(255),
          stay_type VARCHAR(255) NOT NULL,
          check_in_datetime DATETIME NOT NULL,
          check_out_datetime DATETIME NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Pending',
          adults INTEGER NOT NULL DEFAULT 1,
          children INTEGER NOT NULL DEFAULT 0,
          remarks TEXT,
          rate_plan_id VARCHAR(255),
          custom_rate REAL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(guest_id) REFERENCES guests(id),
          FOREIGN KEY(room_type_id) REFERENCES room_types(id),
          FOREIGN KEY(room_id) REFERENCES rooms(id),
          FOREIGN KEY(rate_plan_id) REFERENCES rate_plans(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS folios (
          id VARCHAR(255) PRIMARY KEY,
          reservation_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(reservation_id) REFERENCES reservations(id)
      )`,
      `CREATE TABLE IF NOT EXISTS folio_entries (
          id VARCHAR(255) PRIMARY KEY,
          folio_id VARCHAR(255) NOT NULL,
          entry_type VARCHAR(50) NOT NULL,
          charge_type VARCHAR(100),
          payment_method VARCHAR(100),
          description TEXT NOT NULL,
          debit REAL DEFAULT 0,
          credit REAL DEFAULT 0,
          balance REAL DEFAULT 0,
          created_by VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_voided BOOLEAN DEFAULT FALSE,
          FOREIGN KEY(folio_id) REFERENCES folios(id)
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          username VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS maintenance_tickets (
          id VARCHAR(255) PRIMARY KEY,
          room_id VARCHAR(255) NOT NULL,
          issue TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS housekeeping_tasks (
          id VARCHAR(255) PRIMARY KEY,
          room_id VARCHAR(255) NOT NULL,
          assigned_to VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'Pending',
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS property_settings (
          \`key\` VARCHAR(255) PRIMARY KEY,
          \`value\` TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS taxes (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          rate REAL NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS payment_methods (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          status VARCHAR(50) NOT NULL DEFAULT 'Active'
      )`,
      `CREATE TABLE IF NOT EXISTS gateway_settings (
          \`key\` VARCHAR(255) PRIMARY KEY,
          \`value\` TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
          role VARCHAR(100) NOT NULL,
          module VARCHAR(100) NOT NULL,
          access_level VARCHAR(50) NOT NULL,
          PRIMARY KEY(role, module)
      )`,
      `CREATE TABLE IF NOT EXISTS property_transactions (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          amount REAL NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          created_by VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS deposits (
          id VARCHAR(255) PRIMARY KEY,
          folio_id VARCHAR(255) NOT NULL,
          amount REAL NOT NULL,
          payment_method VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Held',
          description TEXT,
          created_by VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(folio_id) REFERENCES folios(id)
      )`,
      `CREATE TABLE IF NOT EXISTS refunds (
          id VARCHAR(255) PRIMARY KEY,
          folio_id VARCHAR(255) NOT NULL,
          amount REAL NOT NULL,
          payment_method VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
          reason TEXT NOT NULL,
          requested_by VARCHAR(255) NOT NULL,
          approved_by VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(folio_id) REFERENCES folios(id)
      )`,
      `CREATE TABLE IF NOT EXISTS cash_registers (
          id VARCHAR(255) PRIMARY KEY,
          opened_at DATETIME NOT NULL,
          closed_at DATETIME,
          opened_by VARCHAR(255) NOT NULL,
          closed_by VARCHAR(255),
          opening_cash REAL DEFAULT 0,
          expected_cash REAL DEFAULT 0,
          actual_cash REAL DEFAULT 0,
          cash_discrepancy REAL DEFAULT 0,
          total_card REAL DEFAULT 0,
          total_upi REAL DEFAULT 0,
          total_gateway REAL DEFAULT 0,
          status VARCHAR(50) DEFAULT 'Open',
          notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS housekeeping_history (
          id VARCHAR(255) PRIMARY KEY,
          task_id VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          performed_by VARCHAR(255),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(task_id) REFERENCES housekeeping_tasks(id)
      )`,
      `CREATE TABLE IF NOT EXISTS whatsapp_conversations (
          id VARCHAR(255) PRIMARY KEY,
          mobile VARCHAR(50) NOT NULL UNIQUE,
          assigned_agent VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Open',
          last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL,
          mobile VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'Sent',
          template_name VARCHAR(255),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(conversation_id) REFERENCES whatsapp_conversations(id)
      )`,
      `CREATE TABLE IF NOT EXISTS approval_requests (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
          requested_by VARCHAR(255) NOT NULL,
          created_at VARCHAR(255) NOT NULL,
          approved_by VARCHAR(255),
          approved_at VARCHAR(255),
          details TEXT
      )`
    ];

    for (const sql of queries) {
      await connection.query(sql);
    }
    console.log('Tables created successfully!');
    
    // Seed role permissions
    const defaultRoles = [
      { role: "Admin", modules: ["dashboard","rooms","guests","billing","chat","reports","admin","integrations","audit","housekeeping","transactions"], access: "edit" },
      { role: "Manager", modules: ["dashboard","rooms","guests","billing","chat","reports","admin","integrations","audit","housekeeping","transactions"], access: "edit" },
      { role: "Receptionist", modules: ["dashboard","rooms","guests","billing","chat","housekeeping","transactions","reports"], access: "read", overrides: { "rooms": "edit", "guests": "edit", "billing": "edit", "chat": "edit" } },
      { role: "Housekeeping", modules: ["rooms","housekeeping"], access: "edit" }
    ];

    for (const r of defaultRoles) {
      for (const m of r.modules) {
        const acc = r.overrides && r.overrides[m] ? r.overrides[m] : r.access;
        await connection.query("INSERT IGNORE INTO role_permissions (role, module, access_level) VALUES (?, ?, ?)", [r.role, m, acc]);
      }
    }
    console.log("Permissions seeded successfully.");

    // Check if admin user exists
    const [rows] = await connection.query("SELECT * FROM users WHERE username = 'admin'");
    if (rows.length === 0) {
      const hash = '$2b$10$vA4Qr8cBTT09oRbZ1jWWIuZaDbsEE0eLHOj1aGLa/ArsmHgekmLQq';
      await connection.query('INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)', ['admin-123', 'admin', hash, 'Admin', 'Admin User', 100]);
      console.log('Admin user seeded!');
    }

    await connection.end();
  } catch (err) {
    console.error('Migration failed!', err);
    process.exit(1);
  }
}

migrate();
