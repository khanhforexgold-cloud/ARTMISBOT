const { Pool } = require('pg');
const env = require('../config/env');

if (!env.databaseUrl) {
  console.warn('DATABASE_URL is missing. Update .env before running the server.');
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
