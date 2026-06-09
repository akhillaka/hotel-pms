const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const axios = require('axios'); // For real outward webhook integrations
const Razorpay = require('razorpay');
const crypto  = require('crypto');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'super-secret-pms-token-key-change-in-production';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Global Authentication & Module RBAC Middleware
app.use('/api', (req, res, next) => {
  // Public webhook endpoints — no auth required
  if (req.path === '/auth/login') return next();
  if (req.path === '/whatsapp/webhook') return next();  // Meta webhook verification
  if (req.path === '/razorpay/webhook') return next();  // Razorpay webhook events
  
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    // Map path to module
    let targetModule = null;
    const path = req.path;
    
    if (path.startsWith('/room-types') || path.startsWith('/rooms') || path.startsWith('/maintenance')) {
      targetModule = 'rooms';
    } else if (path.startsWith('/guests')) {
      targetModule = 'guests';
    } else if (path.startsWith('/reservations') || path.startsWith('/folios') || path.startsWith('/rate-plans') || path.startsWith('/razorpay')) {
      targetModule = 'billing';
    } else if (path.startsWith('/whatsapp') || path.startsWith('/telegram')) {
      targetModule = 'chat';
    } else if (path.startsWith('/integrations/config') || path.startsWith('/integrations/test')) {
      targetModule = 'admin';
    } else if (path.startsWith('/reports')) {
      targetModule = 'reports';
    } else if (path.startsWith('/property') || path.startsWith('/taxes') || path.startsWith('/payment-methods') || path.startsWith('/gateway')) {
      targetModule = 'admin';
    } else if (path.startsWith('/audit')) {
      targetModule = 'audit';
    } else if (path.startsWith('/permissions')) {
      targetModule = 'admin';
    }
    
    if (!targetModule) {
      return next();
    }
    
    const permissions = getPermissionsForRole(req.user.role);
    const access = permissions[targetModule] || 'disabled';
    
    if (access === 'disabled') {
      return res.status(403).json({ error: `Module '${targetModule}' is disabled for your role.` });
    }
    
    // Block mutations (POST, PUT, DELETE, PATCH) if access is read-only
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && access === 'read') {
      return res.status(403).json({ error: `Permission Denied: Read-only access to '${targetModule}' module.` });
    }
    
    next();
  });
});


// Configure multer for guest documentation uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Simple In-memory feed logs for Mock Integrations
const mockWhatsAppFeed = [];
const mockTelegramFeed = [];

// Helper to check if property setting exists
function getSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM property_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (err) {
    return null;
  }
}


/*
 * ══════════════════════════════════════════════════════════════
 *  WHATSAPP CLOUD API — TEMPLATE ROUTING SYSTEM
 * ══════════════════════════════════════════════════════════════
 *  WhatsApp Business API rules:
 *
 *  1. FREE-TEXT messages  → only allowed within 24h of guest
 *     replying to the business (Service Window).
 *     Used for: Manual agent replies typed in the Comms Hub.
 *
 *  2. TEMPLATE messages   → required for ALL business-initiated
 *     proactive notifications (booking confirmations, receipts,
 *     checkout summaries, payment reminders, etc.)
 *     Templates must be pre-approved by Meta in Business Manager.
 *
 *  TEMPLATE CATEGORIES:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ UTILITY     → transactional (booking, payment, invoice) │
 *  │ MARKETING   → promotional (feedback, offers)            │
 *  │ AUTHN       → OTP / verification                        │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  HOW TO SET UP:
 *  1. Go to Meta Business Manager → WhatsApp → Message Templates
 *  2. Create templates with these exact names (or update the map below)
 *  3. Submit for approval (usually approved in <1 hour for UTILITY)
 *  4. Configure waToken + waPhoneId in Admin → Integrations
 *
 *  Template name → variables mapping used below:
 *  ┌───────────────────────────┬──────────────────────────────────────┐
 *  │ Template Name             │ Body Variables                       │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ booking_confirmation      │ {{1}} guestName {{2}} resNumber      │
 *  │                           │ {{3}} checkIn   {{4}} roomType       │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ checkin_welcome           │ {{1}} guestName {{2}} roomNumber     │
 *  │                           │ {{3}} wifiPass                       │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ payment_receipt           │ {{1}} guestName {{2}} amount         │
 *  │                           │ {{3}} method    {{4}} resNumber      │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ checkout_summary          │ {{1}} guestName {{2}} resNumber      │
 *  │                           │ {{3}} totalBill                      │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ payment_reminder          │ {{1}} guestName {{2}} outstandingAmt │
 *  ├───────────────────────────┼──────────────────────────────────────┤
 *  │ feedback_request          │ {{1}} guestName                      │
 *  └───────────────────────────┴──────────────────────────────────────┘
 */

// Notification type → template name + variable builder
const WA_TEMPLATES = {
  booking_confirmation: {
    name: 'booking_confirmation',
    category: 'UTILITY',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName  || 'Guest'   },
        { type: 'text', text: vars.resNumber  || 'N/A'     },
        { type: 'text', text: vars.checkIn    || 'N/A'     },
        { type: 'text', text: vars.roomType   || 'N/A'     },
      ]
    }]
  },
  checkin_welcome: {
    name: 'checkin_welcome',
    category: 'UTILITY',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName  || 'Guest'   },
        { type: 'text', text: vars.roomNumber || 'N/A'     },
        { type: 'text', text: vars.wifiPass   || 'welcome123' },
      ]
    }]
  },
  payment_receipt: {
    name: 'payment_receipt',
    category: 'UTILITY',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName  || 'Guest'   },
        { type: 'text', text: String(vars.amount || '0')   },
        { type: 'text', text: vars.method     || 'Cash'    },
        { type: 'text', text: vars.resNumber  || 'N/A'     },
      ]
    }]
  },
  checkout_summary: {
    name: 'checkout_summary',
    category: 'UTILITY',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName  || 'Guest'   },
        { type: 'text', text: vars.resNumber  || 'N/A'     },
        { type: 'text', text: String(vars.totalBill || '0') },
      ]
    }]
  },
  payment_reminder: {
    name: 'payment_reminder',
    category: 'UTILITY',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName      || 'Guest' },
        { type: 'text', text: String(vars.outstanding || '0') },
      ]
    }]
  },
  feedback_request: {
    name: 'feedback_request',
    category: 'MARKETING',
    buildComponents: (vars) => [{
      type: 'body',
      parameters: [
        { type: 'text', text: vars.guestName || 'Guest' },
      ]
    }]
  },
};

/**
 * Send a WhatsApp message.
 *
 * @param {string}  mobile       - guest mobile (10-digit or E.164)
 * @param {string}  message      - human-readable fallback text (stored in feed)
 * @param {string}  type         - 'System Auto' | 'Manual Agent Reply' | template key
 * @param {object}  templateVars - variables for template substitution
 *
 * Routing:
 *  - 'Manual Agent Reply' → free-text (agent is responding within 24h window)
 *  - everything else      → template message (proactive business-initiated)
 *    If no template key matches, falls back to free-text with a console warning.
 */
async function addWhatsAppLog(mobile, message, type = 'System Auto', templateVars = {}) {
  const log = { id: uuidv4(), mobile, message, type, timestamp: new Date().toISOString() };
  mockWhatsAppFeed.unshift(log);
  console.log(`[WhatsApp ${type} → ${mobile}]: ${message.slice(0, 80)}`);

  const waToken   = getSetting('waToken');
  const waPhoneId = getSetting('waPhoneId');
  const waLang    = getSetting('waLang') || 'en';

  if (!waToken || !waPhoneId) return; // not configured — mock only

  const to = mobile.startsWith('+') ? mobile : `+91${mobile}`;

  try {
    let payload;

    if (type === 'Manual Agent Reply') {
      // ── Free-text (within 24h service window) ──────────────────────────
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message, preview_url: false },
      };
    } else {
      // ── Template message (proactive / business-initiated) ──────────────
      const tpl = WA_TEMPLATES[type] || WA_TEMPLATES[templateVars.__template];
      if (!tpl) {
        // Fallback: attempt free-text (will fail outside service window — logged)
        console.warn(`[WA] No template defined for type="${type}" — falling back to free-text. This may fail outside the 24h service window.`);
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: tpl.name,
            language: { code: waLang },
            components: tpl.buildComponents(templateVars),
          },
        };
      }
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/${waPhoneId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[WA] ✅ Sent (${type}) → ${to}`);

  } catch (err) {
    const errData = err.response?.data;
    // Error 131026 = template required (outside 24h window)
    // Error 132000 = template not found / not approved
    console.error(`[WA] ❌ Send failed → ${to}:`, errData || err.message);
  }
}


async function addTelegramLog(message) {
  const log = { id: uuidv4(), message, timestamp: new Date().toISOString() };
  mockTelegramFeed.unshift(log);
  console.log(`[Mock Telegram Owner Bot]: ${message}`);

  // Outward Telegram integration trigger if bot token & chat id are set
  const tgToken = getSetting('tgToken');
  const tgChatId = getSetting('tgChatId');
  if (tgToken && tgChatId) {
    try {
      await axios.post(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        chat_id: tgChatId,
        text: message,
        parse_mode: 'Markdown'
      });
      console.log('[Real Telegram Message Dispatched to Owner Chat]');
    } catch (err) {
      console.error('Real Telegram dispatch failed:', err.response?.data || err.message);
    }
  }
}

// Global Audit logger function
function logAudit(userId, username, action, oldValue, newValue) {
  const stmt = db.prepare('INSERT INTO audit_logs (id, user_id, username, action, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(uuidv4(), userId, username, action, oldValue || null, newValue || null, new Date().toISOString());
}

function recalculateFolioBalance(folioId) {
  const entries = db.prepare("SELECT id, debit, credit, is_voided FROM folio_entries WHERE folio_id = ? ORDER BY created_at ASC").all(folioId);
  let runningBal = 0;
  const updateBal = db.prepare("UPDATE folio_entries SET balance = ? WHERE id = ?");
  entries.forEach(e => {
    if (!e.is_voided) {
      runningBal += (e.debit - e.credit);
    }
    updateBal.run(runningBal, e.id);
  });
}

function createHousekeepingTask(roomId, remarks = 'Routine Cleaning') {
  const existing = db.prepare("SELECT * FROM housekeeping_tasks WHERE room_id = ? AND status IN ('Pending', 'In Progress')").get(roomId);
  if (existing) return;

  const taskId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO housekeeping_tasks (id, room_id, assigned_to, status, remarks, created_at, updated_at)
    VALUES (?, ?, NULL, 'Pending', ?, ?, ?)
  `).run(taskId, roomId, remarks, now, now);
}

