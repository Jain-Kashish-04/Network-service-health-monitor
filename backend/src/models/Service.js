const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    currentStatus: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastSuccessfulAt: {
      type: Date,
      default: null,
    },
    lastFailedAt: {
      type: Date,
      default: null,
    },
    responseTime: {
      type: Number, // milliseconds
      default: null,
    },
    httpStatusCode: {
      type: Number,
      default: null,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    totalChecks: {
      type: Number,
      default: 0,
    },
    successfulChecks: {
      type: Number,
      default: 0,
    },
    failedChecks: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Virtual: uptime percentage
serviceSchema.virtual('uptimePercentage').get(function () {
  if (this.totalChecks === 0) return null;
  return ((this.successfulChecks / this.totalChecks) * 100).toFixed(1);
});

serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Service', serviceSchema);
