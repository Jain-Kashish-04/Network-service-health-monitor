const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const Incident = require('../src/models/Incident');
const User = require('../src/models/User');
const { handleCheckResult } = require('../src/services/incidentService');
const { resolveIncident } = require('../src/services/incidentService');
const { setupTestDB } = require('./testHelper');

setupTestDB();

let testUser, testService;

beforeEach(async () => {
  await User.deleteMany({});
  await Service.deleteMany({});
  await Incident.deleteMany({});

  testUser = await User.create({
    name: 'Test',
    email: 'incident@example.com',
    password: 'Password123',
  });

  testService = await Service.create({
    name: 'Test Service',
    url: 'https://example.com',
    userId: testUser._id,
    consecutiveFailures: 0,
  });
});

// ── Consecutive Failure Logic ──────────────────────────────────────────────────

describe('Incident detection — consecutive failures', () => {
  it('does NOT create an incident on the first failure', async () => {
    testService.consecutiveFailures = 1;
    await handleCheckResult(testService, 'DOWN');

    const incidents = await Incident.find({ serviceId: testService._id });
    expect(incidents).toHaveLength(0);
  });

  it('does NOT create an incident on the second failure', async () => {
    testService.consecutiveFailures = 2;
    await handleCheckResult(testService, 'DOWN');

    const incidents = await Incident.find({ serviceId: testService._id });
    expect(incidents).toHaveLength(0);
  });

  it('creates a HIGH incident on the third consecutive failure', async () => {
    testService.consecutiveFailures = 3;
    await handleCheckResult(testService, 'DOWN');

    const incidents = await Incident.find({ serviceId: testService._id });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].severity).toBe('HIGH');
    expect(incidents[0].status).toBe('OPEN');
  });

  it('does NOT create a duplicate incident when already OPEN', async () => {
    // Simulate third failure → creates incident
    testService.consecutiveFailures = 3;
    await handleCheckResult(testService, 'DOWN');

    // Simulate fourth failure → should NOT create a second incident
    testService.consecutiveFailures = 4;
    await handleCheckResult(testService, 'DOWN');

    const incidents = await Incident.find({ serviceId: testService._id });
    expect(incidents).toHaveLength(1); // still only one
  });

  it('updates failureCount on the existing incident (no duplicate)', async () => {
    testService.consecutiveFailures = 3;
    await handleCheckResult(testService, 'DOWN');

    testService.consecutiveFailures = 5;
    await handleCheckResult(testService, 'DOWN');

    const incident = await Incident.findOne({ serviceId: testService._id });
    expect(incident.failureCount).toBe(5);
  });
});

// ── Recovery Logic ─────────────────────────────────────────────────────────────

describe('Incident auto-resolution on recovery', () => {
  it('auto-resolves an open incident when service recovers (HEALTHY)', async () => {
    // Create an open incident manually
    await Incident.create({
      serviceId: testService._id,
      title: 'Service Unavailable',
      description: 'Test incident',
      severity: 'HIGH',
      status: 'OPEN',
      failureCount: 3,
      startedAt: new Date(),
    });

    testService.consecutiveFailures = 0;
    await handleCheckResult(testService, 'HEALTHY');

    const incident = await Incident.findOne({ serviceId: testService._id });
    expect(incident.status).toBe('RESOLVED');
    expect(incident.resolvedAt).not.toBeNull();
  });

  it('auto-resolves on DEGRADED status (service is partially recovered)', async () => {
    await Incident.create({
      serviceId: testService._id,
      title: 'Service Unavailable',
      description: 'Test incident',
      severity: 'HIGH',
      status: 'OPEN',
      failureCount: 3,
      startedAt: new Date(),
    });

    testService.consecutiveFailures = 0;
    await handleCheckResult(testService, 'DEGRADED');

    const incident = await Incident.findOne({ serviceId: testService._id });
    expect(incident.status).toBe('RESOLVED');
  });

  it('does NOT resolve incidents on DOWN status', async () => {
    await Incident.create({
      serviceId: testService._id,
      title: 'Service Unavailable',
      description: 'Test incident',
      severity: 'HIGH',
      status: 'OPEN',
      failureCount: 3,
      startedAt: new Date(),
    });

    testService.consecutiveFailures = 4;
    await handleCheckResult(testService, 'DOWN');

    const incident = await Incident.findOne({ serviceId: testService._id });
    expect(incident.status).toBe('OPEN');
  });
});

// ── Manual Resolution ──────────────────────────────────────────────────────────

describe('resolveIncident()', () => {
  it('resolves an open incident', async () => {
    const incident = await Incident.create({
      serviceId: testService._id,
      title: 'Test Incident',
      description: 'Manual test',
      severity: 'HIGH',
      status: 'OPEN',
      failureCount: 3,
      startedAt: new Date(),
    });

    const resolved = await resolveIncident(incident._id.toString());
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it('throws if incident does not exist', async () => {
    await expect(
      resolveIncident('000000000000000000000001')
    ).rejects.toMatchObject({ errorCode: 'INCIDENT_NOT_FOUND' });
  });

  it('throws if incident is already resolved', async () => {
    const incident = await Incident.create({
      serviceId: testService._id,
      title: 'Already Resolved',
      description: '',
      severity: 'LOW',
      status: 'RESOLVED',
      failureCount: 3,
      startedAt: new Date(),
      resolvedAt: new Date(),
    });

    await expect(
      resolveIncident(incident._id.toString())
    ).rejects.toMatchObject({ errorCode: 'ALREADY_RESOLVED' });
  });
});
