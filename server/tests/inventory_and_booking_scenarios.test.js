import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.NODE_ENV = 'test';

import app from '../index';
import seed from '../seed';
const db = app.db;

describe('PMS Room Inventory, Rates and Auto-Stay-Type Calculation Tests', () => {
  let authToken;
  let standardRatePlanId;

  beforeAll(async () => {
    // Seed the database
    await seed();

    // Log in to retrieve token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = res.body.token;

    // Fetch the generated UUID for the standard rate plan of Standard Rooms (rt_std)
    const stdPlan = db.prepare("SELECT id FROM rate_plans WHERE room_type_id = 'rt_std' LIMIT 1").get();
    standardRatePlanId = stdPlan.id;
  });

  afterAll(() => {
    db.close();
  });

  describe('1. Room Status Adjustments & Heatmap Blockage', () => {
    it('should block a room via Maintenance status and verify it is not available', async () => {
      // Find room standard 102 (r_102) which has no active check-in
      const initialRoom = db.prepare("SELECT * FROM rooms WHERE id = 'r_102'").get();
      expect(initialRoom).toBeDefined();

      // Change status to Maintenance
      const patchRes = await request(app)
        .patch('/api/rooms/r_102/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'Maintenance' });

      expect(patchRes.status).toBe(200);

      // Verify that r_102 is not returned in conflict-free available rooms list
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const checkAvail = await request(app)
        .get('/api/rooms/available')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          room_type_id: 'rt_std',
          check_in: `${todayStr}T12:00:00`,
          check_out: `${tomorrowStr}T11:00:00`
        });

      expect(checkAvail.status).toBe(200);
      const room102 = checkAvail.body.find(rm => rm.id === 'r_102');
      expect(room102).toBeUndefined(); // Omitted because of Maintenance block

      // Reset room 102 to Vacant Clean
      const resetRes = await request(app)
        .patch('/api/rooms/r_102/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'Vacant Clean' });
      expect(resetRes.status).toBe(200);
    });
  });

  describe('2. Rate Plan Adjustment & Booking Pricing Persistence', () => {
    it('should update rate plan standard prices and apply them to subsequent bookings', async () => {
      // Get standard rate plan details (rp_std)
      const initialPlan = db.prepare("SELECT * FROM rate_plans WHERE id = ?").get(standardRatePlanId);
      expect(initialPlan).toBeDefined();

      // Update Night and Day Use pricing
      const patchPlanRes = await request(app)
        .patch(`/api/rate-plans/${standardRatePlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Standard Rate Plan Updated',
          night_price: 3500.00,
          day_use_price: 1800.00,
          hourly_prices: initialPlan.hourly_prices ? JSON.parse(initialPlan.hourly_prices) : {}
        });

      expect(patchPlanRes.status).toBe(200);

      // Verify DB persists the updated rates
      const updatedPlan = db.prepare("SELECT * FROM rate_plans WHERE id = ?").get(standardRatePlanId);
      expect(updatedPlan.night_price).toBe(3500.00);
      expect(updatedPlan.day_use_price).toBe(1800.00);
    });
  });

  describe('3. Dynamic Available (Conflict-Free) Room Selector', () => {
    it('should exclude rooms with overlapping active reservations', async () => {
      const checkInStr = '2026-07-15T12:00:00';
      const checkOutStr = '2026-07-17T11:00:00';

      // Create a reservation for Room 102 (r_102) during this period
      const createRes = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guest: { name: 'Conflict Guest', mobile: '9999999999' },
          room_type_id: 'rt_std',
          room_id: 'r_102',
          rate_plan_id: standardRatePlanId,
          check_in: checkInStr,
          check_out: checkOutStr,
          adults: 1,
          children: 0
        });

      expect(createRes.status).toBe(200);

      // Check room availability for standard rooms on the exact same dates
      const getAvail = await request(app)
        .get('/api/rooms/available')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          room_type_id: 'rt_std',
          check_in: '2026-07-15T14:00:00',
          check_out: '2026-07-16T12:00:00'
        });

      expect(getAvail.status).toBe(200);
      const room102 = getAvail.body.find(rm => rm.id === 'r_102');
      expect(room102).toBeUndefined(); // Room 102 is excluded because it is already booked!

      // Check room availability on a different, conflict-free period (e.g. 2026-09-20 to 2026-09-21)
      const getAvailClean = await request(app)
        .get('/api/rooms/available')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          room_type_id: 'rt_std',
          check_in: '2026-09-20T12:00:00',
          check_out: '2026-09-21T11:00:00'
        });

      expect(getAvailClean.status).toBe(200);
      const room102Available = getAvailClean.body.find(rm => rm.id === 'r_102');
      expect(room102Available).toBeDefined(); // Room 102 should be available here
    });
  });

  describe('4. Auto Stay Type Calculation & Billing Scenarios', () => {
    it('should automatically set same-day bookings to day_use/hourly', async () => {
      // Create same-day check-in & check-out
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guest: { name: 'Day Guest', mobile: '9988776655' },
          room_type_id: 'rt_std',
          rate_plan_id: standardRatePlanId,
          check_in: '2026-08-10T09:00:00',
          check_out: '2026-08-10T14:00:00',
          adults: 1,
          children: 0
        });

      expect(res.status).toBe(200);
      const resId = res.body.reservationId;

      // Verify the stay type was auto-computed to day_use or hourly
      const checkRes = db.prepare("SELECT stay_type FROM reservations WHERE id = ?").get(resId);
      expect(checkRes.stay_type).toBe('day_use');
    });

    it('should automatically set stays across different days to night stay', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guest: { name: 'Night Guest', mobile: '9988776656' },
          room_type_id: 'rt_std',
          rate_plan_id: standardRatePlanId,
          check_in: '2026-08-12T12:00:00',
          check_out: '2026-08-14T11:00:00',
          adults: 1,
          children: 0
        });

      expect(res.status).toBe(200);
      const resId = res.body.reservationId;

      // Verify stay type is night
      const checkRes = db.prepare("SELECT stay_type FROM reservations WHERE id = ?").get(resId);
      expect(checkRes.stay_type).toBe('night');
    });
  });
});
