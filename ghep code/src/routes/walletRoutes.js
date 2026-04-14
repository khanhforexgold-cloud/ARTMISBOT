const express = require('express');
const { getWallet } = require('../controllers/walletController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getWallet);

module.exports = router;
