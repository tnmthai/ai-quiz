const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, schoolName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, school_name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, school_name',
      [email, hashedPassword, name || email.split('@')[0], schoolName || '']
    );

    const user = result.rows[0];

    // Give new users 10 free coins
    await pool.query(
      'INSERT INTO user_coins (user_id, balance) VALUES ($1, 10) ON CONFLICT (user_id) DO NOTHING',
      [user.id]
    );
    await pool.query(
      'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES ($1, 10, \'bonus\', \'Quà tặng đăng ký mới\')',
      [user.id]
    );

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { ...user, coins: 10 } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    // Get coin balance
    const coinResult = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [user.id]);
    const coins = coinResult.rows.length > 0 ? coinResult.rows[0].balance : 0;

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        school_name: user.school_name || '',
        coins,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (school_name, name)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, schoolName } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), school_name = COALESCE($2, school_name) WHERE id = $3 RETURNING id, email, name, role, school_name',
      [name, schoolName, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Get coin balance
    const coinResult = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [req.userId]);
    const coins = coinResult.rows.length > 0 ? coinResult.rows[0].balance : 0;

    res.json({ user: { ...result.rows[0], coins } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, school_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const coinResult = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [req.userId]);
    const coins = coinResult.rows.length > 0 ? coinResult.rows[0].balance : 0;

    res.json({ user: { ...result.rows[0], coins } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải ít nhất 6 ký tự' });
    }

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.userId]);

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
