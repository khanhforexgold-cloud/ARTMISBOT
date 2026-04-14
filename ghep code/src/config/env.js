const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appBaseUrl: process.env.APP_BASE_URL || 'https://artemisbot.com',
  defaultCommissionType: process.env.DEFAULT_COMMISSION_TYPE || 'percent',
  defaultCommissionValue: Number(process.env.DEFAULT_COMMISSION_VALUE || 20),
  minWithdrawAmount: Number(process.env.MIN_WITHDRAW_AMOUNT || 500000)
};
