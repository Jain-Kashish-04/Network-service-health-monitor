require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');
const { startScheduler } = require('./jobs/monitoringScheduler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Start the Express server
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  // Start the automatic monitoring scheduler
  startScheduler();
};

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
