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

// Get all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*)::int as count FROM users');
    const quizzes = await pool.query('SELECT COUNT(*)::int as count FROM quizzes');
    const recentUsers = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const recentQuizzes = await pool.query(
      `SELECT q.id, q.subject, q.topic, q.source, q.created_at, u.email 
       FROM quizzes q JOIN users u ON q.user_id = u.id 
       ORDER BY q.created_at DESC LIMIT 5`
    );

    res.json({
      totalUsers: users.rows[0].count,
      totalQuizzes: quizzes.rows[0].count,
      recentUsers: recentUsers.rows,
      recentQuizzes: recentQuizzes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
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
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
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
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
