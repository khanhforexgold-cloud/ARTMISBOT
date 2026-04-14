const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const walletRoutes = require('./routes/walletRoutes');
const withdrawRoutes = require('./routes/withdrawRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'artemis-affiliate-backend' });
});

app.use('/api', authRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Artemis Affiliate API listening on port ${env.port}`);
});
