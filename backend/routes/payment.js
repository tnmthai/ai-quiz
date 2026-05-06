const express = require('express');
const crypto = require('crypto');
const https = require('https');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// MoMo config from env vars
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || '',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
};

// Coin pricing tiers
const COIN_TIERS = [
  { amountVnd: 10000, coins: 10, bonus: 0, label: '10,000đ = 10 coins' },
  { amountVnd: 50000, coins: 50, bonus: 10, label: '50,000đ = 60 coins (+10 bonus)' },
  { amountVnd: 100000, coins: 100, bonus: 30, label: '100,000đ = 130 coins (+30 bonus)' },
  { amountVnd: 200000, coins: 200, bonus: 80, label: '200,000đ = 280 coins (+80 bonus)' },
];

// Get coin pricing tiers
router.get('/tiers', (req, res) => {
  res.json(COIN_TIERS);
});

// Get user coin balance
router.get('/balance', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance FROM user_coins WHERE user_id = $1',
      [req.userId]
    );
    const balance = result.rows.length > 0 ? result.rows[0].balance : 0;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user coin transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.*, u.name as admin_name
       FROM coin_transactions ct
       LEFT JOIN users u ON ct.admin_id = u.id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user payment history
router.get('/payments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create payment order (demo mode)
router.post('/create-order', auth, async (req, res) => {
  try {
    const { tierIndex, gateway = 'demo' } = req.body;

    if (tierIndex === undefined || tierIndex < 0 || tierIndex >= COIN_TIERS.length) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const tier = COIN_TIERS[tierIndex];
    const totalCoins = tier.coins + tier.bonus;

    // Create order in DB
    const result = await pool.query(
      `INSERT INTO payment_orders (user_id, amount_vnd, coins, bonus_coins, gateway, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [req.userId, tier.amountVnd, tier.coins, tier.bonus, gateway]
    );

    const order = result.rows[0];

    // In demo mode, we return a fake payment URL
    // In production, this would call VNPay/MoMo/ZaloPay API
    const paymentUrl = `/api/payment/demo-pay/${order.id}`;

    res.json({
      orderId: order.id,
      amountVnd: tier.amountVnd,
      totalCoins,
      gateway,
      paymentUrl,
      // Demo: include direct pay link
      demoMode: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demo payment callback (simulates successful payment)
router.get('/demo-pay/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get the order
    const orderResult = await pool.query(
      'SELECT * FROM payment_orders WHERE id = $1 AND user_id = $2',
      [orderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status === 'paid') {
      return res.json({ success: true, message: 'Already paid', orderId });
    }

    const totalCoins = order.coins + order.bonus_coins;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark order as paid
      await client.query(
        `UPDATE payment_orders SET status = 'paid', paid_at = NOW(), gateway_transaction_id = $1 WHERE id = $2`,
        [`demo_txn_${Date.now()}`, orderId]
      );

      // Add coins to user
      await client.query(
        `INSERT INTO user_coins (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + $2, updated_at = NOW()`,
        [req.userId, totalCoins]
      );

      // Record transaction
      await client.query(
        `INSERT INTO coin_transactions (user_id, amount, type, description)
         VALUES ($1, $2, 'topup', $3)`,
        [req.userId, totalCoins, `Nạp ${order.amount_vnd.toLocaleString()}đ qua ${order.gateway} (+${order.bonus_coins} bonus)`]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Nạp thành công ${totalCoins} coins!`,
        coinsAdded: totalCoins,
        orderId,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create MoMo payment order
router.post('/momo/create', auth, async (req, res) => {
  try {
    const { tierIndex } = req.body;

    if (tierIndex === undefined || tierIndex < 0 || tierIndex >= COIN_TIERS.length) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    if (!MOMO_CONFIG.partnerCode || !MOMO_CONFIG.accessKey || !MOMO_CONFIG.secretKey) {
      return res.status(500).json({ error: 'MoMo chưa được cấu hình. Vui lòng liên hệ admin.' });
    }

    const tier = COIN_TIERS[tierIndex];
    const totalCoins = tier.coins + tier.bonus;
    const amount = tier.amountVnd;
    const orderId = MOMO_CONFIG.partnerCode + '_' + Date.now();
    const requestId = orderId;
    const orderInfo = `Nap ${totalCoins} coin - ${tier.label}`;
    const redirectUrl = `${process.env.APP_URL || 'https://ai-quiz.up.railway.app'}/api/payment/momo-return`;
    const ipnUrl = `${process.env.APP_URL || 'https://ai-quiz.up.railway.app'}/api/payment/momo-ipn`;
    const extraData = Buffer.from(JSON.stringify({ tierIndex, userId: req.userId })).toString('base64');
    const requestType = 'payWithMethod';

    // Build raw signature string (alphabetical key order)
    const rawSignature =
      `accessKey=${MOMO_CONFIG.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${MOMO_CONFIG.partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    // Create order in DB first
    await pool.query(
      `INSERT INTO payment_orders (user_id, amount_vnd, coins, bonus_coins, gateway, status, gateway_order_id)
       VALUES ($1, $2, $3, $4, 'momo', 'pending', $5)`,
      [req.userId, amount, tier.coins, tier.bonus, orderId]
    );

    // Request to MoMo
    const body = JSON.stringify({
      partnerCode: MOMO_CONFIG.partnerCode,
      partnerName: 'AI Teacher Assistant',
      storeId: 'AIQuiz',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    });

    const momoUrl = new URL(MOMO_CONFIG.endpoint);
    const options = {
      hostname: momoUrl.hostname,
      port: 443,
      path: momoUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const momoRes = await new Promise((resolve, reject) => {
      const r = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid MoMo response')); }
        });
      });
      r.on('error', reject);
      r.write(body);
      r.end();
    });

    if (momoRes.resultCode !== 0) {
      // Mark order as failed
      await pool.query(
        `UPDATE payment_orders SET status = 'failed' WHERE gateway_order_id = $1`,
        [orderId]
      );
      return res.status(400).json({ error: momoRes.message || 'MoMo error', resultCode: momoRes.resultCode });
    }

    res.json({
      payUrl: momoRes.payUrl,
      orderId,
      deeplink: momoRes.deeplink,
      qrCodeUrl: momoRes.qrCodeUrl,
    });
  } catch (err) {
    console.error('MoMo create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// MoMo IPN callback (server-to-server)
router.post('/momo-ipn', async (req, res) => {
  try {
    const {
      partnerCode, orderId, requestId, amount, orderInfo,
      orderType, transId, resultCode, message, payType,
      responseTime, extraData, signature,
    } = req.body;

    console.log('MoMo IPN:', { orderId, resultCode, transId, amount });

    // Verify signature
    const rawSignature =
      `accessKey=${MOMO_CONFIG.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSig = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (signature !== expectedSig) {
      console.error('MoMo IPN signature mismatch');
      return res.status(400).json({ resultCode: 1, message: 'Invalid signature' });
    }

    // Get order
    const orderResult = await pool.query(
      'SELECT * FROM payment_orders WHERE gateway_order_id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ resultCode: 1, message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status === 'paid') {
      return res.json({ resultCode: 0, message: 'Already processed' });
    }

    if (resultCode !== 0) {
      await pool.query(
        `UPDATE payment_orders SET status = 'failed' WHERE id = $1`,
        [order.id]
      );
      return res.json({ resultCode: 0, message: 'Payment failed' });
    }

    // Parse extraData to get coins info
    const extra = JSON.parse(Buffer.from(extraData, 'base64').toString());
    const tier = COIN_TIERS[extra.tierIndex];
    const totalCoins = tier.coins + tier.bonus;

    // Credit coins
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE payment_orders SET status = 'paid', paid_at = NOW(), gateway_transaction_id = $1 WHERE id = $2`,
        [String(transId), order.id]
      );

      await client.query(
        `INSERT INTO user_coins (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + $2, updated_at = NOW()`,
        [order.user_id, totalCoins]
      );

      await client.query(
        `INSERT INTO coin_transactions (user_id, amount, type, description)
         VALUES ($1, $2, 'momo', $3)`,
        [order.user_id, totalCoins, `Nạp MoMo ${amount.toLocaleString()}đ (+${tier.bonus} bonus)`]
      );

      await client.query('COMMIT');
      console.log(`MoMo IPN: Credited ${totalCoins} coins to user ${order.user_id}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ resultCode: 0, message: 'OK' });
  } catch (err) {
    console.error('MoMo IPN error:', err);
    res.status(500).json({ resultCode: 1, message: err.message });
  }
});

// MoMo redirect return URL
router.get('/momo-return', async (req, res) => {
  const { orderId, resultCode, message } = req.query;
  const frontendUrl = process.env.APP_URL || 'https://ai-quiz.up.railway.app';

  if (resultCode === '0') {
    res.redirect(`${frontendUrl}/topup?momo=success&orderId=${orderId}`);
  } else {
    res.redirect(`${frontendUrl}/topup?momo=failed&message=${encodeURIComponent(message || 'Thanh toán thất bại')}`);
  }
});

// Webhook callbacks for payment gateways (production-ready placeholders)
router.post('/vnpay-callback', async (req, res) => {
  // TODO: Verify VNPay signature and process callback
  res.json({ RspCode: '00', Message: 'OK' });
});

router.post('/zalopay-callback', async (req, res) => {
  // TODO: Verify ZaloPay signature and process callback
  res.json({ return_code: 1, return_message: 'OK' });
});

module.exports = router;
