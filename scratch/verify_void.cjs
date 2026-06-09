const axios = require('/Users/lakaakhilyadav/Documents/Hotel/node_modules/axios');
const db = require('/Users/lakaakhilyadav/Documents/Hotel/server/db.js');

const API_URL = 'http://localhost:5001/api';

async function verifyVoid() {
  console.log('🚀 Authenticating...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });

  const token = loginRes.data.token;
  const client = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  // Find a folio
  const folio = db.prepare("SELECT id FROM folios LIMIT 1").get();
  if (!folio) {
    console.error("No folios found to test");
    process.exit(1);
  }
  const folioId = folio.id;
  console.log(`Using Folio ID: ${folioId}`);

  // Create a charge
  console.log('🚀 Posting a test charge...');
  const chargeRes = await client.post(`/folios/${folioId}/charge`, {
    charge_type: 'Extra Room Service',
    description: 'Trackable Test Room Service Charge',
    amount: 250
  });

  if (chargeRes.status !== 200) {
    console.error('Failed to post charge:', chargeRes.data);
    process.exit(1);
  }
  console.log('✅ Charge posted successfully!');

  // Query it in DB
  const entry = db.prepare("SELECT * FROM folio_entries WHERE description = ?").get('Trackable Test Room Service Charge');
  console.log('Inserted entry status:', { id: entry.id, is_voided: entry.is_voided, debit: entry.debit });

  // Void it via API
  console.log('🚀 Voiding the charge...');
  const voidRes = await client.delete(`/folios/entries/${entry.id}`);
  if (voidRes.status === 200) {
    console.log('✅ Void API call successful!');
  } else {
    console.error('Failed to void charge:', voidRes.data);
    process.exit(1);
  }

  // Query it in DB again
  const entryAfterVoid = db.prepare("SELECT * FROM folio_entries WHERE id = ?").get(entry.id);
  console.log('Entry status after void (soft deleted):', { 
    id: entryAfterVoid.id, 
    is_voided: entryAfterVoid.is_voided, 
    debit: entryAfterVoid.debit,
    description: entryAfterVoid.description
  });

  if (entryAfterVoid.is_voided === 1) {
    console.log('🎉 SUCCESS: Voided entry is kept in database records with is_voided = 1!');
  } else {
    console.error('❌ FAILURE: Entry was physically deleted or not flagged as voided.');
    process.exit(1);
  }
}

verifyVoid();
