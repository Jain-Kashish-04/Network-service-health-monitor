const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { setupTestDB } = require('./testHelper');

setupTestDB();

// Clean up users before each test to ensure isolation
beforeEach(async () => {
  await User.deleteMany({});
});

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123',
};

// ── Registration ──────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined(); // never expose password
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.errorCode).toBe('EMAIL_TAKEN');
  });

  it('rejects an invalid email format with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.statusCode).toBe(422);
  });

  it('rejects a short password (< 8 chars) with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'Abc1' });

    expect(res.statusCode).toBe(422);
  });

  it('rejects a password with no uppercase letter with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'password123' });

    expect(res.statusCode).toBe(422);
  });

  it('rejects a password with no number with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'PasswordABC' });

    expect(res.statusCode).toBe(422);
  });

  it('rejects a missing name with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(422);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with correct credentials and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });

    expect(res.statusCode).toBe(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: validUser.password });

    expect(res.statusCode).toBe(401);
  });

  it('rejects a missing password with 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email });

    expect(res.statusCode).toBe(422);
  });
});

// ── GET /me ───────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns the authenticated user profile', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const token = reg.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.errorCode).toBe('NO_TOKEN');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken.abc.xyz');

    expect(res.statusCode).toBe(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });
});
