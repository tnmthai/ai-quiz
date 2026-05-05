const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate quiz questions using Gemini
router.post('/generate', auth, async (req, res) => {
  try {
    const { subject, topic, count = 5, difficulty = 'medium', type = 'multiple_choice' } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Tạo ${count} câu hỏi trắc nghiệm về môn ${subject}, chủ đề: ${topic}.
Độ khó: ${difficulty}.
Trả về JSON array với format:
[
  {
    "question": "Câu hỏi?",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Giải thích..."
  }
]
Chỉ trả về JSON, không thêm text khác.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' });

    const questions = JSON.parse(jsonMatch[0]);

    // Save to database
    const saved = await pool.query(
      `INSERT INTO quizzes (user_id, subject, topic, questions, difficulty, type, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, subject, topic, JSON.stringify(questions), difficulty, type, req.body.source || 'ai']
    );

    res.json({ quiz: saved.rows[0], questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get usage stats per tool type
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(source, 'ai') as source,
        COUNT(*)::int as count
       FROM quizzes WHERE user_id = $1 GROUP BY source`,
      [req.userId]
    );
    const stats = { ai: 0, file: 0, matrix: 0, 'md-to-word': 0 };
    result.rows.forEach(r => { stats[r.source] = r.count; });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's quizzes
router.get('/my-quizzes', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, subject, topic, difficulty, type, created_at FROM quizzes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get quiz by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quiz
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM quizzes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
