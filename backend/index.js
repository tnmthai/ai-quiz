require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// API routes FIRST
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Seed admin user (one-time use)
app.get('/api/seed-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const email = 'tnmthai@gmail.com';
    const password = 'Thai123@';
    const name = 'Admin';
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         name = EXCLUDED.name,
         role = 'admin'
       RETURNING id, email, name, role`,
      [email, hashedPassword, name]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Seed admin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files (only for non-API routes)
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// Catch-all for SPA (only for non-API routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        questions JSONB NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'medium',
        type VARCHAR(50) DEFAULT 'multiple_choice',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Add role column if missing (migration)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
    // Add source column to quizzes (migration)
    await pool.query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'ai'`);

    // === NEW: school_name column ===
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255) DEFAULT ''`);

    // === NEW: user_coins table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_coins (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === NEW: coin_transactions table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === NEW: payment_orders table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount_vnd INTEGER NOT NULL,
        coins INTEGER NOT NULL,
        bonus_coins INTEGER NOT NULL DEFAULT 0,
        gateway VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        gateway_order_id VARCHAR(255),
        gateway_transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
      );
    `);

    // === NEW: ai_model_configs table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_model_configs (
        id SERIAL PRIMARY KEY,
        model_key VARCHAR(50) UNIQUE NOT NULL,
        model_name VARCHAR(100) NOT NULL,
        api_key TEXT,
        base_url TEXT,
        model_id VARCHAR(100),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default AI model configs
    await pool.query(`
      INSERT INTO ai_model_configs (model_key, model_name, api_key, base_url, model_id, enabled)
      VALUES
        ('gemini', 'Google Gemini', '', '', 'gemini-2.5-flash', true),
        ('mimo', 'Xiaomi MiMo', '', 'https://api.xiaomimimo.com/v1', 'mimo-v2-pro', true),
        ('chatgpt', 'ChatGPT (OpenAI)', '', 'https://api.openai.com/v1', 'gpt-4o-mini', false),
        ('deepseek', 'DeepSeek', '', 'https://api.deepseek.com/v1', 'deepseek-chat', false)
      ON CONFLICT (model_key) DO NOTHING
    `);

    // === NEW: quiz_attempts table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percent INTEGER NOT NULL,
        time_spent INTEGER DEFAULT 0,
        mode VARCHAR(20) DEFAULT 'practice',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === NEW: flashcards table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB,
        correct_answer VARCHAR(10) NOT NULL,
        explanation TEXT,
        subject VARCHAR(100),
        topic VARCHAR(255),
        difficulty VARCHAR(20),
        times_reviewed INTEGER DEFAULT 0,
        last_reviewed TIMESTAMP,
        next_review TIMESTAMP DEFAULT NOW(),
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === NEW: shared_quizzes table ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_quizzes (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        share_code VARCHAR(12) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT true,
        attempt_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all users have coin balance rows
    await pool.query(`
      INSERT INTO user_coins (user_id, balance)
      SELECT id, 10 FROM users
      WHERE id NOT IN (SELECT user_id FROM user_coins)
    `);

    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDB();
});
