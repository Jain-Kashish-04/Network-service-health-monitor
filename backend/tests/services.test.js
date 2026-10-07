const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Service = require('../src/models/Service');
const MonitoringResult = require('../src/models/MonitoringResult');
const Incident = require('../src/models/Incident');
const { setupTestDB } = require('./testHelper');

setupTestDB();

let tokenA, tokenB, userAId, userBId;

beforeEach(async () => {
  await User.deleteMany({});
  await Service.deleteMany({});
  await MonitoringResult.deleteMany({});
  await Incident.deleteMany({});

  // Register two users
  const resA = await request(app).post('/api/auth/register').send({
    name: 'User A',
    email: 'usera@example.com',
    password: 'Password123',
  });
  tokenA = resA.body.data.token;
  userAId = resA.body.data.user.id;

  const resB = await request(app).post('/api/auth/register').send({
    name: 'User B',
    email: 'userb@example.com',
    password: 'Password123',
  });
  tokenB = resB.body.data.token;
  userBId = resB.body.data.user.id;
});

// ── Create Service ────────────────────────────────────────────────────────────

describe('POST /api/services', () => {
  it('creates a service successfully', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Google', url: 'https://www.google.com', description: 'Search engine' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.service.name).toBe('Google');
    expect(res.body.data.service.currentStatus).toBe('UNKNOWN');
  });

  it('rejects a missing name with 422', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://www.google.com' });

    expect(res.statusCode).toBe(422);
  });

  it('rejects a localhost URL (SSRF protection) with 400', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Local', url: 'http://localhost:3000' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_URL');
  });

  it('rejects a private IP URL (SSRF protection) with 400', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Internal', url: 'http://192.168.1.1/api' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-HTTP protocol with 400', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'FTP', url: 'ftp://files.example.com' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ name: 'Google', url: 'https://www.google.com' });

    expect(res.statusCode).toBe(401);
  });
});

// ── List Services ─────────────────────────────────────────────────────────────

describe('GET /api/services', () => {
  it('returns only services owned by the authenticated user', async () => {
    await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'ServiceA1', url: 'https://example.com' });

    await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'ServiceB1', url: 'https://example.org' });

    const res = await request(app)
      .get('/api/services')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.services).toHaveLength(1);
    expect(res.body.data.services[0].name).toBe('ServiceA1');
  });
});

// ── Get Service ───────────────────────────────────────────────────────────────

describe('GET /api/services/:id', () => {
  it('returns service details for the owner', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'MyService', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.service._id).toBe(serviceId);
  });

  it('returns 403 when User B tries to access User A\'s service', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'PrivateService', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent service ID', async () => {
    const res = await request(app)
      .get('/api/services/000000000000000000000001')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(404);
  });
});

// ── Update Service ────────────────────────────────────────────────────────────

describe('PUT /api/services/:id', () => {
  it('updates a service name and description', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Old Name', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'New Name', description: 'Updated description' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.service.name).toBe('New Name');
  });

  it('returns 403 when User B tries to update User A\'s service', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'ServiceA', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked' });

    expect(res.statusCode).toBe(403);
  });
});

// ── Delete Service ────────────────────────────────────────────────────────────

describe('DELETE /api/services/:id', () => {
  it('deletes a service and returns 200', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'ToDelete', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);

    // Confirm it's gone
    const getRes = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.statusCode).toBe(404);
  });

  it('returns 403 when User B tries to delete User A\'s service', async () => {
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Protected', url: 'https://example.com' });

    const serviceId = createRes.body.data.service._id;

    const res = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(403);
  });
});
