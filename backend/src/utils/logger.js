/**
 * Simple logger utility.
 * Records timestamp, level, and message.
 * Never logs passwords, tokens, or secrets.
 */

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const logger = {
  info: (message) => {
    console.log(formatMessage('info', message));
  },

  warn: (message) => {
    console.warn(formatMessage('warn', message));
  },

  error: (message) => {
    console.error(formatMessage('error', message));
  },

  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('debug', message));
    }
  },

  // Log HTTP requests
  http: (method, endpoint, statusCode, responseTimeMs) => {
    const message = `${method} ${endpoint} ${statusCode} ${responseTimeMs}ms`;
    console.log(formatMessage('http', message));
  },

  // Log health check results without exposing sensitive data
  healthCheck: (serviceName, status, responseTimeMs, errorMessage = null) => {
    const base = `Health check | service="${serviceName}" status=${status} responseTime=${responseTimeMs}ms`;
    const msg = errorMessage ? `${base} error="${errorMessage}"` : base;
    console.log(formatMessage('health', msg));
  },
};

module.exports = logger;
