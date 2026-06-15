const db = require('./db');

function resetDatabase() {
  console.log('Resetting database to fresh dataset...');

  // Disable foreign keys temporarily
  db.exec('PRAGMA foreign_keys = OFF;');

  const tablesToClear = [
    'refunds',
    'deposits',
    'folio_entries',
    'folios',
    'reservations',
    'guests',
    'maintenance_tickets',
    'housekeeping_tasks',
    'audit_logs',
    'property_transactions'
  ];

  // Drop delete-prevention triggers
  console.log('Dropping delete-prevention triggers...');
  tablesToClear.forEach(table => {
    db.exec(`DROP TRIGGER IF EXISTS prevent_delete_${table};`);
  });

  // Clear transactional table data
  console.log('Clearing transactional tables...');
  tablesToClear.forEach(table => {
    db.exec(`DELETE FROM ${table};`);
  });

  // Reset room statuses
  console.log('Resetting all room statuses to Vacant Clean...');
  db.exec("UPDATE rooms SET status = 'Vacant Clean';");

  // Re-enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Re-create the triggers manually
  console.log('Re-creating delete-prevention triggers...');
  tablesToClear.forEach(table => {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_${table}
      BEFORE DELETE ON ${table}
      BEGIN
        SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table ${table} due to hotel PMS audit policy.');
      END;
    `);
  });

  console.log('Database reset completed successfully. Starting with fresh dataset.');
}

resetDatabase();
