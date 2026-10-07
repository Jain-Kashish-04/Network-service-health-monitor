const Incident = require('../models/Incident');
const Service = require('../models/Service');
const { resolveIncident } = require('../services/incidentService');

/**
 * GET /api/incidents
 * Returns incidents for services owned by the authenticated user.
 * Supports optional query filters: status, severity.
 */
const getIncidents = async (req, res, next) => {
  try {
    // Find services owned by the user
    const userServices = await Service.find({ userId: req.user._id }).select('_id');
    const serviceIds = userServices.map((s) => s._id);

    // Build query filter
    const filter = { serviceId: { $in: serviceIds } };
    if (req.query.status) filter.status = req.query.status.toUpperCase();
    if (req.query.severity) filter.severity = req.query.severity.toUpperCase();

    const incidents = await Incident.find(filter)
      .populate('serviceId', 'name url')
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: { incidents },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/incidents/:id
 * Returns a single incident.
 */
const getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('serviceId', 'name url userId');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
        errorCode: 'INCIDENT_NOT_FOUND',
      });
    }

    // Ownership check
    const service = incident.serviceId;
    if (
      req.user.role !== 'admin' &&
      service.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
        errorCode: 'FORBIDDEN',
      });
    }

    res.status(200).json({
      success: true,
      data: { incident },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/incidents/:id/resolve
 * Manually resolves an open incident.
 */
const resolve = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('serviceId', 'userId');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found',
        errorCode: 'INCIDENT_NOT_FOUND',
      });
    }

    // Ownership check
    if (
      req.user.role !== 'admin' &&
      incident.serviceId.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
        errorCode: 'FORBIDDEN',
      });
    }

    const updated = await resolveIncident(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Incident resolved successfully',
      data: { incident: updated },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getIncidents, getIncident, resolve };
