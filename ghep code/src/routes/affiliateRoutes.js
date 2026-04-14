const express = require('express');
const { getProfile, getStats, getCommissions } = require('../controllers/affiliateController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/profile', getProfile);
router.get('/stats', getStats);
router.get('/commissions', getCommissions);

module.exports = router;
