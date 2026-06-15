require('dotenv').config();
const mysql = require('mysql2/promise');

async function update() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hotel_pms'
    });

    const defaultRoles = [
      { role: 'Admin', modules: ['dashboard','rooms','guests','billing','chat','reports','admin','integrations','audit','housekeeping','transactions'], access: 'edit' },
      { role: 'Manager', modules: ['dashboard','rooms','guests','billing','chat','reports','admin','integrations','audit','housekeeping','transactions'], access: 'edit' },
      { role: 'Receptionist', modules: ['dashboard','rooms','guests','billing','chat','housekeeping','transactions','reports'], access: 'read', overrides: { 'rooms': 'edit', 'guests': 'edit', 'billing': 'edit', 'chat': 'edit' } },
      { role: 'Housekeeping', modules: ['rooms','housekeeping'], access: 'edit' }
    ];

    for (const r of defaultRoles) {
      for (const m of r.modules) {
        const acc = r.overrides && r.overrides[m] ? r.overrides[m] : r.access;
        await connection.query('INSERT IGNORE INTO role_permissions (role, module, access_level) VALUES (?, ?, ?)', [r.role, m, acc]);
      }
    }
    console.log("Permissions seeded successfully.");
    await connection.end();
  } catch (e) {
    console.error(e);
  }
}
update();
