import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Force test configuration (uses in-memory database)
process.env.NODE_ENV = 'test';

import app from '../index';
import seed from '../seed';
const db = app.db;

describe('Comprehensive PMS Security, Calculations & Compliance Tests', () => {
  let adminToken;
  let managerToken;
  let receptionistToken;
  let housekeepingToken;

  beforeAll(async () => {
    // Seed in-memory database
    await seed();

    // Authenticate all user roles to get their tokens
    const login = async (username, password) => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username, password });
      return res.body.token;
    };

    adminToken = await login('admin', 'admin123');
    managerToken = await login('manager', 'manager123');
    receptionistToken = await login('receptionist', 'recep123');
    housekeepingToken = await login('housekeeping', 'house123');
  });

  afterAll(() => {
    db.close();
  });

  describe('1. Dynamic RBAC & Access Tampering Checks', () => {
    it('should block Housekeeping from accessing the reports dashboard', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${housekeepingToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Module 'reports' is disabled for your role.");
    });

    it('should allow Receptionist to read the dashboard but block Housekeeping', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${receptionistToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('occupancy');
    });

    it('should block Receptionist from retrieving admin configuration settings', async () => {
      const res = await request(app)
        .get('/api/integrations/config')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Module 'admin' is disabled for your role.");
    });

    it('should block Receptionist from performing mutations on Admin endpoints', async () => {
      const res = await request(app)
        .post('/api/taxes')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ name: 'Vat', rate: 10 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Module 'admin' is disabled for your role.");
    });

    it('should allow Admin to retrieve configurations and mutate settings', async () => {
      const res1 = await request(app)
        .get('/api/integrations/config')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post('/api/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Luxury Tax', rate: 12 });
      expect(res2.status).toBe(200);
    });
  });

  describe('2. Deletion Prevention & Compliance Audit Policy', () => {
    const complianceTables = [
      'guests',
      'reservations',
      'folios',
      'folio_entries',
      'audit_logs',
      'property_transactions'
    ];

    complianceTables.forEach((table) => {
      it(`should block DELETE operations on the "${table}" table due to compliance triggers`, () => {
        // SQLite triggers are row-level. Ensure at least 1 row exists in the table to fire the trigger.
        try {
          if (table === 'folio_entries') {
            db.prepare(`
              INSERT OR REPLACE INTO folio_entries (id, folio_id, entry_type, description, debit, credit, balance, created_by, created_at)
              VALUES ('dummy_id', 'f_1', 'Charge', 'Dummy', 1.0, 0.0, 1.0, 'System', '2026-06-09')
            `).run();
          } else if (table === 'property_transactions') {
            db.prepare(`
              INSERT OR REPLACE INTO property_transactions (id, type, amount, category, description, created_by, created_at)
              VALUES ('dummy_id', 'Income', 10.0, 'Room Tariff', 'Dummy', 'System', '2026-06-09')
            `).run();
          }
        } catch (e) {
          // Ignore constraint failures
        }

        expect(() => {
          db.prepare(`DELETE FROM ${table}`).run();
        }).toThrow(/Compliance Alert: Deletion is strictly prohibited/);
      });
    });
  });

  describe('3. Calculations: Taxes, Folio Adjustments & Discount Limits', () => {
    let folioId = 'f_1';
    let chargeEntryId;

    it('should calculate and post charges to a folio correctly', async () => {
      // Configure tax mode to Inclusive and select luxury tax (which we created in the RBAC test)
      db.prepare("INSERT OR REPLACE INTO property_settings (key, value) VALUES ('tax_calculation_mode', 'Inclusive')").run();
      const tax = db.prepare("SELECT id, rate FROM taxes WHERE name = 'Luxury Tax'").get();
      
      const res = await request(app)
        .post(`/api/folios/${folioId}/charge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          charge_type: 'Room Service',
          description: 'Lobster Dinner',
          amount: '112.00', // Inclusive calculations: Base = 112 / 1.12 = 100, Tax = 12
          tax_id: tax.id
        });
      
      expect(res.status).toBe(200);

      // Verify records in database
      const entries = db.prepare("SELECT * FROM folio_entries WHERE folio_id = ? AND description LIKE '%Lobster%'").all(folioId);
      expect(entries.length).toBeGreaterThanOrEqual(1);

      const baseEntry = entries.find(e => e.charge_type === 'Room Service');
      // Assign charge ID before any assertions to prevent cascading failures in subsequent tests
      chargeEntryId = baseEntry.id;

      expect(baseEntry.debit).toBeCloseTo(100.00, 2);

      const taxEntry = db.prepare("SELECT * FROM folio_entries WHERE folio_id = ? AND charge_type = 'Tax' AND description LIKE '%Luxury Tax%'").get(folioId);
      expect(taxEntry).toBeDefined();
      expect(taxEntry.debit).toBeCloseTo(12.00, 2);
    });

    it('should block Receptionist from posting discounts exceeding their role limit (5%)', async () => {
      const res = await request(app)
        .post(`/api/folios/${folioId}/adjust`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          original_entry_id: chargeEntryId,
          reason: 'Client discount request',
          discount_percent: '10.00' // Receptionist limit is 5.0%
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('DISCOUNT_LIMIT_EXCEEDED');
      expect(res.body.message).toContain('maximum discount policy limit of 5%');
    });

    it('should allow Admin to override and post discounts exceeding 5%', async () => {
      const res = await request(app)
        .post(`/api/folios/${folioId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          original_entry_id: chargeEntryId,
          reason: 'Manager Loyalty Waiver',
          discount_percent: '20.00' // Admin limit is 100%
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Folio adjustment posted successfully');

      // Verify adjustment record in DB
      const adjustment = db.prepare("SELECT * FROM folio_entries WHERE folio_id = ? AND entry_type = 'Adjustment'").get(folioId);
      expect(adjustment).toBeDefined();
      expect(adjustment.credit).toBeCloseTo(100.00, 2); // Reversed the base charge debit amount
    });

    it('should block Receptionist from reopening a folio', async () => {
      db.prepare("UPDATE folios SET status = 'Checked Out' WHERE id = ?").run(folioId);
      const res = await request(app)
        .post(`/api/folios/${folioId}/reopen`)
        .set('Authorization', `Bearer ${receptionistToken}`);
      
      expect(res.status).toBe(403);
    });

    it('should allow Manager or Admin to reopen a folio', async () => {
      db.prepare("UPDATE folios SET status = 'Checked Out' WHERE id = ?").run(folioId);
      db.prepare("UPDATE reservations SET status = 'Checked Out' WHERE id = 'res_1'").run();

      const res = await request(app)
        .post(`/api/folios/${folioId}/reopen`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Folio reopened successfully');

      const folio = db.prepare("SELECT status FROM folios WHERE id = ?").get(folioId);
      expect(folio.status).toBe('Open');

      const reservation = db.prepare("SELECT status FROM reservations WHERE id = 'res_1'").get();
      expect(reservation.status).toBe('Checked In');
    });
  });

  describe('4. Reservation, Booking & Room Validation Edge Cases', () => {
    it('should prevent checking in a guest who is already checked in', async () => {
      // res_1 is checked-in by default seeder
      const res = await request(app)
        .post('/api/reservations/res_1/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room_id: 'r_101'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Guest is already checked in to this reservation');
    });

    it('should prevent checking in a cancelled reservation', async () => {
      // Cancel reservation res_2 first
      db.prepare("UPDATE reservations SET status = 'Cancelled' WHERE id = 'res_2'").run();

      const res = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room_id: 'r_101'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot check-in a cancelled reservation');
    });

    it('should prevent double-bookings that exceed category capacity', async () => {
      // The capacity for 'rt_std' (Standard Room) is 4 rooms total.
      // Let's reserve all standard rooms for the same overlapping period.
      // Cancel/cleanup other Standard reservations to start clean
      db.prepare("UPDATE reservations SET status = 'Cancelled' WHERE room_type_id = 'rt_std' AND id != 'res_1'").run();

      // Get standard rate plan id to avoid dummy values
      const stdPlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1").get();
      
      const payload = (mobile) => ({
        guest: { name: 'Test Guest', mobile },
        stay_type: 'night',
        room_type_id: 'rt_std',
        rate_plan_id: stdPlan.id,
        check_in: '2026-07-20T12:00:00.000Z',
        check_out: '2026-07-22T12:00:00.000Z'
      });

      // Total Standard Rooms in seed: 4
      // We perform 4 bookings for standard room in this duration.
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/reservations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload(`900000000${i}`));
        expect(res.status).toBe(200);
      }

      // The 5th booking should fail with a capacity block
      const res5 = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload('9000000005'));
      
      expect(res5.status).toBe(400);
      expect(res5.body.error).toContain('Double Booking Blocked: No room capacity available');
    });

    it('should block Receptionist from booking a blacklisted guest, but allow Admin override', async () => {
      // 1. Blacklist John Doe (g_1, mobile 9876543210)
      const blacklistRes = await request(app)
        .patch('/api/guests/g_1/blacklist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          is_blacklisted: true,
          blacklist_reason: 'Unpaid bills history'
        });
      expect(blacklistRes.status).toBe(200);

      const stdPlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1").get();
      const bookingPayload = {
        guest: { name: 'John Doe', mobile: '9876543210' }, // Mobile matches blacklisted John Doe
        stay_type: 'night',
        room_type_id: 'rt_std',
        rate_plan_id: stdPlan.id,
        check_in: '2026-08-01T12:00:00.000Z',
        check_out: '2026-08-03T12:00:00.000Z'
      };

      // 2. Try booking as Receptionist -> blocked
      const resRecep = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(bookingPayload);
      
      expect(resRecep.status).toBe(403);
      expect(resRecep.body.error).toContain('BLACKLISTED_GUEST');

      // 3. Try booking as Admin -> allowed
      const resAdmin = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bookingPayload);
      
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body).toHaveProperty('reservationId');
    });

    it('should block Receptionist from checking in to occupied rooms, but allow Admin override', async () => {
      // Cancel res_1 to avoid overlapping Checked In reservations in r_101
      db.prepare("UPDATE reservations SET status = 'Cancelled' WHERE id = 'res_1'").run();
      // Set room r_101 to Occupied and reservation res_2 to Reserved
      db.prepare("UPDATE rooms SET status = 'Occupied' WHERE id = 'r_101'").run();
      db.prepare("UPDATE reservations SET status = 'Reserved', room_type_id = 'rt_std' WHERE id = 'res_2'").run();

      // 1. Try checking in as Receptionist -> blocked
      // We pass the document fields via form data (.field and .attach) to bypass the DOCUMENT_BLOCK check
      const resRecep = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .field('room_id', 'r_101')
        .field('id_type', 'Passport')
        .field('id_number', 'DUMMY123')
        .field('guest_name', 'Alice Smith')
        .attach('photo', Buffer.from('dummy'), 'photo.jpg')
        .attach('idFront', Buffer.from('dummy'), 'id_front.jpg')
        .attach('idBack', Buffer.from('dummy'), 'id_back.jpg');

      expect(resRecep.status).toBe(400);
      expect(resRecep.body.error).toContain('Room is not Clean & Vacant');

      // 2. Try checking in as Admin -> succeeds
      const resAdmin = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room_id: 'r_101'
        });
      expect(resAdmin.status).toBe(200);
      
      // Verify reservation was checked in
      const checkRes = db.prepare("SELECT status FROM reservations WHERE id = 'res_2'").get();
      expect(checkRes.status).toBe('Checked In');
    });

    it('should block checking in a reservation into a room with an overlapping Checked In reservation', async () => {
      // Reset res_2 to Reserved
      db.prepare("UPDATE reservations SET status = 'Reserved', room_id = NULL WHERE id = 'res_2'").run();
      // Make res_1 Checked In in r_101 again
      db.prepare("UPDATE reservations SET status = 'Checked In', room_id = 'r_101' WHERE id = 'res_1'").run();

      // Try checking in res_2 to r_101 (overlaps with res_1) as Admin -> should fail with overlap error
      const res = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room_id: 'r_101'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Room is already occupied by an overlapping active checked-in reservation');
    });

    it('should block extending dates of a checked-in reservation if it conflicts with another checked-in stay', async () => {
      // Let's create two checked-in reservations in the database with non-overlapping dates initially
      // res_1 in r_101: June 8 to June 10
      // res_2 in r_101: June 10 to June 12
      db.prepare(`
        UPDATE reservations 
        SET status = 'Checked In', room_id = 'r_101', 
            check_in_datetime = '2026-06-08T12:00:00.000Z', 
            check_out_datetime = '2026-06-10T12:00:00.000Z' 
        WHERE id = 'res_1'
      `).run();
      db.prepare(`
        UPDATE reservations 
        SET status = 'Checked In', room_id = 'r_101', 
            check_in_datetime = '2026-06-10T12:00:00.000Z', 
            check_out_datetime = '2026-06-12T12:00:00.000Z' 
        WHERE id = 'res_2'
      `).run();

      // Try modifying res_1 check-out date to June 11 (which overlaps with res_2)
      const res = await request(app)
        .patch('/api/reservations/res_1/dates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          check_out: '2026-06-11T12:00:00.000Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('conflict');
    });

    it('should prevent check-in of a checked-out reservation', async () => {
      db.prepare("UPDATE reservations SET status = 'Checked Out' WHERE id = 'res_2'").run();
      const res = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_id: 'r_101' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot check-in a checked-out reservation');
    });

    it('should prevent check-in to a room in Maintenance status', async () => {
      db.prepare("UPDATE rooms SET status = 'Maintenance' WHERE id = 'r_101'").run();
      db.prepare("UPDATE reservations SET status = 'Reserved', room_id = NULL WHERE id = 'res_2'").run();
      
      const res = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_id: 'r_101' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('currently under maintenance');
    });

    it('should prevent a Receptionist from checking in to a mismatched room type but allow Admin override', async () => {
      // res_2 is rt_dlx. Room r_101 is rt_std.
      db.prepare("UPDATE rooms SET status = 'Vacant Clean' WHERE id = 'r_101'").run();
      db.prepare("UPDATE reservations SET status = 'Reserved', room_id = NULL, room_type_id = 'rt_dlx' WHERE id = 'res_2'").run();

      // Recep tries -> fails
      const resRecep = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .field('room_id', 'r_101')
        .field('id_type', 'Passport')
        .field('id_number', 'DUMMY123')
        .field('guest_name', 'Alice Smith')
        .attach('photo', Buffer.from('dummy'), 'photo.jpg')
        .attach('idFront', Buffer.from('dummy'), 'id_front.jpg')
        .attach('idBack', Buffer.from('dummy'), 'id_back.jpg');

      expect(resRecep.status).toBe(400);
      expect(resRecep.body.error).toContain('Room type mismatch');

      // Admin tries -> succeeds
      const resAdmin = await request(app)
        .post('/api/reservations/res_2/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_id: 'r_101' });

      expect(resAdmin.status).toBe(200);
    });

    it('should prevent manual room status change to Vacant Clean or Dirty for occupied rooms', async () => {
      // Room r_101 has active check-in (res_2 from previous test)
      const res = await request(app)
        .patch('/api/rooms/r_101/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Vacant Clean' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot set room status to Vacant Clean or Dirty while there is an active checked-in guest');
    });

    it('should revert room status to Occupied when resolving maintenance if a guest is active', async () => {
      // Room r_101 is Occupied. Let's create an open maintenance ticket
      const ticketId = 'test_ticket_val_' + Date.now();
      db.prepare("INSERT INTO maintenance_tickets (id, room_id, issue, status, created_at) VALUES (?, 'r_101', 'AC Leak', 'Open', '2026-06-08T12:00:00.000Z')").run(ticketId);
      db.prepare("UPDATE rooms SET status = 'Maintenance' WHERE id = 'r_101'").run();

      // Resolve the ticket
      const res = await request(app)
        .patch(`/api/maintenance/${ticketId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      
      // Verify room status reverted to Occupied because res_2 is still active in r_101
      const room = db.prepare("SELECT status FROM rooms WHERE id = 'r_101'").get();
      expect(room.status).toBe('Occupied');
    });
  });

  describe('5. Security, Deposits, Refunds, & Room Change Integrations', () => {
    it('should block Housekeeping from fetching ledger transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${housekeepingToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Module 'transactions' is disabled for your role");
    });

    it('should block Receptionist from writing ledger transactions', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          type: 'Income',
          amount: 500,
          category: 'Sundry',
          description: 'Blocked mutation test'
        });
      
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Permission Denied: Read-only access to 'transactions' module.");
    });

    it('should allow Admin to write ledger transactions', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'Income',
          amount: 1200,
          category: 'Room Tariff',
          description: 'Direct cash settlement'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('should successfully handle No-Show reservations and release assigned rooms', async () => {
      // Seed a test reservation
      const testResId = 'res_test_noshow';
      const stdPlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1").get();
      db.prepare(`
        INSERT INTO reservations (id, reservation_number, guest_id, room_type_id, room_id, stay_type, check_in_datetime, check_out_datetime, status, adults, children, rate_plan_id, created_at)
        VALUES (?, 'RES-NS-101', 'g_1', 'rt_std', 'r_201', 'night', '2026-06-10T12:00:00.000Z', '2026-06-12T12:00:00.000Z', 'Reserved', 1, 0, ?, '2026-06-10T00:00:00.000Z')
      `).run(testResId, stdPlan.id);
      db.prepare("UPDATE rooms SET status = 'Reserved' WHERE id = 'r_201'").run();

      const res = await request(app)
        .post(`/api/reservations/${testResId}/no-show`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send();

      console.log('NO-SHOW DEBUG:', res.status, res.body);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Reservation status updated to No Show successfully');

      const updatedRes = db.prepare("SELECT status FROM reservations WHERE id = ?").get(testResId);
      expect(updatedRes.status).toBe('No Show');

      const room = db.prepare("SELECT status FROM rooms WHERE id = 'r_201'").get();
      expect(room.status).toBe('Vacant Clean');
    });

    it('should process the deposit intake flow and recalculate running folio balance', async () => {
      const res = await request(app)
        .post('/api/folios/f_1/deposit')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          amount: '1500.00',
          payment_method: 'UPI',
          description: 'Security Deposit for Damage'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('depositId');

      const deposit = db.prepare("SELECT * FROM deposits WHERE id = ?").get(res.body.depositId);
      expect(deposit).toBeDefined();
      expect(deposit.amount).toBe(1500.00);
      expect(deposit.status).toBe('Held');

      const entry = db.prepare("SELECT * FROM folio_entries WHERE folio_id = 'f_1' AND description LIKE '%Security Deposit%'").get();
      expect(entry).toBeDefined();
      expect(entry.credit).toBe(1500.00);
    });

    it('should manage refund requests and handle approval & rejection workflows correctly', async () => {
      // 1. Submit a refund request
      const resRequest = await request(app)
        .post('/api/folios/f_1/refund')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          amount: '500.00',
          payment_method: 'UPI',
          reason: 'Excess deposit return'
        });
      
      expect(resRequest.status).toBe(200);
      expect(resRequest.body).toHaveProperty('refundId');

      const refundId = resRequest.body.refundId;

      // 2. Receptionist cannot list/approve refunds
      const resListRecep = await request(app)
        .get('/api/refunds')
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(resListRecep.status).toBe(403);

      const resApproveRecep = await request(app)
        .post(`/api/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(resApproveRecep.status).toBe(403);

      // 3. Manager can list refunds
      const resListMgr = await request(app)
        .get('/api/refunds')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(resListMgr.status).toBe(200);
      expect(resListMgr.body.length).toBeGreaterThanOrEqual(1);

      // 4. Manager can approve refund
      const resApproveMgr = await request(app)
        .post(`/api/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      console.log('APPROVE REFUND DEBUG:', resApproveMgr.status, resApproveMgr.body);
      
      expect(resApproveMgr.status).toBe(200);
      expect(resApproveMgr.body.message).toBe('Refund approved and recorded on guest folio');

      const approvedRefund = db.prepare("SELECT status FROM refunds WHERE id = ?").get(refundId);
      expect(approvedRefund.status).toBe('Approved');

      // Verify folio entry posted as adjustment
      const entry = db.prepare("SELECT * FROM folio_entries WHERE folio_id = 'f_1' AND charge_type = 'Refund'").get();
      expect(entry).toBeDefined();
      expect(entry.debit).toBe(500.00);

      // 5. Submit another refund request to test rejection
      const resRequest2 = await request(app)
        .post('/api/folios/f_1/refund')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          amount: '100.00',
          payment_method: 'Cash',
          reason: 'Duplicate check test'
        });
      
      const refundId2 = resRequest2.body.refundId;

      // Reject the refund
      const resReject = await request(app)
        .post(`/api/refunds/${refundId2}/reject`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      expect(resReject.status).toBe(200);

      const rejectedRefund = db.prepare("SELECT status FROM refunds WHERE id = ?").get(refundId2);
      expect(rejectedRefund.status).toBe('Rejected');
    });

    it('should perform room change operations, updating room status and creating tasks', async () => {
      // Ensure res_1 is checked-in at r_101
      db.prepare("UPDATE reservations SET status = 'Checked In', room_id = 'r_101' WHERE id = 'res_1'").run();
      db.prepare("UPDATE rooms SET status = 'Occupied' WHERE id = 'r_101'").run();
      db.prepare("UPDATE rooms SET status = 'Vacant Clean' WHERE id = 'r_102'").run();

      // Change room from r_101 to r_102 (Vacant Clean room, no PIN override needed)
      const resChange = await request(app)
        .post('/api/reservations/res_1/room-change')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ new_room_id: 'r_102' });
      
      expect(resChange.status).toBe(200);
      expect(resChange.body.message).toContain('successfully changed to 102');

      // Verify old room status is Dirty
      const oldRoom = db.prepare("SELECT status FROM rooms WHERE id = 'r_101'").get();
      expect(oldRoom.status).toBe('Dirty');

      // Verify new room status is Occupied
      const newRoom = db.prepare("SELECT status FROM rooms WHERE id = 'r_102'").get();
      expect(newRoom.status).toBe('Occupied');

      // Verify housekeeping task was created
      const task = db.prepare("SELECT * FROM housekeeping_tasks WHERE room_id = 'r_101'").get();
      expect(task).toBeDefined();

      // Change back to r_101 (Dirty room, requires PIN override for Receptionist)
      const resChangeFail = await request(app)
        .post('/api/reservations/res_1/room-change')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ new_room_id: 'r_101' });
      expect(resChangeFail.status).toBe(400);

      // Now with correct manager PIN override
      const resChangeSuccess = await request(app)
        .post('/api/reservations/res_1/room-change')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .set('x-override-pin', '1234')
        .send({ new_room_id: 'r_101' });
      
      expect(resChangeSuccess.status).toBe(200);
    });
  });
});
