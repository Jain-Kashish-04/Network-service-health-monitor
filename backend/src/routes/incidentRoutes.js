const express = require('express');
const { getIncidents, getIncident, resolve } = require('../controllers/incidentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getIncidents);
router.get('/:id', getIncident);
router.patch('/:id/resolve', resolve);

module.exports = router;