// --- MIDDLEWARES ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied for this action' });
    }
    next();
  };
}

function getPermissionsForRole(role) {
  try {
    const rows = db.prepare('SELECT module, access_level FROM role_permissions WHERE role = ?').all(role);
    const map = {};
    rows.forEach(r => {
      map[r.module] = r.access_level;
    });
    return map;
  } catch (err) {
    return {};
  }
}

function checkModulePermission(moduleName) {
  return (req, res, next) => {
    const permissions = getPermissionsForRole(req.user.role);
    const access = permissions[moduleName] || 'disabled';
    
    if (access === 'disabled') {
      return res.status(403).json({ error: `Module '${moduleName}' is disabled for your role.` });
    }
    
    // If it's a mutation (POST, PATCH, DELETE, PUT) and access is read-only
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && access === 'read') {
      return res.status(403).json({ error: `You only have read-only access to the '${moduleName}' module.` });
    }
    
    next();
  };
}


// --- AUTH ROUTES ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name, discountLimit: user.discount_limit }, JWT_SECRET, { expiresIn: '8h' });
    
    logAudit(user.id, user.username, 'USER_LOGIN', null, `User ${user.username} logged in`);

    const permissions = getPermissionsForRole(user.role);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        discountLimit: user.discount_limit,
        permissions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.user.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const permissions = getPermissionsForRole(user.role);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        discountLimit: user.discount_limit,
        permissions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROOM TYPES & RATE PLANS ---
