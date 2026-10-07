const express = require('express');
const { getUsers, getAllServices, getAllIncidents } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

router.get('/users', getUsers);
router.get('/services', getAllServices);
router.get('/incidents', getAllIncidents);

module.exports = router;
