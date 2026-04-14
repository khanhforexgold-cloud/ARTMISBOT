const { z } = require('zod');
const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');

const addCommissionSchema = z.object({
  user_id: z.number().int().positive(),
  source_user_id: z.number().int().positive().optional(),
  amount: z.number().positive(),
  note: z.string().optional().default('Manual commission by admin'),
  auto_approve: z.boolean().optional().default(false)
});

const approveCommissionSchema = z.object({
  commission_log_id: z.number().int().positive()
});

const updateRateSchema = z.object({
  user_id: z.number().int().positive(),
  commission_type: z.enum(['percent', 'fixed']),
  commission_value: z.number().nonnegative(),
  status: z.enum(['active', 'locked']).optional()
});

const adminNoteSchema = z.object({
  withdraw_request_id: z.number().int().positive(),
  admin_note: z.string().optional().default('')
});

async function getUsers(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              ap.ref_code, ap.commission_type, ap.commission_value, ap.status AS affiliate_status,
              w.pending_balance, w.available_balance, w.total_earned, w.total_withdrawn
       FROM users u
       LEFT JOIN affiliate_profiles ap ON ap.user_id = u.id
       LEFT JOIN wallets w ON w.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function addCommission(req, res, next) {
  try {
    const data = addCommissionSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO commission_logs (user_id, source_user_id, amount, status, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.user_id, data.source_user_id || null, data.amount, data.auto_approve ? 'approved' : 'pending', data.note]
      );

      await client.query(
        `UPDATE wallets
         SET total_earned = total_earned + $2,
             ${data.auto_approve ? 'available_balance = available_balance + $2,' : 'pending_balance = pending_balance + $2,'}
             updated_at = NOW()
         WHERE user_id = $1`,
        [data.user_id, data.amount]
      );

      return insert.rows[0];
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function approveCommission(req, res, next) {
  try {
    const data = approveCommissionSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const logResult = await client.query(
        `SELECT id, user_id, amount, status
         FROM commission_logs
         WHERE id = $1
         FOR UPDATE`,
        [data.commission_log_id]
      );

      const log = logResult.rows[0];
      if (!log) {
        throw Object.assign(new Error('Commission log not found'), { status: 404 });
      }
      if (log.status !== 'pending') {
        throw Object.assign(new Error('Only pending commission can be approved'), { status: 400 });
      }

      await client.query(
        `UPDATE commission_logs SET status = 'approved' WHERE id = $1`,
        [log.id]
      );

      await client.query(
        `UPDATE wallets
         SET pending_balance = pending_balance - $2,
             available_balance = available_balance + $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [log.user_id, log.amount]
      );

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function rejectCommission(req, res, next) {
  try {
    const data = approveCommissionSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const logResult = await client.query(
        `SELECT id, user_id, amount, status
         FROM commission_logs
         WHERE id = $1
         FOR UPDATE`,
        [data.commission_log_id]
      );

      const log = logResult.rows[0];
      if (!log) {
        throw Object.assign(new Error('Commission log not found'), { status: 404 });
      }
      if (log.status !== 'pending') {
        throw Object.assign(new Error('Only pending commission can be rejected'), { status: 400 });
      }

      await client.query(`UPDATE commission_logs SET status = 'rejected' WHERE id = $1`, [log.id]);
      await client.query(
        `UPDATE wallets
         SET pending_balance = pending_balance - $2,
             total_earned = total_earned - $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [log.user_id, log.amount]
      );

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateAffiliateRate(req, res, next) {
  try {
    const data = updateRateSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE affiliate_profiles
       SET commission_type = $2,
           commission_value = $3,
           status = COALESCE($4, status)
       WHERE user_id = $1
       RETURNING *`,
      [data.user_id, data.commission_type, data.commission_value, data.status || null]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Affiliate profile not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function getWithdrawRequests(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT wr.*, u.name, u.email, u.phone
       FROM withdraw_requests wr
       INNER JOIN users u ON u.id = wr.user_id
       ORDER BY wr.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function approveWithdraw(req, res, next) {
  try {
    const data = adminNoteSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE withdraw_requests
       SET status = 'approved', admin_note = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [data.withdraw_request_id, data.admin_note]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Pending withdraw request not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function rejectWithdraw(req, res, next) {
  try {
    const data = adminNoteSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE withdraw_requests
       SET status = 'rejected', admin_note = $2
       WHERE id = $1 AND status IN ('pending', 'approved')
       RETURNING *`,
      [data.withdraw_request_id, data.admin_note]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Withdraw request not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function payWithdraw(req, res, next) {
  try {
    const data = adminNoteSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `SELECT id, user_id, amount, status
         FROM withdraw_requests
         WHERE id = $1
         FOR UPDATE`,
        [data.withdraw_request_id]
      );

      const request = requestResult.rows[0];
      if (!request) {
        throw Object.assign(new Error('Withdraw request not found'), { status: 404 });
      }
      if (request.status !== 'approved') {
        throw Object.assign(new Error('Only approved withdraw requests can be marked as paid'), {
          status: 400
        });
      }

      const walletResult = await client.query(
        'SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [request.user_id]
      );
      const wallet = walletResult.rows[0];

      if (!wallet || Number(wallet.available_balance) < Number(request.amount)) {
        throw Object.assign(new Error('Insufficient wallet balance for payout'), { status: 400 });
      }

      await client.query(
        `UPDATE wallets
         SET available_balance = available_balance - $2,
             total_withdrawn = total_withdrawn + $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [request.user_id, request.amount]
      );

      const paid = await client.query(
        `UPDATE withdraw_requests
         SET status = 'paid', admin_note = $2, paid_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [request.id, data.admin_note]
      );

      return paid.rows[0];
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  addCommission,
  approveCommission,
  rejectCommission,
  updateAffiliateRate,
  getWithdrawRequests,
  approveWithdraw,
  rejectWithdraw,
  payWithdraw
};