app.get('/api/room-types', authenticateToken, (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM room_types').all();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rate-plans', authenticateToken, (req, res) => {
  try {
    const plans = db.prepare('SELECT r.*, t.name as room_type_name FROM rate_plans r JOIN room_types t ON r.room_type_id = t.id').all();
    const parsedPlans = plans.map(p => ({
      ...p,
      hourly_prices: JSON.parse(p.hourly_prices || '{}')
    }));
    res.json(parsedPlans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROOMS & HOUSEKEEPING/MAINTENANCE ---
app.get('/api/rooms', authenticateToken, (req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT r.*, t.name as room_type_name, t.code as room_type_code 
      FROM rooms r 
      JOIN room_types t ON r.room_type_id = t.id
    `).all();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/rooms/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, req.params.id);
    logAudit(req.user.id, req.user.username, 'ROOM_STATUS_CHANGE', `${room.room_number}: ${room.status}`, `${room.room_number}: ${status}`);

    res.json({ message: 'Room status updated successfully', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance', authenticateToken, (req, res) => {
  const { room_id, issue } = req.body;
  if (!room_id || !issue) return res.status(400).json({ error: 'Missing room_id or issue description' });

  try {
    const ticketId = uuidv4();
    db.prepare('INSERT INTO maintenance_tickets (id, room_id, issue, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(ticketId, room_id, issue, 'Open', new Date().toISOString());

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    db.prepare("UPDATE rooms SET status = 'Maintenance' WHERE id = ?").run(room_id);

    logAudit(req.user.id, req.user.username, 'MAINTENANCE_TICKET_CREATE', null, `Room ${room.room_number}: ${issue}`);
    addTelegramLog(`⚠️ *Maintenance Alert!* Room ${room.room_number} blocked. Reason: ${issue}`);

    res.json({ message: 'Maintenance ticket created and room status updated to Maintenance' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/maintenance/:id/resolve', authenticateToken, (req, res) => {
  try {
    const ticket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    db.prepare("UPDATE maintenance_tickets SET status = 'Resolved' WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE rooms SET status = 'Vacant Clean' WHERE id = ?").run(ticket.room_id);

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(ticket.room_id);
    logAudit(req.user.id, req.user.username, 'MAINTENANCE_TICKET_RESOLVE', `Room ${room.room_number}: Open`, `Room ${room.room_number}: Resolved`);

    res.json({ message: 'Maintenance ticket resolved, room transitioned to Vacant Clean' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/maintenance', authenticateToken, (req, res) => {
  try {
    const tickets = db.prepare(`
      SELECT m.*, r.room_number 
      FROM maintenance_tickets m 
      JOIN rooms r ON m.room_id = r.id
    `).all();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HOUSEKEEPING MODULE ---
app.get('/api/housekeeping/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT h.*, r.room_number, r.status as room_status, u.name as housekeeper_name
      FROM housekeeping_tasks h
      JOIN rooms r ON h.room_id = r.id
      LEFT JOIN users u ON h.assigned_to = u.username
      ORDER BY h.created_at DESC
    `).all();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/housekeepers', authenticateToken, (req, res) => {
  try {
    const housekeepers = db.prepare("SELECT username, name, role FROM users WHERE role IN ('Housekeeping', 'Manager', 'Admin')").all();
    res.json(housekeepers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/housekeeping/tasks', authenticateToken, (req, res) => {
  const { room_id, remarks } = req.body;
  if (!room_id) return res.status(400).json({ error: 'room_id is required' });

  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    createHousekeepingTask(room_id, remarks || 'Routine Cleaning');
    db.prepare("UPDATE rooms SET status = 'Dirty' WHERE id = ?").run(room_id);

    res.json({ message: 'Housekeeping cleaning task created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/housekeeping/tasks/:id', authenticateToken, (req, res) => {
  const { assigned_to, status, remarks } = req.body;
  try {
    const task = db.prepare('SELECT * FROM housekeeping_tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Housekeeping task not found' });

    const now = new Date().toISOString();
    const oldStatus = task.status;
    const newStatus = status || oldStatus;
    const newAssigned = assigned_to !== undefined ? assigned_to : task.assigned_to;
    const newRemarks = remarks !== undefined ? remarks : task.remarks;

    db.prepare(`
      UPDATE housekeeping_tasks 
      SET assigned_to = ?, status = ?, remarks = ?, updated_at = ?
      WHERE id = ?
    `).run(newAssigned, newStatus, newRemarks, now, req.params.id);

    if (newStatus === 'Completed' && oldStatus !== 'Completed') {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(task.room_id);
      if (room && room.status === 'Dirty') {
        db.prepare("UPDATE rooms SET status = 'Vacant Clean' WHERE id = ?").run(task.room_id);
        logAudit(req.user.id, req.user.username, 'ROOM_CLEANED', `Room ${room.room_number}: Dirty`, `Room ${room.room_number}: Vacant Clean`);
      }
    }

    res.json({ message: 'Housekeeping task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GUEST SERVICES ---
app.get('/api/guests', authenticateToken, (req, res) => {
  const { mobile } = req.query;
  try {
    let guests;
    if (mobile) {
      guests = db.prepare('SELECT * FROM guests WHERE mobile LIKE ?').all(`%${mobile}%`);
    } else {
      guests = db.prepare('SELECT * FROM guests').all();
    }
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guests/:id/history', authenticateToken, (req, res) => {
  try {
    const stays = db.prepare(`
      SELECT r.*, rm.room_number 
      FROM reservations r
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE r.guest_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id);

    const revenue = db.prepare(`
      SELECT SUM(fe.debit) as total_spent, SUM(fe.credit) as total_paid
      FROM folio_entries fe
      JOIN folios f ON fe.folio_id = f.id
      JOIN reservations r ON f.reservation_id = r.id
      WHERE r.guest_id = ?
    `).get(req.params.id);

    res.json({
      stays,
      totalSpent: revenue.total_spent || 0,
      totalPaid: revenue.total_paid || 0,
      outstanding: (revenue.total_spent || 0) - (revenue.total_paid || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/guests/:id/blacklist', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const { is_blacklisted, blacklist_reason } = req.body;
  try {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    db.prepare('UPDATE guests SET is_blacklisted = ?, blacklist_reason = ? WHERE id = ?')
      .run(is_blacklisted ? 1 : 0, blacklist_reason || null, req.params.id);

    logAudit(req.user.id, req.user.username, is_blacklisted ? 'GUEST_BLACKLIST' : 'GUEST_UNBLACKLIST', guest.name, blacklist_reason || 'Removed from blacklist');

    res.json({ message: 'Guest blacklist status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guests/:id', authenticateToken, (req, res) => {
  try {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESERVATIONS & STAY ENGINE ---
app.post('/api/reservations/check-availability', authenticateToken, (req, res) => {
  const { check_in, check_out, room_type_id } = req.body;
  if (!check_in || !check_out || !room_type_id) {
    return res.status(400).json({ error: 'check_in, check_out, and room_type_id are required' });
  }

  try {
    const totalRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE room_type_id = ? AND status != 'Maintenance'").get(room_type_id).count;
    const activeOverlaps = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE room_type_id = ? 
      AND status NOT IN ('Cancelled', 'Checked Out', 'No Show')
      AND check_in_datetime < ? 
      AND check_out_datetime > ?
    `).get(room_type_id, check_out, check_in).count;

    const available = totalRooms - activeOverlaps;
    res.json({ available: Math.max(0, available), total: totalRooms, overlaps: activeOverlaps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/property/public', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM property_settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', authenticateToken, async (req, res) => {
  const { guest, stay_type, room_type_id, rate_plan_id, check_in, check_out, adults, children, remarks, custom_rate } = req.body;
  
  if (!guest || !guest.name || !guest.mobile || !room_type_id || !rate_plan_id || !check_in || !check_out) {
    return res.status(400).json({ error: 'Missing core reservation fields' });
  }

  try {
    const totalRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE room_type_id = ? AND status != 'Maintenance'").get(room_type_id).count;
    const activeOverlaps = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE room_type_id = ? 
      AND status NOT IN ('Cancelled', 'Checked Out', 'No Show')
      AND check_in_datetime < ? 
      AND check_out_datetime > ?
    `).get(room_type_id, check_out, check_in).count;

    if (activeOverlaps >= totalRooms) {
      return res.status(400).json({ error: 'Double Booking Blocked: No room capacity available of the requested type for this duration.' });
    }

    let dbGuest = db.prepare('SELECT * FROM guests WHERE mobile = ?').get(guest.mobile);
    if (!dbGuest) {
      const guestId = uuidv4();
      db.prepare('INSERT INTO guests (id, name, mobile) VALUES (?, ?, ?)')
        .run(guestId, guest.name, guest.mobile);
      dbGuest = { id: guestId, name: guest.name, mobile: guest.mobile, is_blacklisted: 0 };
    }

    if (dbGuest.is_blacklisted) {
      if (req.user.role === 'Receptionist') {
        return res.status(403).json({ error: 'BLACKLISTED_GUEST: Receptionist cannot create booking for a blacklisted guest. Require manager override.' });
      }
    }

    const reservationId = uuidv4();
    const reservationNo = `RES-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toISOString();

    db.prepare(`
      INSERT INTO reservations (id, reservation_number, guest_id, room_type_id, stay_type, check_in_datetime, check_out_datetime, status, adults, children, remarks, rate_plan_id, custom_rate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reservationId, reservationNo, dbGuest.id, room_type_id, stay_type, check_in, check_out, 'Reserved', adults || 1, children || 0, remarks || '', rate_plan_id, custom_rate ? parseFloat(custom_rate) : null, nowStr);

    const folioId = uuidv4();
    db.prepare('INSERT INTO folios (id, reservation_id, status, created_at) VALUES (?, ?, ?, ?)').run(folioId, reservationId, 'Open', nowStr);

    logAudit(req.user.id, req.user.username, 'RESERVATION_CREATE', null, `Created Reservation ${reservationNo} for ${dbGuest.name}`);
    await addWhatsAppLog(
      dbGuest.mobile,
      `Hello ${dbGuest.name}, your reservation ${reservationNo} is confirmed! Check-in: ${check_in}.`,
      'booking_confirmation',
      { guestName: dbGuest.name, resNumber: reservationNo, checkIn: check_in, roomType: room_type_id }
    );
    await addTelegramLog(`🔔 *New Booking!* Res: ${reservationNo} | Guest: ${dbGuest.name} | Room Type: ${room_type_id}`);

    res.json({ message: 'Reservation & Folio successfully created', reservationId, reservationNumber: reservationNo, folioId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations/:id/check-in', authenticateToken, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 }
]), async (req, res) => {
  const { room_id, advance_amount, payment_method, guest_name, id_type, id_number } = req.body;
  const reservationId = req.params.id;

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status === 'Cancelled') return res.status(400).json({ error: 'Cannot check-in a cancelled reservation' });
    if (reservation.status === 'Checked In') return res.status(400).json({ error: 'Guest is already checked in to this reservation' });

    const photoFile = req.files && req.files['photo'] ? req.files['photo'][0] : null;
    const idFrontFile = req.files && req.files['idFront'] ? req.files['idFront'][0] : null;
    const idBackFile = req.files && req.files['idBack'] ? req.files['idBack'][0] : null;

    if ((!photoFile || !idFrontFile || !idBackFile || !id_type || !id_number) && req.user.role === 'Receptionist') {
      return res.status(400).json({ 
        error: 'DOCUMENT_BLOCK', 
        message: 'Mobile Frontdesk Block: Missing guest Photo, ID Front, or ID Back uploads. Requires Manager override.' 
      });
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) return res.status(404).json({ error: 'Target room not found' });
    if (room.status !== 'Vacant Clean' && req.user.role === 'Receptionist') {
      return res.status(400).json({ error: 'Room is not Clean & Vacant. Choose another room or ask Manager to override.' });
    }

    const photoUrl = photoFile ? `/uploads/${photoFile.filename}` : null;
    const idFrontUrl = idFrontFile ? `/uploads/${idFrontFile.filename}` : null;
    const idBackUrl = idBackFile ? `/uploads/${idBackFile.filename}` : null;

    db.prepare(`
      UPDATE guests 
      SET name = COALESCE(?, name), id_type = ?, id_number = ?, 
          photo_url = COALESCE(?, photo_url), id_front_url = COALESCE(?, id_front_url), id_back_url = COALESCE(?, id_back_url)
      WHERE id = ?
    `).run(guest_name || null, id_type || null, id_number || null, photoUrl, idFrontUrl, idBackUrl, reservation.guest_id);

    db.prepare("UPDATE reservations SET status = 'Checked In', room_id = ? WHERE id = ?").run(room_id, reservationId);
    db.prepare("UPDATE rooms SET status = 'Occupied' WHERE id = ?").run(room_id);

    const ratePlan = db.prepare('SELECT * FROM rate_plans WHERE id = ?').get(reservation.rate_plan_id);
    const folio = db.prepare('SELECT * FROM folios WHERE reservation_id = ?').get(reservationId);

    const propsRows = db.prepare("SELECT key, value FROM property_settings WHERE key IN ('tax_calculation_mode', 'default_accommodation_tax_id')").all();
    const props = {};
    propsRows.forEach(r => props[r.key] = r.value);
    
    let mode = props.tax_calculation_mode || 'Exempt';
    
    // Calculate duration in hours
    const checkInMs = new Date(reservation.check_in_datetime).getTime();
    const checkOutMs = new Date(reservation.check_out_datetime).getTime();
    const durationHours = Math.max(1, Math.ceil((checkOutMs - checkInMs) / (1000 * 60 * 60)));

    let ratePlanPrice = 0;
    if (reservation.stay_type === 'hourly') {
      const hourlyPrices = JSON.parse(ratePlan.hourly_prices || '{}');
      ratePlanPrice = hourlyPrices[durationHours] || parseFloat(ratePlan.night_price);
    } else if (reservation.stay_type === 'day_use') {
      ratePlanPrice = parseFloat(ratePlan.day_use_price);
    } else {
      ratePlanPrice = parseFloat(ratePlan.night_price);
    }

    const dailyPrice = (reservation.custom_rate !== null && reservation.custom_rate !== undefined) 
      ? parseFloat(reservation.custom_rate) 
      : ratePlanPrice;

    const isNightStay = reservation.stay_type === 'night';
    const nights = isNightStay ? (Math.max(1, Math.round(durationHours / 24)) || 1) : 1;

    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatDateShort = (d) => `${d.getDate()} ${allMonths[d.getMonth()]}`;
    const getOffsetDate = (baseDateStr, offsetDays) => {
      const d = new Date(baseDateStr);
      d.setDate(d.getDate() + offsetDays);
      return d;
    };

    const taxObj = props.default_accommodation_tax_id && mode !== 'Exempt'
      ? db.prepare('SELECT * FROM taxes WHERE id = ?').get(props.default_accommodation_tax_id)
      : null;

    let currentBalance = 0;

    for (let i = 0; i < nights; i++) {
      let baseAmount = dailyPrice;
      let taxAmount = 0;
      let finalChargeDesc = '';
      let taxDesc = '';

      if (isNightStay) {
        const dayStart = getOffsetDate(reservation.check_in_datetime, i);
        const dayEnd = getOffsetDate(reservation.check_in_datetime, i + 1);
        finalChargeDesc = `Room Charge - Day ${i + 1} (${ratePlan.name}): ${formatDateShort(dayStart)} - ${formatDateShort(dayEnd)}`;
      } else {
        finalChargeDesc = `${reservation.stay_type.toUpperCase()} Charge - Plan: ${ratePlan.name} (${durationHours} Hrs)`;
      }

      if (taxObj) {
        if (mode === 'Inclusive') {
          baseAmount = dailyPrice / (1 + taxObj.rate / 100);
          taxAmount = dailyPrice - baseAmount;
          if (isNightStay) {
            finalChargeDesc = `Room Charge - Day ${i + 1} (${ratePlan.name}): ${formatDateShort(getOffsetDate(reservation.check_in_datetime, i))} - ${formatDateShort(getOffsetDate(reservation.check_in_datetime, i + 1))} (Inc. ${taxObj.rate}% ${taxObj.name})`;
          } else {
            finalChargeDesc = `${finalChargeDesc} (Inc. ${taxObj.rate}% ${taxObj.name})`;
          }
          taxDesc = `${taxObj.name} (${taxObj.rate}%) on Accommodation (Day ${i + 1})`;
        } else { // Exclusive
          taxAmount = dailyPrice * (taxObj.rate / 100);
          taxDesc = `${taxObj.name} (${taxObj.rate}%) on Accommodation (Day ${i + 1})`;
        }
      }

      currentBalance += baseAmount;
      const entryId = uuidv4();
      const timestamp = new Date(Date.now() + i * 2000).toISOString();
      db.prepare(`
        INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
        VALUES (?, ?, 'Charge', 'Accommodation', ?, ?, 0.0, ?, ?, ?)
      `).run(entryId, folio.id, finalChargeDesc, baseAmount, currentBalance, `${req.user.name} (${req.user.role})`, timestamp);

      if (taxAmount > 0) {
        currentBalance += taxAmount;
        const taxEntryId = uuidv4();
        const taxTimestamp = new Date(Date.now() + i * 2000 + 1000).toISOString();
        db.prepare(`
          INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
          VALUES (?, ?, 'Charge', 'Tax', ?, ?, 0.0, ?, ?, ?)
        `).run(taxEntryId, folio.id, taxDesc, taxAmount, currentBalance, `${req.user.name} (${req.user.role})`, taxTimestamp);
      }
    }

    if (parseFloat(advance_amount) > 0) {
      const paymentId = uuidv4();
      currentBalance -= parseFloat(advance_amount);
      db.prepare(`
        INSERT INTO folio_entries (id, folio_id, entry_type, payment_method, description, debit, credit, balance, created_by, created_at)
        VALUES (?, ?, 'Payment', ?, 'Advance Payment Collected', 0.0, ?, ?, ?, ?)
      `).run(paymentId, folio.id, payment_method || 'UPI', parseFloat(advance_amount), currentBalance, `${req.user.name} (${req.user.role})`, new Date().toISOString());
      
      const guestObj = db.prepare('SELECT * FROM guests WHERE id = ?').get(reservation.guest_id);
      await addTelegramLog(`💰 *Payment Received!* Guest: ${guestObj.name} | Amount: ₹${advance_amount} via ${payment_method}`);
    }

    logAudit(req.user.id, req.user.username, 'CHECK_IN_COMPLETED', `Res: ${reservation.reservation_number}`, `Room: ${room.room_number}`);

    res.json({ message: 'Guest successfully checked-in', roomNumber: room.room_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations/:id/check-out', authenticateToken, async (req, res) => {
  const reservationId = req.params.id;

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status !== 'Checked In') return res.status(400).json({ error: 'Reservation is not Checked In' });

    const folio = db.prepare('SELECT * FROM folios WHERE reservation_id = ?').get(reservationId);
    const sumResult = db.prepare('SELECT SUM(debit) as total_debit, SUM(credit) as total_credit FROM folio_entries WHERE folio_id = ?').get(folio.id);
    const balance = (sumResult.total_debit || 0) - (sumResult.total_credit || 0);

    if (balance > 0 && req.user.role === 'Receptionist') {
      return res.status(400).json({ 
        error: 'OUTSTANDING_BALANCE', 
        message: `Checkout Blocked: Outstanding balance of ₹${balance} remains. Requires manager PIN / override.` 
      });
    }

    db.prepare('UPDATE reservations SET status = "Checked Out" WHERE id = ?').run(reservationId);
    db.prepare('UPDATE folios SET status = "Checked Out" WHERE id = ?').run(folio.id);

    if (reservation.room_id) {
      db.prepare('UPDATE rooms SET status = "Dirty" WHERE id = ?').run(reservation.room_id);
    }

    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(reservation.guest_id);
    logAudit(req.user.id, req.user.username, 'CHECK_OUT_COMPLETED', `Res: ${reservation.reservation_number}`, `Balance: ${balance}`);
    
    await addWhatsAppLog(
      guest.mobile,
      `Thank you for staying with us, ${guest.name}! Invoice for ${reservation.reservation_number} cleared. Balance: ₹0.`,
      'checkout_summary',
      { guestName: guest.name, resNumber: reservation.reservation_number, totalBill: sumResult.total_debit || 0 }
    );
    await addTelegramLog(`🚪 *Checked Out!* Guest: ${guest.name} | Bill Amount: ₹${sumResult.total_debit || 0} | Balance: ₹0`);

    res.json({ message: 'Guest checked out successfully. Room status changed to Dirty.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations/:id/cancel', authenticateToken, (req, res) => {
  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status === 'Checked In') return res.status(400).json({ error: 'Cannot cancel a checked-in stay' });

    db.prepare('UPDATE reservations SET status = "Cancelled" WHERE id = ?').run(req.params.id);

    // Revert room to Vacant Clean if it was pre-assigned but not occupied
    if (reservation.room_id) {
      const assignedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
      if (assignedRoom && assignedRoom.status !== 'Occupied') {
        db.prepare('UPDATE rooms SET status = \'Vacant Clean\' WHERE id = ?').run(reservation.room_id);
      }
    }

    logAudit(req.user.id, req.user.username, 'RESERVATION_CANCELLED', reservation.reservation_number, 'Status set to Cancelled');

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/reservations/:id/dates', authenticateToken, (req, res) => {
  const { check_out } = req.body;
  if (!check_out) return res.status(400).json({ error: 'Check-out datetime is required' });

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status === 'Cancelled' || reservation.status === 'Checked Out') {
      return res.status(400).json({ error: 'Cannot modify dates of cancelled or checked-out reservations' });
    }

    db.prepare('UPDATE reservations SET check_out_datetime = ? WHERE id = ?').run(check_out, req.params.id);
    logAudit(req.user.id, req.user.username, 'RESERVATION_DATES_MODIFIED', reservation.check_out_datetime, check_out);

    // If already checked in, recalculate and update room charges in folio
    if (reservation.status === 'Checked In') {
      const folio = db.prepare('SELECT * FROM folios WHERE reservation_id = ?').get(req.params.id);
      if (folio) {
        const checkInMs = new Date(reservation.check_in_datetime).getTime();
        const checkOutMs = new Date(check_out).getTime();
        const durationHours = Math.max(1, Math.ceil((checkOutMs - checkInMs) / (1000 * 60 * 60)));

        const ratePlan = db.prepare('SELECT * FROM rate_plans WHERE id = ?').get(reservation.rate_plan_id);
        if (ratePlan) {
          let ratePlanPrice = 0;
          if (reservation.stay_type === 'hourly') {
            const hourlyPrices = JSON.parse(ratePlan.hourly_prices || '{}');
            ratePlanPrice = hourlyPrices[durationHours] || parseFloat(ratePlan.night_price);
          } else if (reservation.stay_type === 'day_use') {
            ratePlanPrice = parseFloat(ratePlan.day_use_price);
          } else {
            ratePlanPrice = parseFloat(ratePlan.night_price);
          }

          const dailyPrice = (reservation.custom_rate !== null && reservation.custom_rate !== undefined) 
            ? parseFloat(reservation.custom_rate) 
            : ratePlanPrice;

          const isNightStay = reservation.stay_type === 'night';
          const nights = isNightStay ? (Math.max(1, Math.round(durationHours / 24)) || 1) : 1;

          const propsRows = db.prepare("SELECT key, value FROM property_settings WHERE key IN ('tax_calculation_mode', 'default_accommodation_tax_id')").all();
          const props = {};
          propsRows.forEach(r => props[r.key] = r.value);
          let mode = props.tax_calculation_mode || 'Exempt';

          const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const formatDateShort = (d) => `${d.getDate()} ${allMonths[d.getMonth()]}`;
          const getOffsetDate = (baseDateStr, offsetDays) => {
            const d = new Date(baseDateStr);
            d.setDate(d.getDate() + offsetDays);
            return d;
          };

          const taxObj = props.default_accommodation_tax_id && mode !== 'Exempt'
            ? db.prepare('SELECT * FROM taxes WHERE id = ?').get(props.default_accommodation_tax_id)
            : null;

          // Temporarily drop delete prevention triggers to safely update room charges
          db.exec("DROP TRIGGER IF EXISTS prevent_delete_folio_entries");

          // Clear old accommodation/tax charges
          db.prepare("DELETE FROM folio_entries WHERE folio_id = ? AND charge_type IN ('Accommodation', 'Tax')").run(folio.id);

          // Restore delete prevention trigger
          db.exec(`
            CREATE TRIGGER IF NOT EXISTS prevent_delete_folio_entries
            BEFORE DELETE ON folio_entries
            BEGIN
              SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table folio_entries due to hotel PMS audit policy.');
            END;
          `);

          // Insert fresh daily charges
          for (let i = 0; i < nights; i++) {
            let baseAmount = dailyPrice;
            let taxAmount = 0;
            let finalChargeDesc = '';
            let taxDesc = '';

            if (isNightStay) {
              const dayStart = getOffsetDate(reservation.check_in_datetime, i);
              const dayEnd = getOffsetDate(reservation.check_in_datetime, i + 1);
              finalChargeDesc = `Room Charge - Day ${i + 1} (${ratePlan.name}): ${formatDateShort(dayStart)} - ${formatDateShort(dayEnd)}`;
            } else {
              finalChargeDesc = `${reservation.stay_type.toUpperCase()} Charge - Plan: ${ratePlan.name} (${durationHours} Hrs)`;
            }

            if (taxObj) {
              if (mode === 'Inclusive') {
                baseAmount = dailyPrice / (1 + taxObj.rate / 100);
                taxAmount = dailyPrice - baseAmount;
                if (isNightStay) {
                  finalChargeDesc = `Room Charge - Day ${i + 1} (${ratePlan.name}): ${formatDateShort(getOffsetDate(reservation.check_in_datetime, i))} - ${formatDateShort(getOffsetDate(reservation.check_in_datetime, i + 1))} (Inc. ${taxObj.rate}% ${taxObj.name})`;
                } else {
                  finalChargeDesc = `${finalChargeDesc} (Inc. ${taxObj.rate}% ${taxObj.name})`;
                }
                taxDesc = `${taxObj.name} (${taxObj.rate}%) on Accommodation (Day ${i + 1})`;
              } else { // Exclusive
                taxAmount = dailyPrice * (taxObj.rate / 100);
                taxDesc = `${taxObj.name} (${taxObj.rate}%) on Accommodation (Day ${i + 1})`;
              }
            }

            const entryId = uuidv4();
            const timestamp = new Date(Date.now() + i * 2000).toISOString();
            db.prepare(`
              INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
              VALUES (?, ?, 'Charge', 'Accommodation', ?, ?, 0.0, 0.0, ?, ?)
            `).run(entryId, folio.id, finalChargeDesc, baseAmount, `${req.user.name} (${req.user.role})`, timestamp);

            if (taxAmount > 0) {
              const taxEntryId = uuidv4();
              const taxTimestamp = new Date(Date.now() + i * 2000 + 1000).toISOString();
              db.prepare(`
                INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
                VALUES (?, ?, 'Charge', 'Tax', ?, ?, 0.0, 0.0, ?, ?)
              `).run(taxEntryId, folio.id, taxDesc, taxAmount, `${req.user.name} (${req.user.role})`, taxTimestamp);
            }
          }

          // Re-calculate running balances on all folio entries to ensure consistency
          recalculateFolioBalance(folio.id);
        }
      }
    }

    res.json({ message: 'Reservation check-out date and room charges updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/guests/:id', authenticateToken, (req, res) => {
  const { name, mobile, nationality, id_type, id_number } = req.body;

  try {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    db.prepare(`
      UPDATE guests 
      SET name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          nationality = COALESCE(?, nationality),
          id_type = COALESCE(?, id_type),
          id_number = COALESCE(?, id_number)
      WHERE id = ?
    `).run(name || null, mobile || null, nationality || null, id_type || null, id_number || null, req.params.id);

    logAudit(req.user.id, req.user.username, 'GUEST_PROFILE_UPDATED', guest.name, name || guest.name);

    res.json({ message: 'Guest profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reservations', authenticateToken, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT r.*, g.name as guest_name, g.mobile as guest_mobile, rm.room_number, rt.name as room_type_name
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
      ORDER BY r.check_in_datetime DESC
    `).all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FOLIO & BILLING ENTRIES ---
app.get('/api/folios/:reservationId', authenticateToken, (req, res) => {
  try {
    const folio = db.prepare('SELECT * FROM folios WHERE reservation_id = ?').get(req.params.reservationId);
    if (!folio) return res.status(404).json({ error: 'Folio not found for this reservation' });

    const entries = db.prepare('SELECT * FROM folio_entries WHERE folio_id = ? ORDER BY created_at ASC').all(folio.id);
    const math = db.prepare('SELECT SUM(debit) as debit, SUM(credit) as credit FROM folio_entries WHERE folio_id = ? AND is_voided = 0').get(folio.id);
    const balance = (math.debit || 0) - (math.credit || 0);

    res.json({
      folio,
      entries,
      summary: {
        totalDebit: math.debit || 0,
        totalCredit: math.credit || 0,
        balance
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folios/:id/charge', authenticateToken, (req, res) => {
  const { charge_type, description, amount, tax_id } = req.body;
  if (!charge_type || !description || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid charge properties' });
  }

  try {
    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(req.params.id);
    if (!folio) return res.status(404).json({ error: 'Folio not found' });
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Cannot post charges to a closed folio' });

    const modeRow = db.prepare('SELECT value FROM property_settings WHERE key = ?').get('tax_calculation_mode');
    const mode = modeRow ? modeRow.value : 'Exempt';
    
    let baseAmount = parseFloat(amount);
    let taxAmount = 0;
    let chargeDesc = description;
    let taxDesc = '';
    
    if (tax_id && mode !== 'Exempt') {
      const tax = db.prepare('SELECT * FROM taxes WHERE id = ?').get(tax_id);
      if (tax) {
        if (mode === 'Inclusive') {
           baseAmount = parseFloat(amount) / (1 + tax.rate / 100);
           taxAmount = parseFloat(amount) - baseAmount;
           chargeDesc = `${description} (Inc. ${tax.rate}% ${tax.name})`;
           taxDesc = `${tax.name} (${tax.rate}%) on ${description}`;
        } else { // Exclusive
           taxAmount = parseFloat(amount) * (tax.rate / 100);
           chargeDesc = description;
           taxDesc = `${tax.name} (${tax.rate}%) on ${description}`;
        }
      }
    }

    const math = db.prepare('SELECT SUM(debit) as debit, SUM(credit) as credit FROM folio_entries WHERE folio_id = ?').get(folio.id);
    let currentBalance = (math?.debit || 0) - (math?.credit || 0);

    currentBalance += baseAmount;
    const entryId = uuidv4();
    db.prepare(`
      INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
      VALUES (?, ?, 'Charge', ?, ?, ?, 0.0, ?, ?, ?)
    `).run(entryId, folio.id, charge_type, chargeDesc, baseAmount, currentBalance, `${req.user.name} (${req.user.role})`, new Date().toISOString());

    if (taxAmount > 0) {
      currentBalance += taxAmount;
      const taxEntryId = uuidv4();
      db.prepare(`
        INSERT INTO folio_entries (id, folio_id, entry_type, charge_type, description, debit, credit, balance, created_by, created_at)
        VALUES (?, ?, 'Charge', 'Tax', ?, ?, 0.0, ?, ?, ?)
      `).run(taxEntryId, folio.id, taxDesc, taxAmount, currentBalance, `${req.user.name} (${req.user.role})`, new Date().toISOString());
    }

    logAudit(req.user.id, req.user.username, 'CHARGE_POSTED', `Folio: ${folio.id}`, `Type: ${charge_type} | Base: ${baseAmount.toFixed(2)} | Tax: ${taxAmount.toFixed(2)}`);

    res.json({ message: 'Charge posted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/folios/charges/:entryId', authenticateToken, (req, res) => {
  const { description, amount } = req.body;
  if (!description || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid charge properties' });
  }

  try {
    const entry = db.prepare('SELECT * FROM folio_entries WHERE id = ?').get(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Folio entry not found' });
    if (entry.entry_type !== 'Charge') return res.status(400).json({ error: 'Only charge entries can be edited' });

    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(entry.folio_id);
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Cannot edit charges on a closed folio' });

    const reservation = db.prepare('SELECT reservation_number FROM reservations WHERE id = ?').get(folio.reservation_id);

    db.prepare('UPDATE folio_entries SET description = ?, debit = ? WHERE id = ?').run(description, parseFloat(amount), req.params.entryId);

    // Re-calculate running balances on all folio entries to ensure consistency
    recalculateFolioBalance(folio.id);

    logAudit(req.user.id, req.user.username, 'CHARGE_EDITED', `Res: ${reservation.reservation_number} | Entry: ${req.params.entryId}`, `Desc: ${description} | Amount: ${amount}`);

    res.json({ message: 'Charge updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/folios/payments/:entryId', authenticateToken, (req, res) => {
  const { description, amount, payment_method } = req.body;
  if (!description || !amount || parseFloat(amount) <= 0 || !payment_method) {
    return res.status(400).json({ error: 'Missing or invalid payment properties' });
  }

  try {
    const entry = db.prepare('SELECT * FROM folio_entries WHERE id = ?').get(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Folio entry not found' });
    if (entry.entry_type !== 'Payment') return res.status(400).json({ error: 'Only payment entries can be edited' });

    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(entry.folio_id);
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Cannot edit payments on a closed folio' });

    const reservation = db.prepare('SELECT reservation_number FROM reservations WHERE id = ?').get(folio.reservation_id);

    db.prepare('UPDATE folio_entries SET description = ?, credit = ?, payment_method = ? WHERE id = ?')
      .run(description, parseFloat(amount), payment_method, req.params.entryId);

    // Re-calculate running balances on all folio entries to ensure consistency
    recalculateFolioBalance(folio.id);

    logAudit(req.user.id, req.user.username, 'PAYMENT_EDITED', `Res: ${reservation.reservation_number} | Entry: ${req.params.entryId}`, `Desc: ${description} | Amount: ${amount} | Method: ${payment_method}`);

    res.json({ message: 'Payment updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/folios/entries/:id', authenticateToken, (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM folio_entries WHERE id = ?').get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Folio entry not found' });

    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(entry.folio_id);
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Cannot void entries on a closed folio' });

    const reservation = db.prepare('SELECT reservation_number FROM reservations WHERE id = ?').get(folio.reservation_id);

    // Perform soft-delete by setting is_voided = 1 to keep records trackable
    db.prepare('UPDATE folio_entries SET is_voided = 1 WHERE id = ?').run(req.params.id);

    // Re-calculate running balances on all folio entries to ensure consistency
    recalculateFolioBalance(folio.id);

    logAudit(req.user.id, req.user.username, 'ENTRY_VOIDED', `Res: ${reservation.reservation_number} | Entry: ${req.params.id}`, `Desc: ${entry.description} | Debit: ${entry.debit} | Credit: ${entry.credit}`);

    res.json({ message: 'Folio entry voided successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folios/:id/payment', authenticateToken, async (req, res) => {
  const { payment_method, description, amount } = req.body;
  if (!payment_method || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid payment properties' });
  }

  try {
    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(req.params.id);
    if (!folio) return res.status(404).json({ error: 'Folio not found' });
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Cannot add payment to a closed folio' });

    const math = db.prepare('SELECT SUM(debit) as debit, SUM(credit) as credit FROM folio_entries WHERE folio_id = ?').get(folio.id);
    const prevBalance = (math.debit || 0) - (math.credit || 0);
    const newBalance = prevBalance - parseFloat(amount);

    const entryId = uuidv4();
    db.prepare(`
      INSERT INTO folio_entries (id, folio_id, entry_type, payment_method, description, debit, credit, balance, created_by, created_at)
      VALUES (?, ?, 'Payment', ?, ?, 0.0, ?, ?, ?, ?)
    `).run(entryId, folio.id, payment_method, description || 'Payment intake', parseFloat(amount), newBalance, `${req.user.name} (${req.user.role})`, new Date().toISOString());

    logAudit(req.user.id, req.user.username, 'PAYMENT_RECORDED', `Folio: ${folio.id}`, `Amt: ${amount} via ${payment_method}`);

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(folio.reservation_id);
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(reservation.guest_id);
    await addTelegramLog(`💰 *Payment Received!* Guest: ${guest.name} | Amount: ₹${amount} via ${payment_method}`);
    await addWhatsAppLog(
      guest.mobile,
      `Payment Receipt: ₹${amount} via ${payment_method} for Res ${reservation.reservation_number}. Remaining: ₹${newBalance}.`,
      'payment_receipt',
      { guestName: guest.name, amount, method: payment_method, resNumber: reservation.reservation_number }
    );

    res.json({ message: 'Payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folios/:id/adjust', authenticateToken, (req, res) => {
  const { original_entry_id, reason, discount_percent } = req.body;
  if (!original_entry_id || !reason) {
    return res.status(400).json({ error: 'original_entry_id and reason are required' });
  }

  try {
    const entry = db.prepare('SELECT * FROM folio_entries WHERE id = ?').get(original_entry_id);
    if (!entry) return res.status(404).json({ error: 'Original charge entry not found' });

    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(entry.folio_id);
    if (folio.status === 'Checked Out') return res.status(400).json({ error: 'Folio is already closed' });

    if (discount_percent) {
      const numDiscount = parseFloat(discount_percent);
      if (numDiscount > req.user.discountLimit) {
        return res.status(403).json({ 
          error: 'DISCOUNT_LIMIT_EXCEEDED', 
          message: `Your account role (${req.user.role}) has a maximum discount policy limit of ${req.user.discountLimit}%. Action blocked.` 
        });
      }
    }

    const adjustmentAmount = entry.debit;
    if (adjustmentAmount <= 0) {
      return res.status(400).json({ error: 'Cannot reverse a zero or non-debit entry' });
    }

    const math = db.prepare('SELECT SUM(debit) as debit, SUM(credit) as credit FROM folio_entries WHERE folio_id = ?').get(folio.id);
    const prevBalance = (math.debit || 0) - (math.credit || 0);
    const newBalance = prevBalance - adjustmentAmount;

    const entryId = uuidv4();
    // BUG FIX: Use credit column (not negative debit) so SUM(debit)-SUM(credit) balance is correct
    db.prepare(`
      INSERT INTO folio_entries (id, folio_id, entry_type, description, debit, credit, balance, created_by, created_at)
      VALUES (?, ?, 'Adjustment', ?, 0.0, ?, ?, ?, ?)
    `).run(entryId, folio.id, `Adjustment Reversal: ${entry.description}. Reason: ${reason}`, adjustmentAmount, newBalance, `${req.user.name} (${req.user.role})`, new Date().toISOString());

    logAudit(req.user.id, req.user.username, 'CHARGE_REVERSED', `Folio: ${folio.id} | Reversal amt: ${adjustmentAmount}`, `Reason: ${reason}`);

    res.json({ message: 'Folio adjustment posted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDIT COMPLIANCE LOGS ---
app.get('/api/audit', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REPORTS ---
app.get('/api/reports/dashboard', authenticateToken, (req, res) => {
  try {
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const dirtyRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Dirty'").get().count;
    const maintenanceRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Maintenance'").get().count;
    const occupiedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Occupied'").get().count;
    const inhouseCount = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'Checked In'").get().count;
    const reservedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Reserved'").get().count;
    const vacantClean = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Vacant Clean'").get().count;

    const today = new Date().toISOString().split('T')[0];
    const arrivals = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE date(check_in_datetime) = ?").get(today).count;
    const departures = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE date(check_out_datetime) = ?").get(today).count;
    const checkins = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE date(check_in_datetime) = ? AND status = 'Checked In'").get(today).count;
    const checkouts = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE date(check_out_datetime) = ? AND status = 'Checked Out'").get(today).count;
    
    const revenueToday = db.prepare(`
      SELECT SUM(debit) as total 
      FROM folio_entries 
      WHERE entry_type = 'Charge' AND date(created_at) = ? AND is_voided = 0
    `).get(today).total || 0;

    const collectionToday = db.prepare(`
      SELECT SUM(credit) as total 
      FROM folio_entries 
      WHERE entry_type = 'Payment' AND date(created_at) = ? AND is_voided = 0
    `).get(today).total || 0;

    const mathAll = db.prepare("SELECT SUM(debit) as debit, SUM(credit) as credit FROM folio_entries JOIN folios ON folio_entries.folio_id = folios.id WHERE folios.status = 'Open' AND folio_entries.is_voided = 0").get();
    const outstanding = (mathAll.debit || 0) - (mathAll.credit || 0);

    const alerts = [];
    if (dirtyRooms > 3) alerts.push({ id: 1, type: 'warning', text: `${dirtyRooms} Dirty rooms awaiting housekeeping.` });
    if (maintenanceRooms > 0) alerts.push({ id: 2, type: 'info', text: `${maintenanceRooms} rooms are blocked under Maintenance.` });
    
    const delayedCheckins = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE date(check_in_datetime) = ? AND status = 'Reserved'").get(today).count;
    if (delayedCheckins > 0) {
      alerts.push({ id: 3, type: 'danger', text: `${delayedCheckins} arrivals are pending check-in.` });
    }

    res.json({
      occupancy: {
        total: totalRooms,
        available: vacantClean,
        occupied: occupiedRooms,
        inhouse: inhouseCount,
        reserved: reservedRooms,
        dirty: dirtyRooms,
        maintenance: maintenanceRooms
      },
      activity: {
        arrivals,
        departures,
        checkins,
        checkouts,
        walkins: checkins,
        pendingCheckins: delayedCheckins
      },
      financials: {
        revenueToday,
        collectionToday,
        outstanding,
        depositsHeld: 0
      },
      alerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/advanced', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate parameters are required' });
    }

    const getShiftedRange = (sStr, eStr, unit, amount) => {
      const partsS = sStr.split('-').map(Number);
      const partsE = eStr.split('-').map(Number);
      const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
      const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
      if (unit === 'month') {
        s.setMonth(s.getMonth() - amount);
        e.setMonth(e.getMonth() - amount);
      } else if (unit === 'year') {
        s.setFullYear(s.getFullYear() - amount);
        e.setFullYear(e.getFullYear() - amount);
      }
      const pad = (num) => String(num).padStart(2, '0');
      const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return {
        start: formatDate(s),
        end: formatDate(e)
      };
    };

    const prevMonth = getShiftedRange(startDate, endDate, 'month', 1);
    const prevYear = getShiftedRange(startDate, endDate, 'year', 1);

    const getMetrics = (start, end) => {
      const revenue = db.prepare(`
        SELECT SUM(debit) as total 
        FROM folio_entries 
        WHERE entry_type = 'Charge' AND date(created_at) >= ? AND date(created_at) <= ? AND is_voided = 0
      `).get(start, end).total || 0;

      const collections = db.prepare(`
        SELECT SUM(credit) as total 
        FROM folio_entries 
        WHERE entry_type = 'Payment' AND date(created_at) >= ? AND date(created_at) <= ? AND is_voided = 0
      `).get(start, end).total || 0;

      const bookings = db.prepare(`
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE date(check_in_datetime) >= ? AND date(check_in_datetime) <= ?
      `).get(start, end).count || 0;

      return { revenue, collections, bookings };
    };

    const currentMetrics = getMetrics(startDate, endDate);
    const pmMetrics = getMetrics(prevMonth.start, prevMonth.end);
    const pyMetrics = getMetrics(prevYear.start, prevYear.end);

    const bookingsList = db.prepare(`
      SELECT r.id, r.reservation_number, g.name as guest_name, g.mobile as guest_mobile, 
             rt.name as room_type_name, rm.room_number, r.stay_type, 
             r.check_in_datetime, r.check_out_datetime, r.status, 
             r.adults, r.children, r.custom_rate, r.created_at
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE date(r.check_in_datetime) >= ? AND date(r.check_in_datetime) <= ?
      ORDER BY r.check_in_datetime DESC
    `).all(startDate, endDate);

    const transactionsList = db.prepare(`
      SELECT fe.id, fe.folio_id, r.reservation_number, g.name as guest_name,
             fe.entry_type, fe.charge_type, fe.payment_method, fe.description,
             fe.debit, fe.credit, fe.balance, fe.created_by, fe.created_at
      FROM folio_entries fe
      JOIN folios f ON fe.folio_id = f.id
      JOIN reservations r ON f.reservation_id = r.id
      JOIN guests g ON r.guest_id = g.id
      WHERE date(fe.created_at) >= ? AND date(fe.created_at) <= ?
      ORDER BY fe.created_at DESC
    `).all(startDate, endDate);

    res.json({
      ranges: {
        current: { start: startDate, end: endDate },
        prevMonth,
        prevYear
      },
      metrics: {
        current: currentMetrics,
        prevMonth: pmMetrics,
        prevYear: pyMetrics
      },
      bookings: bookingsList,
      transactions: transactionsList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- MOCK CHAT & INTEGRATION FEEDS ---
app.get('/api/whatsapp/feed', authenticateToken, (req, res) => {
  res.json(mockWhatsAppFeed);
});

app.post('/api/whatsapp/send', authenticateToken, async (req, res) => {
  const { mobile, message } = req.body;
  if (!mobile || !message) return res.status(400).json({ error: 'Missing destination or content' });
  await addWhatsAppLog(mobile, message, 'Manual Agent Reply');
  res.json({ success: true });
});

app.get('/api/telegram/feed', authenticateToken, (req, res) => {
  res.json(mockTelegramFeed);
});

// --- PROPERTY SETTINGS ---
app.get('/api/property', authenticateToken, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM property_settings').all();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/property', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const settings = req.body;
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO property_settings (key, value) VALUES (?, ?)');
    Object.keys(settings).forEach(key => {
      stmt.run(key, String(settings[key]));
    });
    logAudit(req.user.id, req.user.username, 'PROPERTY_SETTINGS_UPDATE', null, 'Property metadata changed');
    res.json({ message: 'Property details updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TAX MODULE ---
app.get('/api/taxes', authenticateToken, (req, res) => {
  try {
    const taxes = db.prepare('SELECT * FROM taxes').all();
    res.json(taxes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/taxes', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const { name, rate } = req.body;
  if (!name || isNaN(rate)) return res.status(400).json({ error: 'Missing tax name or rate value' });
  try {
    const id = uuidv4();
    db.prepare('INSERT INTO taxes (id, name, rate) VALUES (?, ?, ?)').run(id, name, parseFloat(rate));
    logAudit(req.user.id, req.user.username, 'TAX_CREATED', null, `${name}: ${rate}%`);
    res.json({ message: 'Tax rule created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/taxes/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const tax = db.prepare('SELECT * FROM taxes WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM taxes WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.username, 'TAX_DELETED', tax.name, null);
    res.json({ message: 'Tax rule removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROOM TYPES CREATE/DELETE ---
app.post('/api/room-types', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, code, capacity } = req.body;
  if (!name || !code || isNaN(capacity)) return res.status(400).json({ error: 'Missing category configurations' });
  try {
    const id = `rt_${code.toLowerCase()}`;
    db.prepare('INSERT INTO room_types (id, name, code, capacity) VALUES (?, ?, ?, ?)').run(id, name, code.toUpperCase(), parseInt(capacity));
    logAudit(req.user.id, req.user.username, 'ROOM_TYPE_CREATED', null, `${name} (${code.toUpperCase()})`);
    res.json({ message: 'Room Type master created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/room-types/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const type = db.prepare('SELECT * FROM room_types WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM room_types WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.username, 'ROOM_TYPE_DELETED', type.name, null);
    res.json({ message: 'Room type category removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/room-types/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { name, code, capacity } = req.body;
  if (!name || !code || isNaN(capacity)) return res.status(400).json({ error: 'Missing category configurations' });
  try {
    db.prepare('UPDATE room_types SET name = ?, code = ?, capacity = ? WHERE id = ?').run(name, code.toUpperCase(), parseInt(capacity), req.params.id);
    logAudit(req.user.id, req.user.username, 'ROOM_TYPE_UPDATED', req.params.id, `${name} (${code.toUpperCase()})`);
    res.json({ message: 'Room Type updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RATE PLANS CREATE/DELETE ---
app.post('/api/rate-plans', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const { name, room_type_id, night_price, day_use_price, hourly_prices } = req.body;
  if (!name || !room_type_id || isNaN(night_price) || isNaN(day_use_price) || !hourly_prices) {
    return res.status(400).json({ error: 'Missing rate plan core fields' });
  }

  try {
    const stmt = db.prepare('INSERT INTO rate_plans (id, room_type_id, name, night_price, day_use_price, hourly_prices) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(uuidv4(), room_type_id, name, parseFloat(night_price), parseFloat(day_use_price), JSON.stringify(hourly_prices));
    logAudit(req.user.id, req.user.username, 'RATE_PLAN_CREATED', null, `${name} posted`);
    res.json({ message: 'Rate plan created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rate-plans/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const plan = db.prepare('SELECT * FROM rate_plans WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM rate_plans WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.username, 'RATE_PLAN_DELETED', plan.name, null);
    res.json({ message: 'Rate plan entry removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/rate-plans/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const { name, night_price, day_use_price, hourly_prices } = req.body;
  if (!name || isNaN(night_price) || isNaN(day_use_price) || !hourly_prices) {
    return res.status(400).json({ error: 'Missing rate plan core fields' });
  }
  try {
    db.prepare('UPDATE rate_plans SET name = ?, night_price = ?, day_use_price = ?, hourly_prices = ? WHERE id = ?')
      .run(name, parseFloat(night_price), parseFloat(day_use_price), JSON.stringify(hourly_prices), req.params.id);
    logAudit(req.user.id, req.user.username, 'RATE_PLAN_UPDATED', req.params.id, name);
    res.json({ message: 'Rate plan updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PHYSICAL ROOMS CREATE/DELETE ---
app.post('/api/rooms', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { room_number, room_type_id, floor, capacity } = req.body;
  if (!room_number || !room_type_id || isNaN(floor) || isNaN(capacity)) {
    return res.status(400).json({ error: 'Missing room details' });
  }
  try {
    db.prepare('INSERT INTO rooms (id, room_number, room_type_id, floor, capacity) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), room_number, room_type_id, parseInt(floor), parseInt(capacity));
    logAudit(req.user.id, req.user.username, 'ROOM_CREATED', room_number, `Floor ${floor}`);
    res.json({ message: 'Room created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.username, 'ROOM_DELETED', room?.room_number, null);
    res.json({ message: 'Room removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PAYMENT METHODS ---
app.get('/api/payment-methods', authenticateToken, (req, res) => {
  try {
    const methods = db.prepare('SELECT * FROM payment_methods').all();
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-methods', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Payment method name is required' });
  try {
    const id = uuidv4();
    db.prepare('INSERT INTO payment_methods (id, name, status) VALUES (?, ?, ?)').run(id, name, 'Active');
    logAudit(req.user.id, req.user.username, 'PAYMENT_METHOD_CREATED', null, name);
    res.json({ message: 'Payment method added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payment-methods/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM payment_methods WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.username, 'PAYMENT_METHOD_DELETED', method.name, null);
    res.json({ message: 'Payment method removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GATEWAY CONFIGS ---
app.get('/api/gateway', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const configs = db.prepare('SELECT * FROM gateway_settings').all();
    const result = {};
    configs.forEach(c => { result[c.key] = c.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gateway', authenticateToken, requireRole(['Admin']), (req, res) => {
  const settings = req.body;
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO gateway_settings (key, value) VALUES (?, ?)');
    Object.keys(settings).forEach(key => {
      stmt.run(key, String(settings[key]));
    });
    logAudit(req.user.id, req.user.username, 'GATEWAY_SETTINGS_UPDATE', null, 'Payment Gateway configurations modified');
    res.json({ message: 'Payment gateway configurations saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEST INTEGRATIONS ROUTE ---
app.post('/api/integrations/test-telegram', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    await addTelegramLog('🔔 *Antigravity PMS Integration Test!* Telegram Connection Verified successfully.');
    res.json({ success: true, message: 'Test message dispatched to owner channel' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/integrations/test-whatsapp', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'Test mobile number is required' });
  try {
    await addWhatsAppLog(mobile, '🔔 *Antigravity PMS Integration Test!* WhatsApp Connection Verified successfully.', 'System Test');
    res.json({ success: true, message: `Test message dispatched to ${mobile}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USER MANAGEMENT ---
app.get('/api/users', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, name, discount_limit FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { username, password, role, name, discount_limit } = req.body;
  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: 'Missing required user fields (username, password, role, name)' });
  }
  const validRoles = ['Admin', 'Manager', 'Receptionist', 'Housekeeping'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, hashedPassword, role, name, parseFloat(discount_limit) || 0);
    logAudit(req.user.id, req.user.username, 'USER_CREATED', null, `Created user: ${username} (${role})`);
    res.json({ message: 'User created successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { role, name, discount_limit, password } = req.body;
  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const newRole = role || targetUser.role;
    const newName = name || targetUser.name;
    const newLimit = discount_limit !== undefined ? parseFloat(discount_limit) : targetUser.discount_limit;

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET role = ?, name = ?, discount_limit = ?, password_hash = ? WHERE id = ?')
        .run(newRole, newName, newLimit, hashedPassword, req.params.id);
    } else {
      db.prepare('UPDATE users SET role = ?, name = ?, discount_limit = ? WHERE id = ?')
        .run(newRole, newName, newLimit, req.params.id);
    }
    logAudit(req.user.id, req.user.username, 'USER_UPDATED', `${targetUser.username} (${targetUser.role})`, `${targetUser.username} (${newRole})`);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROLE PERMISSIONS ---
app.get('/api/permissions', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM role_permissions').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/permissions', authenticateToken, requireRole(['Admin']), (req, res) => {
  const { matrix } = req.body; // Array of { role, module, access_level }
  if (!matrix || !Array.isArray(matrix)) {
    return res.status(400).json({ error: 'Invalid permissions payload format. Expected matrix array.' });
  }
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO role_permissions (role, module, access_level) VALUES (?, ?, ?)');
    const transaction = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.role, item.module, item.access_level);
      }
    });
    transaction(matrix);
    logAudit(req.user.id, req.user.username, 'ROLE_PERMISSIONS_UPDATE', null, `Bulk permissions updated by ${req.user.username}`);
    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════
// INTEGRATIONS CONFIG  (WhatsApp + Telegram + Razorpay separately)
// ═══════════════════════════════════════════════════════════════

app.get('/api/integrations/config', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const keys = [
      'waToken','waPhoneId','waLang','waVerifyToken',
      'tgToken','tgChatId',
      'rzpKeyId','rzpKeySecret','rzpWebhookSecret','rzpMode'
    ];
    const result = {};
    keys.forEach(k => {
      const row = db.prepare('SELECT value FROM property_settings WHERE key = ?').get(k);
      result[k] = row ? row.value : '';
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/integrations/config', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const allowed = [
      'waToken','waPhoneId','waLang','waVerifyToken',
      'tgToken','tgChatId',
      'rzpKeyId','rzpKeySecret','rzpWebhookSecret','rzpMode'
    ];
    const stmt = db.prepare('INSERT OR REPLACE INTO property_settings (key, value) VALUES (?, ?)');
    const save = db.transaction((body) => {
      allowed.forEach(k => { if (body[k] !== undefined) stmt.run(k, String(body[k])); });
    });
    save(req.body);
    logAudit(req.user.id, req.user.username, 'INTEGRATIONS_CONFIG_UPDATED', null, 'Integrations config saved');
    res.json({ message: 'Integration settings saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────────────────────────────────────────────────────────
// WHATSAPP INCOMING WEBHOOK  (Meta calls this when guest replies)
// ───────────────────────────────────────────────────────────────

// GET: Meta webhook verification handshake
app.get('/api/whatsapp/webhook', (req, res) => {
  const verifyToken = getSetting('waVerifyToken') || 'pms_verify_token';
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WA Webhook] Verification successful');
    res.status(200).send(challenge);
  } else {
    console.warn('[WA Webhook] Verification FAILED — wrong verify_token');
    res.sendStatus(403);
  }
});

// POST: Incoming messages from guests
app.post('/api/whatsapp/webhook', express.json(), (req, res) => {
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    // Handle incoming text messages from guests
    const messages = value?.messages || [];
    messages.forEach(msg => {
      if (msg.type === 'text') {
        const from = msg.from; // e.164 without +
        const text = msg.text?.body || '';
        const log  = {
          id: uuidv4(),
          mobile: from.startsWith('91') ? from.slice(2) : from,
          message: text,
          type: 'Guest Reply',
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
        };
        mockWhatsAppFeed.unshift(log);
        console.log(`[WA Incoming] From ${from}: ${text}`);
      }
    });

    // Acknowledge delivery / read receipts silently
    res.sendStatus(200);
  } catch (err) {
    console.error('[WA Webhook] Error:', err.message);
    res.sendStatus(500);
  }
});

// ───────────────────────────────────────────────────────────────
// RAZORPAY PAYMENT GATEWAY
// ───────────────────────────────────────────────────────────────

function getRazorpayInstance() {
  const keyId     = getSetting('rzpKeyId');
  const keySecret = getSetting('rzpKeySecret');
  if (!keyId || !keySecret) throw new Error('Razorpay credentials not configured in Admin → Integrations');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Create a Razorpay order for a folio balance
app.post('/api/razorpay/order', authenticateToken, async (req, res) => {
  const { folio_id, amount_paise, description } = req.body;
  if (!folio_id || !amount_paise || amount_paise < 100) {
    return res.status(400).json({ error: 'folio_id and amount_paise (min ₹1) are required' });
  }
  try {
    const rzp = getRazorpayInstance();
    const order = await rzp.orders.create({
      amount: Math.round(amount_paise),       // in paise
      currency: 'INR',
      receipt: folio_id.slice(0, 40),
      notes: { folio_id, description: description || 'Hotel Folio Payment' },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency,
               keyId: getSetting('rzpKeyId'), mode: getSetting('rzpMode') || 'test' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Razorpay payment signature after checkout
app.post('/api/razorpay/verify', authenticateToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, folio_id, amount } = req.body;
  try {
    const secret = getSetting('rzpKeySecret');
    const body   = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature — possible tampering detected' });
    }

    // Signature valid → record payment on folio
    const folio = db.prepare('SELECT * FROM folios WHERE id = ?').get(folio_id);
    if (!folio) return res.status(404).json({ error: 'Folio not found' });

    const currentBalance = db.prepare(
      'SELECT COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) AS bal FROM folio_entries WHERE folio_id = ?'
    ).get(folio_id)?.bal || 0;
    const amtFloat = parseFloat(amount);
    const newBalance = parseFloat((currentBalance - amtFloat).toFixed(2));
    const entryId = uuidv4();

    db.prepare(
      'INSERT INTO folio_entries (id, folio_id, entry_type, payment_method, description, debit, credit, balance, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(entryId, folio_id, 'Payment', 'Razorpay', `Online Payment (${razorpay_payment_id})`, 0, amtFloat, newBalance, 'Razorpay Gateway', new Date().toISOString());

    logAudit('system', 'razorpay_gateway', 'ONLINE_PAYMENT_RECEIVED', folio_id, `₹${amtFloat} via Razorpay — ${razorpay_payment_id}`);

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(folio.reservation_id);
    const guest = reservation ? db.prepare('SELECT * FROM guests WHERE id = ?').get(reservation.guest_id) : null;
    if (guest) {
      await addWhatsAppLog(
        guest.mobile,
        `Online Payment of ₹${amtFloat} received via Razorpay for Res ${reservation.reservation_number}. Remaining: ₹${newBalance}.`,
        'payment_receipt',
        { guestName: guest.name, amount: amtFloat, method: 'Razorpay', resNumber: reservation.reservation_number }
      );
      await addTelegramLog(`💰 *Online Payment!* Guest: ${guest.name} | ₹${amtFloat} via Razorpay | Payment ID: ${razorpay_payment_id}`);
    }

    res.json({ success: true, message: 'Payment verified and recorded', newBalance, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Razorpay webhook (for server-to-server event handling)
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const webhookSecret = getSetting('rzpWebhookSecret');
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSig = crypto.createHmac('sha256', webhookSecret)
        .update(req.body).digest('hex');
      if (signature !== expectedSig) {
        console.warn('[RZP Webhook] Signature mismatch — ignored');
        return res.sendStatus(400);
      }
    }
    const event = JSON.parse(req.body);
    console.log(`[RZP Webhook] Event: ${event.event}`);
    // Future: handle payment.captured, refund.created etc.
    res.sendStatus(200);
  } catch (err) {
    console.error('[RZP Webhook] Error:', err.message);
    res.sendStatus(500);
  }
});

// Test integrations
app.post('/api/integrations/test-razorpay', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const rzp = getRazorpayInstance();
    // Fetch one payment to verify credentials work
    await rzp.payments.all({ count: 1 });
    res.json({ success: true, message: 'Razorpay credentials are valid ✅' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Setup server listen
app.listen(PORT, () => {
  console.log(`Hotel PMS Server is running on port ${PORT}`);
});
