const Service = require('../models/Service');
const MonitoringResult = require('../models/MonitoringResult');
const Incident = require('../models/Incident');
const { runHealthCheck } = require('../services/healthCheckService');
const { validateUrl } = require('../utils/urlValidator');
const logger = require('../utils/logger');

/**
 * GET /api/services
 * Returns all services owned by the authenticated user.
 */
const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/services
 * Creates a new monitored service.
 */
const createService = async (req, res, next) => {
  try {
    const { name, url, description } = req.body;

    // SSRF + URL validation
    const { valid, error } = validateUrl(url);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: error,
        errorCode: 'INVALID_URL',
      });
    }

    const service = await Service.create({
      name,
      url: url.trim(),
      description: description || '',
      userId: req.user._id,
    });

    logger.info(`Service created: "${name}" by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/services/:id
 * Returns a single service with its recent monitoring results and active incidents.
 * Users can only access their own services; admins can access all.
 */
const getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        errorCode: 'SERVICE_NOT_FOUND',
      });
    }

    // Ownership check
    if (req.user.role !== 'admin' && service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this service.',
        errorCode: 'FORBIDDEN',
      });
    }

    // Fetch the last 50 monitoring results
    const monitoringResults = await MonitoringResult.find({ serviceId: service._id })
      .sort({ checkedAt: -1 })
      .limit(50);

    // Fetch active incidents
    const activeIncidents = await Incident.find({
      serviceId: service._id,
      status: 'OPEN',
    }).sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        service,
        monitoringResults,
        activeIncidents,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/services/:id
 * Updates a service's name, URL, or description.
 */
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        errorCode: 'SERVICE_NOT_FOUND',
      });
    }

    if (service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this service.',
        errorCode: 'FORBIDDEN',
      });
    }

    const { name, url, description } = req.body;

    // Validate new URL if provided
    if (url) {
      const { valid, error } = validateUrl(url);
      if (!valid) {
        return res.status(400).json({
          success: false,
          message: error,
          errorCode: 'INVALID_URL',
        });
      }
      service.url = url.trim();
    }

    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;

    await service.save();

    logger.info(`Service updated: "${service.name}" by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/services/:id
 * Deletes a service along with its monitoring results and incidents.
 */
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        errorCode: 'SERVICE_NOT_FOUND',
      });
    }

    if (service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this service.',
        errorCode: 'FORBIDDEN',
      });
    }

    const serviceId = service._id;

    // Remove all associated data
    await Promise.all([
      MonitoringResult.deleteMany({ serviceId }),
      Incident.deleteMany({ serviceId }),
      Service.findByIdAndDelete(serviceId),
    ]);

    logger.info(`Service deleted: "${service.name}" by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Service and all associated data deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/services/:id/check
 * Triggers an immediate manual health check.
 */
const checkService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        errorCode: 'SERVICE_NOT_FOUND',
      });
    }

    if (req.user.role !== 'admin' && service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this service.',
        errorCode: 'FORBIDDEN',
      });
    }

    const result = await runHealthCheck(service._id);

    res.status(200).json({
      success: true,
      message: 'Health check completed',
      data: { result },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/services/:id/monitoring
 * Returns paginated monitoring history for a service.
 */
const getMonitoringHistory = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        errorCode: 'SERVICE_NOT_FOUND',
      });
    }

    if (req.user.role !== 'admin' && service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
        errorCode: 'FORBIDDEN',
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const results = await MonitoringResult.find({ serviceId: service._id })
      .sort({ checkedAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: results.length,
      data: { results },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getServices,
  createService,
  getService,
  updateService,
  deleteService,
  checkService,
  getMonitoringHistory,
};
