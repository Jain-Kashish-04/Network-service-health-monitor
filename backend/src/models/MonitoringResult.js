const mongoose = require('mongoose');

const monitoringResultSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'DOWN'],
      required: true,
    },
    httpStatusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number, // milliseconds; null means timeout or no response
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // No updatedAt needed — results are immutable once saved
    timestamps: false,
  }
);

module.exports = mongoose.model('MonitoringResult', monitoringResultSchema);
