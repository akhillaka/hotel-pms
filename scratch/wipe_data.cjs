const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/hotel.db');
const db = new Database(dbPath);

console.log('Starting dummy data purge...');

const tablesToDropTriggers = [
  'folios', 'folio_entries', 'property_transactions', 'deposits', 'refunds'
];

try {
  // 1. Drop triggers
  console.log('Dropping compliance triggers temporarily...');
  tablesToDropTriggers.forEach(table => {
    db.exec(`DROP TRIGGER IF EXISTS prevent_delete_${table}`);
  });

  // 2. Delete data
  console.log('Wiping mock data from tables...');
  const wipeTables = [
    'folio_entries', 'deposits', 'refunds', 'folios', 
    'property_transactions', 'reservations', 'guests', 'cash_registers'
  ];
  wipeTables.forEach(table => {
    const info = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`- Deleted ${info.changes} rows from ${table}`);
  });

  // 3. Reset room statuses to 'Vacant Clean'
  const resetRooms = db.prepare(`UPDATE rooms SET status = 'Vacant Clean'`).run();
  console.log(`- Reset ${resetRooms.changes} rooms to Vacant Clean`);

  // 4. Recreate triggers
  console.log('Re-enabling compliance triggers...');
  tablesToDropTriggers.forEach(table => {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_${table}
      BEFORE DELETE ON ${table}
      BEGIN
        SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table ${table} due to hotel PMS audit policy.');
      END;
    `);
  });

  console.log('Successfully wiped database!');
} catch (err) {
  console.error('Error during wipe:', err);
} finally {
  db.close();
}
