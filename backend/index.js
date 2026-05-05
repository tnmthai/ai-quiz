require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// API routes FIRST
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static files (only for non-API routes)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

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
