import db from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default async function seed() {
  console.log('Starting async seed operations...');

  try {
    // Disable foreign keys temporarily
    await db.query('PRAGMA foreign_keys = OFF');

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
      'property_transactions',
      'users',
      'rooms',
      'rate_plans',
      'room_types'
    ];

    // Drop delete-prevention triggers
    for (const table of tablesToClear) {
      if (table !== 'users' && table !== 'rooms' && table !== 'rate_plans' && table !== 'room_types') {
        await db.query(`DROP TRIGGER IF EXISTS prevent_delete_${table}`);
      }
    }

    // Clear tables
    for (const table of tablesToClear) {
      await db.query(`DELETE FROM ${table}`);
    }

    // Re-enable foreign keys
    await db.query('PRAGMA foreign_keys = ON');

    // Re-create the triggers
    for (const table of tablesToClear) {
      if (table !== 'users' && table !== 'rooms' && table !== 'rate_plans' && table !== 'room_types') {
        await db.query(`
          CREATE TRIGGER IF NOT EXISTS prevent_delete_${table}
          BEFORE DELETE ON ${table}
          BEGIN
            SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table ${table} due to hotel PMS audit policy.');
          END
        `);
      }
    }

    // Seed role permissions
    console.log('Seeding role permissions...');
    await db.query("DELETE FROM role_permissions");
    await db.query("DELETE FROM taxes");
    await db.query("DELETE FROM payment_methods");
    await db.query("DELETE FROM gateway_settings");
    await db.query("DELETE FROM property_settings");
    const defaultRoles = [
      { role: "Admin", modules: ["dashboard","rooms","guests","billing","chat","reports","admin","integrations","audit","housekeeping","transactions"], access: "edit" },
      { role: "Manager", modules: ["dashboard","rooms","guests","billing","chat","reports","admin","integrations","audit","housekeeping","transactions"], access: "edit" },
      { role: "Receptionist", modules: ["dashboard","rooms","guests","billing","chat","housekeeping","transactions","reports"], access: "read", overrides: { "rooms": "edit", "guests": "edit", "billing": "edit", "chat": "edit" } },
      { role: "Housekeeping", modules: ["rooms","housekeeping"], access: "edit" }
    ];

    for (const r of defaultRoles) {
      for (const m of r.modules) {
        const acc = r.overrides && r.overrides[m] ? r.overrides[m] : r.access;
        await db.query("INSERT OR IGNORE INTO role_permissions (role, module, access_level) VALUES (?, ?, ?)", [r.role, m, acc]);
      }
    }

    // Seed Room Types
    console.log('Seeding Room Types...');
    await db.query("INSERT INTO room_types (id, name, code, capacity) VALUES ('rt_std', 'Standard Room', 'STD', 2)");
    await db.query("INSERT INTO room_types (id, name, code, capacity) VALUES ('rt_dlx', 'Deluxe Room', 'DLX', 3)");
    await db.query("INSERT INTO room_types (id, name, code, capacity) VALUES ('rt_ste', 'Suite', 'STE', 4)");
    await db.query("INSERT INTO room_types (id, name, code, capacity) VALUES ('rt_hrly', 'Hourly Stay Special', 'HSS', 2)");

    // Seed Rooms
    console.log('Seeding Rooms...');
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_101', '101', 'rt_std', 1, 2, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_102', '102', 'rt_std', 1, 2, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_103', '103', 'rt_dlx', 1, 3, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_104', '104', 'rt_dlx', 1, 3, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_201', '201', 'rt_std', 2, 2, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_202', '202', 'rt_std', 2, 2, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_203', '203', 'rt_dlx', 2, 3, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_204', '204', 'rt_ste', 2, 4, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_301', '301', 'rt_hrly', 3, 2, 'Dirty')");
    await db.query("INSERT INTO rooms (id, room_number, room_type_id, floor, capacity, status) VALUES ('r_302', '302', 'rt_hrly', 3, 2, 'Dirty')");

    // Seed Rate Plans
    console.log('Seeding Rate Plans...');
    const roomTypes = ['rt_std', 'rt_dlx', 'rt_ste', 'rt_hrly'];
    const baseNightPrices = { rt_std: 1500, rt_dlx: 2500, rt_ste: 5000, rt_hrly: 2000 };
    const baseDayPrices = { rt_std: 1000, rt_dlx: 1800, rt_ste: 3500, rt_hrly: 1200 };
    const baseHourPrices = { rt_std: 150, rt_dlx: 250, rt_ste: 500, rt_hrly: 100 };

    for (const rtId of roomTypes) {
      const hourlyPrices = {};
      for (let h = 1; h <= 24; h++) {
        const factor = h <= 3 ? h : 3 + (h - 3) * 0.5;
        hourlyPrices[h] = Math.round(baseHourPrices[rtId] * factor);
      }
      await db.query(
        'INSERT INTO rate_plans (id, room_type_id, name, night_price, day_use_price, hourly_prices) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), rtId, 'Standard Rate Plan', baseNightPrices[rtId], baseDayPrices[rtId], JSON.stringify(hourlyPrices)]
      );
    }

    // Seed Users
    console.log('Seeding Users...');
    const salt = bcrypt.genSaltSync(10);
    await db.query(
      'INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)',
      ['u_admin', 'admin', bcrypt.hashSync('admin123', salt), 'Admin', 'Chief Executive', 100.0]
    );
    await db.query(
      'INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)',
      ['u_manager', 'manager', bcrypt.hashSync('manager123', salt), 'Manager', 'Property Manager', 20.0]
    );
    await db.query(
      'INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)',
      ['u_recep', 'receptionist', bcrypt.hashSync('recep123', salt), 'Receptionist', 'Front Desk Agent', 5.0]
    );
    await db.query(
      'INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)',
      ['u_house', 'housekeeping', bcrypt.hashSync('house123', salt), 'Housekeeping', 'Housekeeper Staff', 0.0]
    );

    // Seed Guests & Reservations
    console.log('Seeding Guests and Reservations...');
    const guest1Id = 'g_1';
    const guest2Id = 'g_2';
    await db.query("INSERT INTO guests (id, name, mobile, nationality) VALUES (?, ?, ?, ?)", [guest1Id, 'John Doe', '9876543210', 'American']);
    await db.query("INSERT INTO guests (id, name, mobile, nationality) VALUES (?, ?, ?, ?)", [guest2Id, 'Alice Smith', '9876543211', 'British']);

    const stdRatePlan = await db.querySingle("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1");
    const dlxRatePlan = await db.querySingle("SELECT id FROM rate_plans WHERE room_type_id = 'rt_dlx' LIMIT 1");

    if (stdRatePlan && dlxRatePlan) {
      const res1Id = 'res_1';
      const res2Id = 'res_2';
      const now = new Date().toISOString();
      const checkinDate1 = new Date();
      checkinDate1.setHours(checkinDate1.getHours() - 2);
      const checkoutDate1 = new Date();
      checkoutDate1.setDate(checkoutDate1.getDate() + 2);

      const checkinDate2 = new Date();
      checkinDate2.setDate(checkinDate2.getDate() + 1);
      const checkoutDate2 = new Date();
      checkoutDate2.setDate(checkoutDate2.getDate() + 3);

      await db.query(
        `INSERT INTO reservations (id, reservation_number, guest_id, room_type_id, room_id, stay_type, check_in_datetime, check_out_datetime, status, adults, children, rate_plan_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [res1Id, 'RES-100001', guest1Id, 'rt_std', 'r_101', 'night', checkinDate1.toISOString(), checkoutDate1.toISOString(), 'Checked In', 2, 0, stdRatePlan.id, now]
      );
      await db.query('INSERT INTO folios (id, reservation_id, status, created_at) VALUES (?, ?, ?, ?)', ['f_1', res1Id, 'Open', now]);
      await db.query("UPDATE rooms SET status = 'Occupied' WHERE id = 'r_101'");

      await db.query(
        `INSERT INTO reservations (id, reservation_number, guest_id, room_type_id, room_id, stay_type, check_in_datetime, check_out_datetime, status, adults, children, rate_plan_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [res2Id, 'RES-100002', guest2Id, 'rt_dlx', null, 'night', checkinDate2.toISOString(), checkoutDate2.toISOString(), 'Reserved', 2, 1, dlxRatePlan.id, now]
      );
      await db.query('INSERT INTO folios (id, reservation_id, status, created_at) VALUES (?, ?, ?, ?)', ['f_2', res2Id, 'Open', now]);
    }
    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
