const User = require('../models/User');
const Service = require('../models/Service');
const Incident = require('../models/Incident');

/**
 * GET /api/admin/users
 * Returns all registered users (admin only).
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/services
 * Returns all monitored services across all users (admin only).
 */
const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

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
 * GET /api/admin/incidents
 * Returns all incidents across all services (admin only).
 * Supports optional query filters: status, severity.
 */
const getAllIncidents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status.toUpperCase();
    if (req.query.severity) filter.severity = req.query.severity.toUpperCase();

    const incidents = await Incident.find(filter)
      .populate('serviceId', 'name url')
      .sort({ startedAt: -1 });

    // Overall stats
    const totalServices = await Service.countDocuments();
    const healthyCount = await Service.countDocuments({ currentStatus: 'HEALTHY' });
    const degradedCount = await Service.countDocuments({ currentStatus: 'DEGRADED' });
    const downCount = await Service.countDocuments({ currentStatus: 'DOWN' });
    const openIncidents = await Incident.countDocuments({ status: 'OPEN' });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: {
        incidents,
        stats: {
          totalServices,
          healthyCount,
          degradedCount,
          downCount,
          openIncidents,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getAllServices, getAllIncidents };
