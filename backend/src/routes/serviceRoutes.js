const express = require('express');
const { body } = require('express-validator');
const {
  getServices,
  createService,
  getService,
  updateService,
  deleteService,
  checkService,
  getMonitoringHistory,
} = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { checkNowLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// All service routes require authentication
router.use(protect);

router
  .route('/')
  .get(getServices)
  .post(
    [
      body('name').trim().notEmpty().withMessage('Service name is required').isLength({ max: 100 }),
      body('url').trim().notEmpty().withMessage('URL is required'),
      body('description').optional().trim().isLength({ max: 500 }),
    ],
    validate,
    createService
  );

router
  .route('/:id')
  .get(getService)
  .put(
    [
      body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
      body('url').optional().trim().notEmpty().withMessage('URL cannot be empty'),
      body('description').optional().trim().isLength({ max: 500 }),
    ],
    validate,
    updateService
  )
  .delete(deleteService);

router.post('/:id/check', checkNowLimiter, checkService);

router.get('/:id/monitoring', getMonitoringHistory);

module.exports = router;
