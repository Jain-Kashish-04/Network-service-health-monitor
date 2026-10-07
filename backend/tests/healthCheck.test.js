require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { classifyStatus } = require('../src/services/healthCheckService');
const { validateUrl } = require('../src/utils/urlValidator');

// ── Status Classification ─────────────────────────────────────────────────────

describe('classifyStatus()', () => {
  const SLOW = 2001; // just above the 2000ms threshold
  const FAST = 100;

  it('returns HEALTHY for HTTP 200 with fast response', () => {
    expect(classifyStatus(200, FAST)).toBe('HEALTHY');
  });

  it('returns HEALTHY for HTTP 301 (redirect) with fast response', () => {
    expect(classifyStatus(301, FAST)).toBe('HEALTHY');
  });

  it('returns HEALTHY for HTTP 404 — server responded at network level', () => {
    expect(classifyStatus(404, FAST)).toBe('HEALTHY');
  });

  it('returns DEGRADED for HTTP 200 with response time above threshold', () => {
    expect(classifyStatus(200, SLOW)).toBe('DEGRADED');
  });

  it('returns DEGRADED for HTTP 404 with slow response', () => {
    expect(classifyStatus(404, SLOW)).toBe('DEGRADED');
  });

  it('returns DOWN for HTTP 500', () => {
    expect(classifyStatus(500, FAST)).toBe('DOWN');
  });

  it('returns DOWN for HTTP 503 (service unavailable)', () => {
    expect(classifyStatus(503, FAST)).toBe('DOWN');
  });

  it('returns DOWN for null httpStatusCode (timeout / network failure)', () => {
    expect(classifyStatus(null, null)).toBe('DOWN');
  });
});

// ── URL Validator / SSRF Protection ──────────────────────────────────────────

describe('validateUrl()', () => {
  it('accepts a valid HTTPS URL', () => {
    const result = validateUrl('https://www.google.com');
    expect(result.valid).toBe(true);
  });

  it('accepts a valid HTTP URL', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('rejects localhost', () => {
    const result = validateUrl('http://localhost:3000');
    expect(result.valid).toBe(false);
  });

  it('rejects 127.0.0.1 (loopback)', () => {
    const result = validateUrl('http://127.0.0.1:8080');
    expect(result.valid).toBe(false);
  });

  it('rejects 0.0.0.0', () => {
    const result = validateUrl('http://0.0.0.0');
    expect(result.valid).toBe(false);
  });

  it('rejects a private 192.168.x.x IP', () => {
    const result = validateUrl('http://192.168.1.100');
    expect(result.valid).toBe(false);
  });

  it('rejects a private 10.x.x.x IP', () => {
    const result = validateUrl('http://10.0.0.1/api');
    expect(result.valid).toBe(false);
  });

  it('rejects a private 172.16.x.x IP', () => {
    const result = validateUrl('http://172.16.0.1');
    expect(result.valid).toBe(false);
  });

  it('rejects link-local 169.254.x.x', () => {
    const result = validateUrl('http://169.254.169.254/metadata');
    expect(result.valid).toBe(false);
  });

  it('rejects ftp:// protocol', () => {
    const result = validateUrl('ftp://files.example.com');
    expect(result.valid).toBe(false);
  });

  it('rejects a completely malformed URL', () => {
    const result = validateUrl('not a url');
    expect(result.valid).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
  });
});
