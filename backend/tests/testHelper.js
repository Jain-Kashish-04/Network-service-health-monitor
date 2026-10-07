/**
 * Shared test helper — connect/disconnect MongoDB for test suites.
 * Import and call setupTestDB() at the top of each test file.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');

const TEST_DB_URI =
  process.env.MONGODB_URI_TEST ||
  'mongodb://localhost:27017/network-health-monitor-test';

const setupTestDB = () => {
  beforeAll(async () => {
    // Close any existing connection (from a previous test suite in the same run)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
};

module.exports = { setupTestDB };
