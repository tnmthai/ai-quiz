#!/usr/bin/env node
/**
 * Seed script: tạo admin user và init database
 * Usage: node scripts/seed.js
 * Requires: DATABASE_URL env var
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'tnmthai@gmail.com';
const ADMIN_PASSWORD = 'Thai123@';
const ADMIN_NAME = 'Admin';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    // Create tables
    console.log('📋 Creating tables...');
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
    // Migration: add role column if missing
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
    console.log('✅ Tables ready');

    // Create admin user
    console.log(`👑 Creating admin user: ${ADMIN_EMAIL}...`);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         name = EXCLUDED.name,
         role = 'admin'
       RETURNING id, email, name, role`,
      [ADMIN_EMAIL, hashedPassword, ADMIN_NAME]
    );
    console.log('✅ Admin user created:', result.rows[0]);

    console.log('\n🎉 Seed completed!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: admin`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
