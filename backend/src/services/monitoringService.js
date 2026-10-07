const Service = require('../models/Service');
const { runHealthCheck } = require('./healthCheckService');
const logger = require('../utils/logger');

/**
 * Finds all services and runs health checks on each one.
 * Called by the monitoring scheduler every N minutes.
 *
 * Errors in individual checks are caught so one failing service
 * does not prevent others from being checked.
 */
const runAllHealthChecks = async () => {
  let services;
  try {
    services = await Service.find({});
  } catch (err) {
    logger.error(`Failed to fetch services for monitoring: ${err.message}`);
    return;
  }

  if (services.length === 0) {
    logger.debug('Monitoring run: no services to check');
    return;
  }

  logger.info(`Monitoring run started — checking ${services.length} service(s)`);

  const results = await Promise.allSettled(
    services.map((service) => runHealthCheck(service._id))
  );

  let passed = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      passed += 1;
    } else {
      failed += 1;
      logger.error(
        `Health check failed for service "${services[index].name}": ${result.reason?.message}`
      );
    }
  });

  logger.info(`Monitoring run complete — ${passed} succeeded, ${failed} failed`);
};

module.exports = { runAllHealthChecks };
