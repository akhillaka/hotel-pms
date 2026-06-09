const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seed() {
  console.log('Starting seed operations...');

  // Check if room types exist
  const roomTypesCount = db.prepare('SELECT COUNT(*) as count FROM room_types').get().count;
  if (roomTypesCount === 0) {
    console.log('Seeding Room Types...');
    const insertRoomType = db.prepare('INSERT INTO room_types (id, name, code, capacity) VALUES (?, ?, ?, ?)');
    
    insertRoomType.run('rt_std', 'Standard Room', 'STD', 2);
    insertRoomType.run('rt_dlx', 'Deluxe Room', 'DLX', 3);
    insertRoomType.run('rt_ste', 'Suite', 'STE', 4);
    insertRoomType.run('rt_hrly', 'Hourly Stay Special', 'HSS', 2);
  }

  // Check if rooms exist
  const roomsCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomsCount === 0) {
    console.log('Seeding Rooms...');
    const insertRoom = db.prepare('INSERT INTO rooms (id, room_number, room_type_id, floor, capacity) VALUES (?, ?, ?, ?, ?)');
    
    // Floor 1 Rooms
    insertRoom.run('r_101', '101', 'rt_std', 1, 2);
    insertRoom.run('r_102', '102', 'rt_std', 1, 2);
    insertRoom.run('r_103', '103', 'rt_dlx', 1, 3);
    insertRoom.run('r_104', '104', 'rt_dlx', 1, 3);
    
    // Floor 2 Rooms
    insertRoom.run('r_201', '201', 'rt_std', 2, 2);
    insertRoom.run('r_202', '202', 'rt_std', 2, 2);
    insertRoom.run('r_203', '203', 'rt_dlx', 2, 3);
    insertRoom.run('r_204', '204', 'rt_ste', 2, 4);

    // Floor 3 Rooms
    insertRoom.run('r_301', '301', 'rt_hrly', 3, 2);
    insertRoom.run('r_302', '302', 'rt_hrly', 3, 2);
  }

  // Check if rate plans exist
  const ratePlansCount = db.prepare('SELECT COUNT(*) as count FROM rate_plans').get().count;
  if (ratePlansCount === 0) {
    console.log('Seeding Rate Plans...');
    const insertRatePlan = db.prepare('INSERT INTO rate_plans (id, room_type_id, name, night_price, day_use_price, hourly_prices) VALUES (?, ?, ?, ?, ?, ?)');
    
    const roomTypes = ['rt_std', 'rt_dlx', 'rt_ste', 'rt_hrly'];
    const baseNightPrices = { rt_std: 1500, rt_dlx: 2500, rt_ste: 5000, rt_hrly: 2000 };
    const baseDayPrices = { rt_std: 1000, rt_dlx: 1800, rt_ste: 3500, rt_hrly: 1200 };
    const baseHourPrices = { rt_std: 150, rt_dlx: 250, rt_ste: 500, rt_hrly: 100 };

    roomTypes.forEach(rtId => {
      // Build hourly prices map
      const hourlyPrices = {};
      for (let h = 1; h <= 24; h++) {
        const factor = h <= 3 ? h : 3 + (h - 3) * 0.5; // cheaper rates for longer durations
        hourlyPrices[h] = Math.round(baseHourPrices[rtId] * factor);
      }
      
      insertRatePlan.run(
        uuidv4(),
        rtId,
        'Standard Rate Plan',
        baseNightPrices[rtId],
        baseDayPrices[rtId],
        JSON.stringify(hourlyPrices)
      );
    });
  }

  // Check if users exist
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (usersCount === 0) {
    console.log('Seeding Users...');
    const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, role, name, discount_limit) VALUES (?, ?, ?, ?, ?, ?)');
    
    const salt = bcrypt.genSaltSync(10);
    
    insertUser.run('u_admin', 'admin', bcrypt.hashSync('admin123', salt), 'Admin', 'Chief Executive', 100.0);
    insertUser.run('u_manager', 'manager', bcrypt.hashSync('manager123', salt), 'Manager', 'Property Manager', 20.0);
    insertUser.run('u_recep', 'receptionist', bcrypt.hashSync('recep123', salt), 'Receptionist', 'Front Desk Agent', 5.0);
    insertUser.run('u_house', 'housekeeping', bcrypt.hashSync('house123', salt), 'Housekeeping', 'Housekeeper Staff', 0.0);
  }

  // Check if guests exist
  const guestsCount = db.prepare('SELECT COUNT(*) as count FROM guests').get().count;
  if (guestsCount === 0) {
    console.log('Seeding Guests and Reservations...');
    
    // Seed some guests
    const insertGuest = db.prepare('INSERT INTO guests (id, name, mobile, nationality) VALUES (?, ?, ?, ?)');
    const guest1Id = 'g_1';
    const guest2Id = 'g_2';
    insertGuest.run(guest1Id, 'John Doe', '9876543210', 'American');
    insertGuest.run(guest2Id, 'Alice Smith', '9876543211', 'British');
    
    // Get standard rate plan and deluxe rate plan ids
    const stdRatePlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1").get();
    const dlxRatePlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_dlx' LIMIT 1").get();

    if (stdRatePlan && dlxRatePlan) {
      // Seed some reservations
      const insertRes = db.prepare(`
        INSERT INTO reservations (id, reservation_number, guest_id, room_type_id, room_id, stay_type, check_in_datetime, check_out_datetime, status, adults, children, rate_plan_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertFolio = db.prepare('INSERT INTO folios (id, reservation_id, status, created_at) VALUES (?, ?, ?, ?)');
      
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
      
      insertRes.run(
        res1Id,
        'RES-100001',
        guest1Id,
        'rt_std',
        'r_101',
        'night',
        checkinDate1.toISOString(),
        checkoutDate1.toISOString(),
        'Checked In',
        2,
        0,
        stdRatePlan.id,
        now
      );
      insertFolio.run('f_1', res1Id, 'Open', now);
      
      // Update room status
      db.prepare("UPDATE rooms SET status = 'Occupied' WHERE id = 'r_101'").run();
      
      insertRes.run(
        res2Id,
        'RES-100002',
        guest2Id,
        'rt_dlx',
        null,
        'night',
        checkinDate2.toISOString(),
        checkoutDate2.toISOString(),
        'Reserved',
        2,
        1,
        dlxRatePlan.id,
        now
      );
      insertFolio.run('f_2', res2Id, 'Open', now);
    }
  }

  console.log('Seeding complete successfully.');
}

// Run seed if this is executed directly
if (require.main === module) {
  seed();
}

module.exports = seed;
