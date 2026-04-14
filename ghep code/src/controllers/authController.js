const bcrypt = require('bcryptjs');
const { z } = require('zod');
const pool = require('../db/pool');
const { withTransaction } = require('../db/transaction');
const { signToken } = require('../utils/jwt');
const { generateRefCode } = require('../utils/refCode');
const env = require('../config/env');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional().or(z.literal('')),
  password: z.string().min(6),
  ref: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    let referredBy = null;
    if (data.ref) {
      const refResult = await pool.query(
        'SELECT user_id FROM affiliate_profiles WHERE ref_code = $1 AND status = $2',
        [data.ref, 'active']
      );
      referredBy = refResult.rows[0]?.user_id || null;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await withTransaction(async (client) => {
      const userInsert = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role, referred_by)
         VALUES ($1, $2, $3, $4, 'user', $5)
         RETURNING id, name, email, phone, role, referred_by, created_at`,
        [data.name, data.email, data.phone || null, passwordHash, referredBy]
      );

      const user = userInsert.rows[0];
      let refCode = generateRefCode(data.name);

      while (true) {
        const exists = await client.query('SELECT 1 FROM affiliate_profiles WHERE ref_code = $1', [refCode]);
        if (!exists.rows[0]) break;
        refCode = generateRefCode(data.name);
      }

      await client.query(
        `INSERT INTO affiliate_profiles (user_id, ref_code, commission_type, commission_value, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [user.id, refCode, env.defaultCommissionType, env.defaultCommissionValue]
      );

      await client.query(
        `INSERT INTO wallets (user_id, pending_balance, available_balance, total_earned, total_withdrawn)
         VALUES ($1, 0, 0, 0, 0)`,
        [user.id]
      );

      return { ...user, ref_code: refCode };
    });

    const token = signToken({ userId: result.id, role: result.role });
    res.status(201).json({ token, user: result });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, password_hash FROM users WHERE email = $1',
      [data.email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, role: user.role });
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.referred_by, ap.ref_code,
              w.pending_balance, w.available_balance, w.total_earned, w.total_withdrawn
       FROM users u
       LEFT JOIN affiliate_profiles ap ON ap.user_id = u.id
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, me };
