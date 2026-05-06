const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

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

// Webhook callbacks for payment gateways (production-ready placeholders)
router.post('/vnpay-callback', async (req, res) => {
  // TODO: Verify VNPay signature and process callback
  // vnp_TmnCode, vnp_HashSecret from env
  res.json({ RspCode: '00', Message: 'OK' });
});

router.post('/momo-callback', async (req, res) => {
  // TODO: Verify MoMo signature and process callback
  res.json({ resultCode: 0, message: 'OK' });
});

router.post('/zalopay-callback', async (req, res) => {
  // TODO: Verify ZaloPay signature and process callback
  res.json({ return_code: 1, return_message: 'OK' });
});

module.exports = router;
