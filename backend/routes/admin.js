const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Admin middleware
const adminOnly = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── User Management ───

// Get all users (with coin balance)
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.school_name, u.role, u.created_at,
             COALESCE(uc.balance, 0) as coins
      FROM users u
      LEFT JOIN user_coins uc ON u.id = uc.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get admin stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*)::int as count FROM users');
    const quizzes = await pool.query('SELECT COUNT(*)::int as count FROM quizzes');
    const totalCoins = await pool.query('SELECT COALESCE(SUM(balance), 0)::int as total FROM user_coins');
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(amount_vnd), 0)::int as total FROM payment_orders WHERE status = 'paid'`
    );
    const recentUsers = await pool.query(
      'SELECT id, email, name, school_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const recentQuizzes = await pool.query(
      `SELECT q.id, q.subject, q.topic, q.source, q.created_at, u.email FROM quizzes q JOIN users u ON q.user_id = u.id ORDER BY q.created_at DESC LIMIT 5`
    );
    const recentPayments = await pool.query(
      `SELECT po.*, u.email FROM payment_orders po JOIN users u ON po.user_id = u.id ORDER BY po.created_at DESC LIMIT 5`
    );

    res.json({
      totalUsers: users.rows[0].count,
      totalQuizzes: quizzes.rows[0].count,
      totalCoins: totalCoins.rows[0].total,
      totalRevenue: totalRevenue.rows[0].total,
      recentUsers: recentUsers.rows,
      recentQuizzes: recentQuizzes.rows,
      recentPayments: recentPayments.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset user password
router.put('/users/:id/password', auth, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Coin Management ───

// Add coins to user
router.post('/users/:id/coins/add', auth, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO user_coins (user_id, balance) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + $2, updated_at = NOW()`,
        [req.params.id, amount]
      );

      await client.query(
        'INSERT INTO coin_transactions (user_id, amount, type, description, admin_id) VALUES ($1, $2, \'admin_add\', $3, $4)',
        [req.params.id, amount, reason || 'Admin thêm coin', req.userId]
      );

      await client.query('COMMIT');

      const balanceResult = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [req.params.id]);
      res.json({ success: true, newBalance: balanceResult.rows[0]?.balance || 0 });
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

// Deduct coins from user
router.post('/users/:id/coins/deduct', auth, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const balanceResult = await client.query(
        'SELECT balance FROM user_coins WHERE user_id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (balanceResult.rows.length === 0 || balanceResult.rows[0].balance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'User không đủ coin' });
      }

      await client.query(
        'UPDATE user_coins SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [amount, req.params.id]
      );

      await client.query(
        'INSERT INTO coin_transactions (user_id, amount, type, description, admin_id) VALUES ($1, $2, \'admin_deduct\', $3, $4)',
        [req.params.id, -amount, reason || 'Admin trừ coin', req.userId]
      );

      await client.query('COMMIT');

      const newBalance = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [req.params.id]);
      res.json({ success: true, newBalance: newBalance.rows[0]?.balance || 0 });
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

// Get user's coin transaction history (admin view)
router.get('/users/:id/coins/history', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.*, u.name as admin_name
       FROM coin_transactions ct
       LEFT JOIN users u ON ct.admin_id = u.id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Model Configuration ───

// Get all AI model configs
router.get('/ai-models', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_model_configs ORDER BY id');
    // Mask API keys for display
    const masked = result.rows.map(r => ({
      ...r,
      api_key: r.api_key ? `${r.api_key.substring(0, 8)}...${r.api_key.substring(r.api_key.length - 4)}` : '',
    }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update AI model config
router.put('/ai-models/:key', auth, adminOnly, async (req, res) => {
  try {
    const { apiKey, baseUrl, modelId, enabled, modelName } = req.body;

    const result = await pool.query(
      `UPDATE ai_model_configs SET
        api_key = COALESCE($1, api_key),
        base_url = COALESCE($2, base_url),
        model_id = COALESCE($3, model_id),
        enabled = COALESCE($4, enabled),
        model_name = COALESCE($5, model_name),
        updated_at = NOW()
       WHERE model_key = $6
       RETURNING *`,
      [apiKey || null, baseUrl || null, modelId || null, enabled, modelName || null, req.params.key]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Model not found' });

    const masked = {
      ...result.rows[0],
      api_key: result.rows[0].api_key ? `${result.rows[0].api_key.substring(0, 8)}...` : '',
    };
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
