const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'hotel.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS room_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_number TEXT NOT NULL UNIQUE,
    room_type_id TEXT NOT NULL,
    floor INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Vacant Clean',
    FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rate_plans (
    id TEXT PRIMARY KEY,
    room_type_id TEXT NOT NULL,
    name TEXT NOT NULL,
    night_price REAL NOT NULL,
    day_use_price REAL NOT NULL,
    hourly_prices TEXT NOT NULL,
    FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    discount_limit REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    gender TEXT,
    dob TEXT,
    address TEXT,
    nationality TEXT,
    id_type TEXT,
    id_number TEXT,
    photo_url TEXT,
    id_front_url TEXT,
    id_back_url TEXT,
    is_blacklisted INTEGER DEFAULT 0,
    blacklist_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    reservation_number TEXT NOT NULL UNIQUE,
    guest_id TEXT NOT NULL,
    room_type_id TEXT NOT NULL,
    room_id TEXT,
    stay_type TEXT NOT NULL,
    check_in_datetime TEXT NOT NULL,
    check_out_datetime TEXT NOT NULL,
    status TEXT NOT NULL,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    rate_plan_id TEXT,
    custom_rate REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(guest_id) REFERENCES guests(id),
    FOREIGN KEY(room_type_id) REFERENCES room_types(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(rate_plan_id) REFERENCES rate_plans(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS folios (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL,
    FOREIGN KEY(reservation_id) REFERENCES reservations(id)
  );

  CREATE TABLE IF NOT EXISTS folio_entries (
    id TEXT PRIMARY KEY,
    folio_id TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    charge_type TEXT,
    payment_method TEXT,
    description TEXT NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(folio_id) REFERENCES folios(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    issue TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    assigned_to TEXT, -- username of housekeeper
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
    remarks TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );


  -- PROPERTY SETTINGS TABLE
  CREATE TABLE IF NOT EXISTS property_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- TAXES MODULE
  CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    rate REAL NOT NULL -- percentage e.g. 12.0 for 12%
  );

  -- PAYMENTS MASTERS
  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active' -- 'Active' or 'Inactive'
  );

  -- GATEWAYS CONFIG
  CREATE TABLE IF NOT EXISTS gateway_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- ROLE PERMISSIONS CONFIG
  CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    access_level TEXT NOT NULL,
    PRIMARY KEY(role, module)
  );
`);

// Dynamic schema update: Add custom_rate if not already present
try {
  db.exec("ALTER TABLE reservations ADD COLUMN custom_rate REAL;");
  console.log("Migration: Added custom_rate column to reservations table.");
} catch (e) {
  // If column already exists, it will throw, which we ignore safely
}

// Dynamic schema update: Add is_voided if not already present
try {
  db.exec("ALTER TABLE folio_entries ADD COLUMN is_voided INTEGER DEFAULT 0;");
  console.log("Migration: Added is_voided column to folio_entries table.");
} catch (e) {
  // If column already exists, it will throw, which we ignore safely
}


// Seed default role permissions
const defaultPerms = [
  // Admin
  { role: 'Admin', module: 'dashboard', access_level: 'edit' },
  { role: 'Admin', module: 'rooms', access_level: 'edit' },
  { role: 'Admin', module: 'guests', access_level: 'edit' },
  { role: 'Admin', module: 'billing', access_level: 'edit' },
  { role: 'Admin', module: 'chat', access_level: 'edit' },
  { role: 'Admin', module: 'reports', access_level: 'edit' },
  { role: 'Admin', module: 'admin', access_level: 'edit' },
  { role: 'Admin', module: 'integrations', access_level: 'edit' },
  { role: 'Admin', module: 'audit', access_level: 'edit' },

  // Manager
  { role: 'Manager', module: 'dashboard', access_level: 'edit' },
  { role: 'Manager', module: 'rooms', access_level: 'edit' },
  { role: 'Manager', module: 'guests', access_level: 'edit' },
  { role: 'Manager', module: 'billing', access_level: 'edit' },
  { role: 'Manager', module: 'chat', access_level: 'edit' },
  { role: 'Manager', module: 'reports', access_level: 'edit' },
  { role: 'Manager', module: 'admin', access_level: 'edit' },
  { role: 'Manager', module: 'integrations', access_level: 'edit' },
  { role: 'Manager', module: 'audit', access_level: 'edit' },

  // Receptionist
  { role: 'Receptionist', module: 'dashboard', access_level: 'read' },
  { role: 'Receptionist', module: 'rooms', access_level: 'edit' },
  { role: 'Receptionist', module: 'guests', access_level: 'edit' },
  { role: 'Receptionist', module: 'billing', access_level: 'edit' },
  { role: 'Receptionist', module: 'chat', access_level: 'edit' },
  { role: 'Receptionist', module: 'reports', access_level: 'read' },
  { role: 'Receptionist', module: 'admin', access_level: 'disabled' },
  { role: 'Receptionist', module: 'integrations', access_level: 'disabled' },
  { role: 'Receptionist', module: 'audit', access_level: 'disabled' },

  // Housekeeping
  { role: 'Housekeeping', module: 'dashboard', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'rooms', access_level: 'edit' },
  { role: 'Housekeeping', module: 'guests', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'billing', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'chat', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'reports', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'admin', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'integrations', access_level: 'disabled' },
  { role: 'Housekeeping', module: 'audit', access_level: 'disabled' }
];

const insertPerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role, module, access_level) VALUES (?, ?, ?)');
const transaction = db.transaction((perms) => {
  for (const p of perms) {
    insertPerm.run(p.role, p.module, p.access_level);
  }
});
transaction(defaultPerms);

// IMPLEMENT TRIGGER-BASED DELETION PREVENTION
const preventDeleteTriggers = [
  'reservations',
  'folios',
  'folio_entries',
  'audit_logs',
  'guests'
];

preventDeleteTriggers.forEach(table => {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_delete_${table}
    BEFORE DELETE ON ${table}
    BEGIN
      SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table ${table} due to hotel PMS audit policy.');
    END;
  `);
});

module.exports = db;
