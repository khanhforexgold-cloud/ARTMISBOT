const express = require('express');
const {
  getUsers,
  addCommission,
  approveCommission,
  rejectCommission,
  updateAffiliateRate,
  getWithdrawRequests,
  approveWithdraw,
  rejectWithdraw,
  payWithdraw
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', getUsers);
router.post('/commission/add', addCommission);
router.post('/commission/approve', approveCommission);
router.post('/commission/reject', rejectCommission);
router.post('/affiliate/update-rate', updateAffiliateRate);
router.get('/withdraws', getWithdrawRequests);
router.post('/withdraw/approve', approveWithdraw);
router.post('/withdraw/reject', rejectWithdraw);
router.post('/withdraw/pay', payWithdraw);

module.exports = router;
