const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: './server/.env'});

const token = jwt.sign({ id: 'u_admin', username: 'admin', role: 'Admin' }, process.env.JWT_SECRET || 'secret123');

axios.post('http://localhost:5000/api/rooms', {
  room_number: "999",
  room_type_id: "rt_std",
  floor: 9,
  capacity: 2
}, {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
