const Incident = require('../models/Incident');
const logger = require('../utils/logger');

const FAILURE_THRESHOLD = 3; // Create an incident after this many consecutive failures

/**
 * Evaluates a health check result and manages incidents.
 *
 * Logic:
 *   - HEALTHY or DEGRADED + open incident  → auto-resolve the incident.
 *   - consecutiveFailures >= threshold     → create a HIGH incident (only if none is OPEN).
 *   - Already has an OPEN incident         → update its failureCount, do NOT create duplicate.
 */
const handleCheckResult = async (service, status) => {
  const isHealthy = status === 'HEALTHY' || status === 'DEGRADED';

  if (isHealthy) {
    // Auto-resolve any open incident on recovery
    const openIncident = await Incident.findOne({
      serviceId: service._id,
      status: 'OPEN',
    });

    if (openIncident) {
      openIncident.status = 'RESOLVED';
      openIncident.resolvedAt = new Date();
      openIncident.description += '\nAuto-resolved: service recovered.';
      await openIncident.save();
      logger.info(`Incident auto-resolved for service "${service.name}" (ID: ${openIncident._id})`);
    }
    return;
  }

  // Service is DOWN — check if we need to create an incident
  if (service.consecutiveFailures >= FAILURE_THRESHOLD) {
    const existingOpen = await Incident.findOne({
      serviceId: service._id,
      status: 'OPEN',
    });

    if (!existingOpen) {
      const incident = await Incident.create({
        serviceId: service._id,
        title: 'Service Unavailable',
        description: `The monitored service "${service.name}" failed ${service.consecutiveFailures} consecutive health checks.`,
        severity: 'HIGH',
        status: 'OPEN',
        failureCount: service.consecutiveFailures,
        startedAt: new Date(),
      });

      logger.warn(
        `Incident created for service "${service.name}" after ${service.consecutiveFailures} consecutive failures (ID: ${incident._id})`
      );
    } else {
      // Keep the failure count current on the existing incident
      existingOpen.failureCount = service.consecutiveFailures;
      await existingOpen.save();
    }
  }
};

/**
 * Manually resolves an incident by ID.
 * Throws a structured error if not found or already resolved.
 */
const resolveIncident = async (incidentId) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    const err = new Error('Incident not found');
    err.statusCode = 404;
    err.errorCode = 'INCIDENT_NOT_FOUND';
    throw err;
  }

  if (incident.status === 'RESOLVED') {
    const err = new Error('Incident is already resolved');
    err.statusCode = 400;
    err.errorCode = 'ALREADY_RESOLVED';
    throw err;
  }

  incident.status = 'RESOLVED';
  incident.resolvedAt = new Date();
  await incident.save();

  logger.info(`Incident manually resolved: ${incidentId}`);
  return incident;
};

module.exports = { handleCheckResult, resolveIncident };
