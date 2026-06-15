import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Set process.env.NODE_ENV = 'test' to force in-memory database configuration
process.env.NODE_ENV = 'test';

import app from '../index';
import seed from '../seed';
const db = app.db;

describe('Hotel PMS API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Run the database seeder on the in-memory database
    await seed();
  });

  afterAll(() => {
    // Close SQLite connection to let process exit cleanly
    db.close();
  });

  describe('Authentication Endpoints', () => {
    it('should login successfully with valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('username', 'admin');
      expect(res.body.user).toHaveProperty('role', 'Admin');
      
      // Store token for subsequent tests
      authToken = res.body.token;
    });

    it('should fail to login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should fail to login with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing credentials');
    });
  });

  describe('Role-Based Access Control and Authenticated Routes', () => {
    it('should reject requests without a token', async () => {
      const res = await request(app).get('/api/room-types');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Access token missing');
    });

    it('should reject requests with an invalid token', async () => {
      const res = await request(app)
        .get('/api/room-types')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should fetch room types successfully with a valid token', async () => {
      const res = await request(app)
        .get('/api/room-types')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      
      // Check that standard room types are in seed
      const standardRoomType = res.body.find(rt => rt.id === 'rt_std');
      expect(standardRoomType).toBeDefined();
      expect(standardRoomType.name).toBe('Standard Room');
    });

    it('should retrieve rooms list', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('room_number');
    });
  });

  describe('Reservation Stay Engine', () => {
    it('should check room type availability successfully', async () => {
      const res = await request(app)
        .post('/api/reservations/check-availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          check_in: '2026-06-15T12:00:00.000Z',
          check_out: '2026-06-18T12:00:00.000Z',
          room_type_id: 'rt_std',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('available');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('overlaps');
      
      // With default seed, there are 4 standard rooms
      expect(res.body.total).toBe(4);
    });

    it('should fail check-availability with missing parameters', async () => {
      const res = await request(app)
        .post('/api/reservations/check-availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          check_in: '2026-06-15T12:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
