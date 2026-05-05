const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI Chat using Gemini
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemContext = `Bạn là trợ lý AI của ứng dụng "AI Teacher Assistant" — nền tảng tạo đề thi cho giáo viên Việt Nam.

Chức năng của ứng dụng:
- Tạo đề thi bằng AI (chọn môn, chuyên đề, độ khó, số câu)
- Tạo đề từ file Word/PDF có sẵn
- Tạo đề từ ma trận đặc tả theo GDPT 2018
- Tải đề thi dưới dạng file Word (.docx)
- Quản lý đề thi đã lưu
- Chat với AI để được hỗ trợ

Bạn chỉ trả lời các câu hỏi liên quan đến ứng dụng này, giáo dục, tạo đề thi, hoặc hỗ trợ sử dụng. Nếu câu hỏi không liên quan, lịch sự từ chối và hướng dẫn người dùng về chức năng của ứng dụng.

Trả lời ngắn gọn, bằng tiếng Việt.`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Tôi đã hiểu. Tôi là trợ lý AI của AI Teacher Assistant, sẵn sàng hỗ trợ bạn về tạo đề thi và sử dụng ứng dụng.' }] },
      ],
    });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate quiz questions using Gemini
router.post('/generate', auth, async (req, res) => {
  try {
    const { subject, topic, count = 5, difficulty = 'medium', type = 'multiple_choice' } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

// Export quiz as Word document
router.get('/:id/word', auth, async (req, res) => {
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
    const { latexToText } = require('../utils/latex');
    
    const result = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    const quiz = result.rows[0];
    const questions = quiz.questions;
    
    const clean = (text) => latexToText(text || '');
    
    const children = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `ĐỀ THI MÔN ${quiz.subject.toUpperCase()}`, bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Chủ đề: ${quiz.topic}`, size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Độ khó: ${quiz.difficulty} | Số câu: ${questions.length}`, size: 22, color: '666666' })],
      }),
      new Paragraph({ children: [] }),
    ];
    
    questions.forEach((q, i) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Câu ${i + 1}: ${clean(q.question)}`, bold: true, size: 24 })],
      }));
      
      (q.options || []).forEach(opt => {
        children.push(new Paragraph({
          indent: { left: 720 },
          children: [new TextRun({ text: clean(opt), size: 22 })],
        }));
      });
      
      if (q.explanation) {
        children.push(new Paragraph({
          indent: { left: 720 },
          children: [new TextRun({ text: `Đáp án: ${q.correct} — ${clean(q.explanation)}`, size: 20, italics: true, color: '888888' })],
        }));
      }
      
      children.push(new Paragraph({ children: [] }));
    });
    
    const doc = new Document({
      sections: [{ children }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=de-thi-${quiz.subject}-${quiz.id}.docx`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Word export error:', err);
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
