const pool = require('../db/pool');

async function getWallet(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT pending_balance, available_balance, total_earned, total_withdrawn, updated_at FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = { getWallet };
