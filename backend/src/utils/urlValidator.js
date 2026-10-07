/**
 * URL Validator with SSRF Protection.
 *
 * Prevents Server-Side Request Forgery by blocking requests to:
 * - Non-HTTP/HTTPS protocols
 * - localhost and loopback addresses
 * - Private IP ranges (RFC 1918)
 * - Link-local addresses (169.254.x.x)
 * - IPv6 loopback and private ranges
 *
 * This is important because users can enter arbitrary URLs.
 * Without this, an attacker could make the server send requests
 * to internal services (e.g., http://localhost:27017/admin).
 */

const BLOCKED_HOSTNAMES = [
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
];

// Private and reserved IP patterns
// RFC 1918 private ranges: 10.x, 172.16-31.x, 192.168.x
// Loopback: 127.x
// Link-local: 169.254.x
// CGNAT: 100.64-127.x
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // 127.0.0.0/8 loopback
  /^10\./,                           // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12 private
  /^192\.168\./,                     // 192.168.0.0/16 private
  /^169\.254\./,                     // 169.254.0.0/16 link-local
  /^0\.0\.0\.0/,                     // 0.0.0.0
  /^::1$/,                           // IPv6 loopback
  /^fc00:/i,                         // IPv6 unique local
  /^fd[0-9a-f]{2}:/i,               // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10 CGNAT
];

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates a URL and checks for SSRF risks.
 * @param {string} rawUrl - The URL string to validate
 * @returns {{ valid: boolean, error?: string, parsed?: URL }}
 */
const validateUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = rawUrl.trim();

  // Parse the URL — catches malformed URLs
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return {
      valid: false,
      error: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      valid: false,
      error: 'Requests to localhost and loopback addresses are not allowed',
    };
  }

  // Block private IP ranges (SSRF protection)
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: 'Requests to private or reserved IP addresses are not allowed',
      };
    }
  }

  // Block numeric IPs that resolve to private ranges (basic octet check)
  // A more thorough implementation would do DNS resolution and re-check,
  // but that adds significant complexity. Documented limitation in README.
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Pattern);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o > 255)) {
      return { valid: false, error: 'Invalid IP address' };
    }
    // Re-check the full IP against private patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: 'Requests to private or reserved IP addresses are not allowed',
        };
      }
    }
  }

  return { valid: true, parsed };
};

module.exports = { validateUrl };
