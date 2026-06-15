const Database = require('better-sqlite3');
const db = new Database('server/hotel.db');

try {
  const opening_cash = 5000;
  const notes = "Testing";
  const opened_by = 'Admin';
  const opened_at = new Date().toISOString();
  const id = 'REG-123456';

  db.prepare(`
    INSERT INTO cash_registers (id, opened_at, opened_by, opening_cash, expected_cash, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Open')
  `).run(id, opened_at, opened_by, opening_cash || 0, opening_cash || 0, notes || '');
  console.log("INSERT SUCCESS");

} catch(err) {
  console.error("INSERT ERROR:", err);
}

