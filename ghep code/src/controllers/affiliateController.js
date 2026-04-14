const pool = require('../db/pool');
const env = require('../config/env');

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT ap.ref_code, ap.commission_type, ap.commission_value, ap.status,
              w.pending_balance, w.available_balance, w.total_earned, w.total_withdrawn,
              COUNT(u.id) AS referral_count
       FROM affiliate_profiles ap
       LEFT JOIN wallets w ON w.user_id = ap.user_id
       LEFT JOIN users u ON u.referred_by = ap.user_id
       WHERE ap.user_id = $1
       GROUP BY ap.ref_code, ap.commission_type, ap.commission_value, ap.status,
                w.pending_balance, w.available_balance, w.total_earned, w.total_withdrawn`,
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Affiliate profile not found' });
    }

    const profile = rows[0];
    res.json({
      ...profile,
      affiliate_link: `${env.appBaseUrl}/register?ref=${profile.ref_code}`
    });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const userId = req.user.id;
    const referrals = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM users
       WHERE referred_by = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const commissions = await pool.query(
      `SELECT COUNT(*) AS commission_count,
              COALESCE(SUM(amount), 0) AS total_commission,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved_commission,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_commission
       FROM commission_logs
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      referrals: referrals.rows,
      summary: commissions.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function getCommissions(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT cl.id, cl.amount, cl.status, cl.note, cl.created_at,
              u.name AS source_name, u.email AS source_email
       FROM commission_logs cl
       LEFT JOIN users u ON u.id = cl.source_user_id
       WHERE cl.user_id = $1
       ORDER BY cl.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, getStats, getCommissions };
