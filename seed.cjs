const bcrypt = require('bcryptjs');
const db = require('./server/db.js');

(async () => {
  const hash = await bcrypt.hash('admin', 10);
  try {
    await db.query('INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)', ['admin-123', 'admin', hash, 'Admin', 'Admin User', 100]);
    console.log('Admin user created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('Admin user already exists');
    } else {
      console.error(err);
    }
  }
  process.exit(0);
})();
