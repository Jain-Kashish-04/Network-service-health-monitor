const cron = require('node-cron');
const { runAllHealthChecks } = require('../services/monitoringService');
const logger = require('../utils/logger');

/**
 * Monitoring Scheduler — uses node-cron to run health checks automatically.
 *
 * Interval is configured via MONITOR_INTERVAL_MINUTES (default: 5).
 * node-cron uses standard cron syntax. We build the expression dynamically.
 *
 * Examples:
 *   1 minute  → "* * * * *"
 *   5 minutes → "*\/5 * * * *"
 *  10 minutes → "*\/10 * * * *"
 *
 * node-cron does not support sub-minute intervals; minimum is 1 minute.
 */
const startScheduler = () => {
  const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL_MINUTES, 10) || 5;

  // Clamp to valid cron-friendly minute values
  const safeInterval = Math.max(1, Math.min(60, intervalMinutes));

  const cronExpression =
    safeInterval === 1 ? '* * * * *' : `*/${safeInterval} * * * *`;

  logger.info(`Monitoring scheduler starting — interval: every ${safeInterval} minute(s)`);

  const task = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled monitoring run triggered');
    try {
      await runAllHealthChecks();
    } catch (err) {
      logger.error(`Unhandled error in monitoring scheduler: ${err.message}`);
    }
  });

  return task;
};

module.exports = { startScheduler };
