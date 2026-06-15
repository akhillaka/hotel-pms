const bcrypt = require('./server/node_modules/bcryptjs');
console.log(bcrypt.compareSync('admin', '$2b$10$vA4Qr8cBTT09oRbZ1jWWIuZaDbsEE0eLHOj1aGLa/ArsmHgekmLQq'));
