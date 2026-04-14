const express = require('express');
const { createWithdrawRequest, getWithdrawHistory } = require('../controllers/withdrawController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', createWithdrawRequest);
router.get('/history', getWithdrawHistory);

module.exports = router;
