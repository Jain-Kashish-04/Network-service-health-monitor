const axios = require('axios');
const Service = require('../models/Service');
const MonitoringResult = require('../models/MonitoringResult');
const incidentService = require('./incidentService');
const { validateUrl } = require('../utils/urlValidator');
const logger = require('../utils/logger');

const TIMEOUT_MS = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10) || 5000;
const SLOW_THRESHOLD_MS = parseInt(process.env.SLOW_RESPONSE_THRESHOLD_MS, 10) || 2000;

/**
 * Classifies the service status based on response.
 *
 * Rules:
 *   HEALTHY  — HTTP 200–399 and response time within threshold
 *   DEGRADED — HTTP 200–399 but response time exceeds threshold
 *   DOWN     — HTTP 500–599, timeout, DNS error, or connection refused
 *
 * Important: 4xx responses (e.g. 404) mean the SERVER responded successfully
 * at the network level. The service is reachable; only the resource is missing.
 * We record the HTTP status but do NOT classify 4xx as DOWN.
 */
const classifyStatus = (httpStatusCode, responseTimeMs) => {
  if (httpStatusCode >= 500) return 'DOWN';
  if (httpStatusCode >= 200 && httpStatusCode < 400) {
    if (responseTimeMs > SLOW_THRESHOLD_MS) return 'DEGRADED';
    return 'HEALTHY';
  }
  // 4xx — server responded, so treat as HEALTHY at network level
  if (httpStatusCode >= 400 && httpStatusCode < 500) {
    if (responseTimeMs > SLOW_THRESHOLD_MS) return 'DEGRADED';
    return 'HEALTHY';
  }
  return 'DOWN';
};

/**
 * Performs a single health check against a monitored service URL.
 *
 * @param {Object} service - Mongoose Service document
 * @returns {Object} result - { status, httpStatusCode, responseTime, errorMessage }
 */
const performCheck = async (service) => {
  // Validate URL before making the request (SSRF protection)
  const { valid, error } = validateUrl(service.url);
  if (!valid) {
    return {
      status: 'DOWN',
      httpStatusCode: null,
      responseTime: null,
      errorMessage: `URL validation failed: ${error}`,
    };
  }

  const startTime = Date.now();

  try {
    const response = await axios.get(service.url, {
      timeout: TIMEOUT_MS,
      // Don't follow too many redirects
      maxRedirects: 5,
      // We want to capture the status code even for error responses
      validateStatus: () => true,
      // Don't send cookies or credentials
      withCredentials: false,
      headers: {
        'User-Agent': 'NetworkHealthMonitor/1.0',
      },
    });

    const responseTime = Date.now() - startTime;
    const httpStatusCode = response.status;
    const status = classifyStatus(httpStatusCode, responseTime);

    return { status, httpStatusCode, responseTime, errorMessage: null };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    let errorMessage = 'Unknown error';

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      errorMessage = `Request timed out after ${TIMEOUT_MS}ms`;
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = `DNS resolution failed: ${err.hostname || service.url}`;
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused by the target server';
    } else if (err.code === 'ECONNRESET') {
      errorMessage = 'Connection was reset by the target server';
    } else if (err.message) {
      errorMessage = err.message;
    }

    return {
      status: 'DOWN',
      httpStatusCode: null,
      responseTime,
      errorMessage,
    };
  }
};

/**
 * Runs a health check for a service, persists the result,
 * updates service statistics, and triggers incident logic.
 *
 * @param {string|ObjectId} serviceId
 * @returns {Object} The monitoring result
 */
const runHealthCheck = async (serviceId) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }

  const { status, httpStatusCode, responseTime, errorMessage } = await performCheck(service);

  // Persist the monitoring result
  const result = await MonitoringResult.create({
    serviceId: service._id,
    status,
    httpStatusCode,
    responseTime,
    errorMessage,
    checkedAt: new Date(),
  });

  const now = new Date();

  // Update service statistics
  service.totalChecks += 1;
  service.lastCheckedAt = now;
  service.httpStatusCode = httpStatusCode;
  service.responseTime = responseTime;
  service.currentStatus = status;

  const isSuccess = status === 'HEALTHY' || status === 'DEGRADED';

  if (isSuccess) {
    service.successfulChecks += 1;
    service.lastSuccessfulAt = now;
    service.consecutiveFailures = 0; // Reset on success
  } else {
    service.failedChecks += 1;
    service.lastFailedAt = now;
    service.consecutiveFailures += 1;
  }

  await service.save();

  // Handle incident logic
  await incidentService.handleCheckResult(service, status);

  logger.healthCheck(service.name, status, responseTime || 0, errorMessage);

  return {
    status,
    httpStatusCode,
    responseTime,
    errorMessage,
    checkedAt: result.checkedAt,
  };
};

module.exports = { runHealthCheck, performCheck, classifyStatus };
