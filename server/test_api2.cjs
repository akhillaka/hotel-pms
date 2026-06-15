const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 'u_admin', username: 'admin', role: 'Admin' }, 'secret123'); 

axios.post('http://localhost:5000/api/property', {
  name: "Hotel Name",
  contact1: "123",
  contact2: "456",
  email: "a@a.com",
  address: "address",
  gstOption: "false",
  gstNumber: "",
  tax_calculation_mode: "exclusive",
  default_accommodation_tax_id: "none"
}, {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
