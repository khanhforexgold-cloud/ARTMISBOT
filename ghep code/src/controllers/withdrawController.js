const { z } = require('zod');
const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');
const env = require('../config/env');

const withdrawSchema = z.object({
  amount: z.number().positive(),
  bank_name: z.string().min(2),
  bank_account_name: z.string().min(2),
  bank_account_number: z.string().min(4)
});

async function createWithdrawRequest(req, res, next) {
  try {
    const data = withdrawSchema.parse(req.body);

    if (data.amount < env.minWithdrawAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal is ${env.minWithdrawAmount}`
      });
    }

    const result = await withTransaction(async (client) => {
      const walletResult = await client.query(
        'SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [req.user.id]
      );

      const wallet = walletResult.rows[0];
      if (!wallet) {
        throw Object.assign(new Error('Wallet not found'), { status: 404 });
      }

      if (Number(wallet.available_balance) < data.amount) {
        throw Object.assign(new Error('Insufficient available balance'), { status: 400 });
      }

      const pendingExists = await client.query(
        `SELECT id FROM withdraw_requests
         WHERE user_id = $1 AND status IN ('pending', 'approved')
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );

      if (pendingExists.rows[0]) {
        throw Object.assign(new Error('You already have a withdrawal request being processed'), {
          status: 400
        });
      }

      const insert = await client.query(
        `INSERT INTO withdraw_requests
         (user_id, amount, bank_name, bank_account_name, bank_account_number, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [req.user.id, data.amount, data.bank_name, data.bank_account_name, data.bank_account_number]
      );

      return insert.rows[0];
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getWithdrawHistory(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, amount, bank_name, bank_account_name, bank_account_number,
              status, admin_note, created_at, paid_at
       FROM withdraw_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

module.exports = { createWithdrawRequest, getWithdrawHistory };
