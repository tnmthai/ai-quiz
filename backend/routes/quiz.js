const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Multer config — memory storage, max 10MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx?|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file .pdf, .docx, .doc, .txt'));
    }
  },
});

// Extract text from uploaded file buffer
async function extractText(file) {
  const ext = file.originalname.toLowerCase();
  if (ext.endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (ext.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  if (ext.endsWith('.doc')) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    } catch {
      throw new Error('Không đọc được file .doc. Vui lòng chuyển sang .docx');
    }
  }
  return file.buffer.toString('utf-8');
}

// ─── Multi-model AI router ───
async function getAIModel(modelKey) {
  // Get model config from DB
  const result = await pool.query(
    'SELECT * FROM ai_model_configs WHERE model_key = $1 AND enabled = true',
    [modelKey || 'gemini']
  );

  if (result.rows.length === 0) {
    // Fallback to Gemini with env var
    if (process.env.GEMINI_API_KEY) {
      return { provider: 'gemini', config: { api_key: process.env.GEMINI_API_KEY, model_id: 'gemini-2.5-flash' } };
    }
    throw new Error(`Model "${modelKey}" không khả dụng hoặc chưa được cấu hình`);
  }

  const config = result.rows[0];

  // For Gemini, fallback to env var if no API key in DB
  if (config.model_key === 'gemini' && !config.api_key && process.env.GEMINI_API_KEY) {
    config.api_key = process.env.GEMINI_API_KEY;
  }

  if (!config.api_key) {
    throw new Error(`API key cho model "${config.model_name}" chưa được cấu hình. Vui lòng liên hệ admin.`);
  }

  return { provider: config.model_key, config };
}

async function generateWithAI(prompt, modelKey) {
  const { provider, config } = await getAIModel(modelKey);

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(config.api_key);
    const model = genAI.getGenerativeModel({ model: config.model_id || 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  if (provider === 'mimo' || provider === 'chatgpt' || provider === 'deepseek') {
    // OpenAI-compatible API
    const baseUrl = config.base_url || (provider === 'mimo' ? 'https://api.xiaomimimo.com/v1' : '');
    const modelId = config.model_id || (provider === 'mimo' ? 'mimo-v2-pro' : 'gpt-4o-mini');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: 'Bạn là giáo viên giỏi, tạo đề thi chất lượng cao. Chỉ trả về JSON, không thêm text khác.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${config.model_name} API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  throw new Error(`Provider "${provider}" chưa được hỗ trợ`);
}

// ─── PDF export helper ───
const { PDFDocument, rgb, StandardFonts } = (() => {
  try { return require('pdf-lib'); } catch { return { PDFDocument: null }; }
})();

// ─── Share code generator ───
function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Spaced repetition helper ───
function calculateNextReview(flashcard, quality) {
  // quality: 0-5 (0=complete blackout, 5=perfect)
  let { ease_factor, interval_days } = flashcard;
  if (quality < 3) {
    interval_days = 1;
  } else {
    if (flashcard.times_reviewed === 0) interval_days = 1;
    else if (flashcard.times_reviewed === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval_days);
  return { ease_factor, interval_days, next_review: nextReview.toISOString() };
}

// ─── Coin system helpers ───
async function deductCoins(userId, amount, description) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const balanceResult = await client.query(
      'SELECT balance FROM user_coins WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('Tài khoản coin không tồn tại');
    }

    const balance = balanceResult.rows[0].balance;
    if (balance < amount) {
      throw new Error(`Không đủ coin. Bạn có ${balance} coin, cần ${amount} coin. Vui lòng nạp thêm.`);
    }

    await client.query(
      'UPDATE user_coins SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
      [amount, userId]
    );

    await client.query(
      'INSERT INTO coin_transactions (user_id, amount, type, description) VALUES ($1, $2, \'deduct\', $3)',
      [userId, -amount, description]
    );

    await client.query('COMMIT');
    return balance - amount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getCoinBalance(userId) {
  const result = await pool.query('SELECT balance FROM user_coins WHERE user_id = $1', [userId]);
  return result.rows.length > 0 ? result.rows[0].balance : 0;
}

// ─── Routes ───

// Get available AI models
router.get('/models', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT model_key, model_name, enabled FROM ai_model_configs ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get usage stats per tool type
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(source, 'ai') as source, COUNT(*)::int as count FROM quizzes WHERE user_id = $1 GROUP BY source`,
      [req.userId]
    );
    const stats = { ai: 0, file: 0, matrix: 0, 'md-to-word': 0 };
    result.rows.forEach(r => { stats[r.source] = r.count; });

    // Also get coin balance
    const coins = await getCoinBalance(req.userId);

    res.json({ ...stats, coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Chat using selected model
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

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

    // Use Gemini for chat (always, to save cost)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

// Generate quiz questions using selected AI model
router.post('/generate', auth, async (req, res) => {
  try {
    const { subject, topic, count = 5, difficulty = 'medium', type = 'multiple_choice', modelKey = 'gemini', grade } = req.body;

    // Check and deduct coins
    const coins = await getCoinBalance(req.userId);
    if (coins < 1) {
      return res.status(402).json({ error: 'Không đủ coin. Vui lòng nạp thêm để tạo đề thi.', coins: 0 });
    }
    await deductCoins(req.userId, 1, `Tạo đề ${subject} - ${topic} (${count} câu)`);

    const prompt = `Tạo ${count} câu hỏi trắc nghiệm về môn ${subject}, chủ đề: ${topic}.
Độ khó: ${difficulty}.
${grade ? `Khối lớp: ${grade}` : ''}
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

    const response = await generateWithAI(prompt, modelKey);

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

    const newBalance = await getCoinBalance(req.userId);
    res.json({ quiz: saved.rows[0], questions, coinsRemaining: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate quiz from uploaded file (PDF/Word/TXT)
router.post('/generate-from-file', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng upload ít nhất 1 file' });
    }

    const { subject, topic, count = 10, difficulty = 'medium', requirements = '[]', modelKey = 'gemini' } = req.body;
    const countNum = Math.min(50, Math.max(1, parseInt(count) || 10));

    // Check and deduct coins
    const coins = await getCoinBalance(req.userId);
    if (coins < 1) {
      return res.status(402).json({ error: 'Không đủ coin. Vui lòng nạp thêm để tạo đề thi.', coins: 0 });
    }
    await deductCoins(req.userId, 1, `Tạo đề từ file (${countNum} câu)`);

    // Extract text from all files
    let allText = '';
    const fileNames = [];
    for (const file of req.files) {
      try {
        const text = await extractText(file);
        allText += `\n\n--- File: ${file.originalname} ---\n${text}`;
        fileNames.push(file.originalname);
      } catch (err) {
        console.error(`Error reading ${file.originalname}:`, err.message);
      }
    }

    if (!allText.trim()) {
      return res.status(400).json({ error: 'Không đọc được nội dung từ file. Vui lòng kiểm tra lại file.' });
    }

    const MAX_CHARS = 80000;
    if (allText.length > MAX_CHARS) {
      allText = allText.substring(0, MAX_CHARS) + '\n\n[Nội dung đã được cắt bớt...]';
    }

    let reqList = [];
    try { reqList = JSON.parse(requirements); } catch { /* ignore */ }
    const reqText = reqList.length > 0 ? `\nYêu cầu bổ sung: ${reqList.join(', ')}` : '';

    const prompt = `Bạn là giáo viên giỏi. Dựa vào nội dung tài liệu dưới đây, hãy tạo ${countNum} câu hỏi trắc nghiệm.

Môn: ${subject || 'Tổng hợp'}
Chuyên đề: ${topic || 'Từ tài liệu'}
Độ khó: ${difficulty}${reqText}

Nội dung tài liệu:
${allText}

Trả về JSON array với format:
[
  {
    "question": "Câu hỏi?",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Giải thích ngắn gọn"
  }
]

YÊU CẦU:
- Câu hỏi phải dựa trên nội dung tài liệu, không bịa đặt
- Mỗi câu có 4 đáp án A, B, C, D
- Chỉ có 1 đáp án đúng
- Giải thích ngắn gọn tại sao chọn đáp án đó
- Chỉ trả về JSON array, không thêm text khác`;

    const response = await generateWithAI(prompt, modelKey);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI không tạo được câu hỏi từ tài liệu này. Vui lòng thử lại.' });
    }

    const questions = JSON.parse(jsonMatch[0]);

    const saved = await pool.query(
      `INSERT INTO quizzes (user_id, subject, topic, questions, difficulty, type, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, subject || 'Từ tài liệu', topic || fileNames.join(', '), JSON.stringify(questions), difficulty, 'multiple_choice', 'file']
    );

    const newBalance = await getCoinBalance(req.userId);
    res.json({ quiz: saved.rows[0], questions, fileNames, coinsRemaining: newBalance });
  } catch (err) {
    console.error('Generate from file error:', err);
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

// Export quiz as Word document (with school name header)
router.get('/:id/word', auth, async (req, res) => {
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
    const { latexToText, cleanForWord } = require('../utils/latex');

    // Get quiz
    const quizResult = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (quizResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    // Get user info (for school name)
    const userResult = await pool.query(
      'SELECT name, school_name FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0] || {};
    const schoolName = user.school_name || '';

    const quiz = quizResult.rows[0];
    const questions = quiz.questions;
    const clean = (text) => cleanForWord(latexToText(text || ''));

    const children = [];

    // School name header (if set)
    if (schoolName) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: schoolName.toUpperCase(), bold: true, size: 28, font: 'Times New Roman' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CC0000' } },
          children: [new TextRun({ text: 'Đề thi chính thức', italics: true, size: 22, color: 'CC0000', font: 'Times New Roman' })],
        })
      );
    }

    // Quiz title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: schoolName ? 100 : 0, after: 100 },
        children: [new TextRun({ text: `ĐỀ THI MÔN ${quiz.subject.toUpperCase()}`, bold: true, size: 32, font: 'Times New Roman' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: `Chủ đề: ${quiz.topic}`, size: 24, font: 'Times New Roman' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Độ khó: ${quiz.difficulty} | Số câu: ${questions.length}`, size: 22, color: '666666', font: 'Times New Roman' })],
      }),
      new Paragraph({ children: [] })
    );

    // Questions
    questions.forEach((q, i) => {
      children.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: `Câu ${i + 1}: ${clean(q.question)}`, bold: true, size: 24, font: 'Times New Roman' })],
      }));

      (q.options || []).forEach(opt => {
        children.push(new Paragraph({
          indent: { left: 720 },
          spacing: { after: 50 },
          children: [new TextRun({ text: clean(opt), size: 22, font: 'Times New Roman' })],
        }));
      });

      if (q.explanation) {
        children.push(new Paragraph({
          indent: { left: 720 },
          spacing: { after: 100 },
          children: [new TextRun({ text: `Đáp án: ${q.correct} — ${clean(q.explanation)}`, size: 20, italics: true, color: '888888', font: 'Times New Roman' })],
        }));
      }

      children.push(new Paragraph({ children: [] }));
    });

    const doc = new Document({ sections: [{ children }] });
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

// ─── Quiz Attempts (lịch sử bài làm) ───

// Save quiz attempt
router.post('/:id/attempt', auth, async (req, res) => {
  try {
    const { answers, score, total, percent, timeSpent, mode } = req.body;
    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, total, percent, time_spent, mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, req.userId, JSON.stringify(answers), score, total, percent, timeSpent || 0, mode || 'practice']
    );

    // Auto-add wrong answers as flashcards
    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
    if (quizResult.rows.length > 0) {
      const quiz = quizResult.rows[0];
      const questions = quiz.questions;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] && answers[i] !== questions[i].correct) {
          // Check if flashcard already exists for this question
          const existing = await pool.query(
            'SELECT id FROM flashcards WHERE user_id = $1 AND quiz_id = $2 AND question = $3',
            [req.userId, req.params.id, questions[i].question]
          );
          if (existing.rows.length === 0) {
            await pool.query(
              `INSERT INTO flashcards (user_id, quiz_id, question, options, correct_answer, explanation, subject, topic, difficulty)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [req.userId, req.params.id, questions[i].question, JSON.stringify(questions[i].options),
               questions[i].correct, questions[i].explanation || '', quiz.subject, quiz.topic, quiz.difficulty]
            );
          }
        }
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Save attempt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get quiz attempts history
router.get('/attempts/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qa.*, q.subject, q.topic, q.difficulty
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = $1
       ORDER BY qa.created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user dashboard stats
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const totalQuizzes = await pool.query('SELECT COUNT(*)::int as count FROM quizzes WHERE user_id = $1', [req.userId]);
    const totalAttempts = await pool.query('SELECT COUNT(*)::int as count FROM quiz_attempts WHERE user_id = $1', [req.userId]);
    const avgScore = await pool.query(
      'SELECT COALESCE(AVG(percent), 0)::int as avg FROM quiz_attempts WHERE user_id = $1',
      [req.userId]
    );
    const totalFlashcards = await pool.query('SELECT COUNT(*)::int as count FROM flashcards WHERE user_id = $1', [req.userId]);
    const dueFlashcards = await pool.query(
      'SELECT COUNT(*)::int as count FROM flashcards WHERE user_id = $1 AND next_review <= NOW()',
      [req.userId]
    );
    const recentAttempts = await pool.query(
      `SELECT qa.percent, qa.created_at, q.subject
       FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = $1 ORDER BY qa.created_at DESC LIMIT 10`,
      [req.userId]
    );
    const subjectStats = await pool.query(
      `SELECT q.subject, COUNT(*)::int as count, COALESCE(AVG(qa.percent), 0)::int as avg_score
       FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = $1 GROUP BY q.subject ORDER BY count DESC`,
      [req.userId]
    );
    const coins = await getCoinBalance(req.userId);

    res.json({
      totalQuizzes: totalQuizzes.rows[0].count,
      totalAttempts: totalAttempts.rows[0].count,
      avgScore: avgScore.rows[0].avg,
      totalFlashcards: totalFlashcards.rows[0].count,
      dueFlashcards: dueFlashcards.rows[0].count,
      recentAttempts: recentAttempts.rows,
      subjectStats: subjectStats.rows,
      coins,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Explanation ───
router.post('/:id/explain', auth, async (req, res) => {
  try {
    const { questionIndex } = req.body;
    const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    const quiz = result.rows[0];
    const q = quiz.questions[questionIndex];
    if (!q) return res.status(400).json({ error: 'Invalid question index' });

    const prompt = `Giải thích chi tiết câu hỏi trắc nghiệm sau:

Câu hỏi: ${q.question}
Các đáp án: ${q.options.join(', ')}
Đáp án đúng: ${q.correct}
${q.explanation ? `Gợi ý ban đầu: ${q.explanation}` : ''}

Hãy giải thích:
1. Tại sao đáp án ${q.correct} đúng
2. Tại sao các đáp án khác sai
3. Mẹo nhớ/khái niệm liên quan
Trả lời ngắn gọn, dễ hiểu bằng tiếng Việt.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const aiResult = await model.generateContent(prompt);
    const explanation = aiResult.response.text();

    res.json({ explanation });
  } catch (err) {
    console.error('Explain error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PDF Export ───
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const quizResult = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (quizResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    const userResult = await pool.query('SELECT name, school_name FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0] || {};
    const quiz = quizResult.rows[0];
    const { latexToText, cleanForWord } = require('../utils/latex');
    const clean = (text) => cleanForWord(latexToText(text || ''));

    // Use pdfkit for PDF generation
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=de-thi-${quiz.subject}-${quiz.id}.pdf`);

    doc.pipe(res);

    // School name
    if (user.school_name) {
      doc.fontSize(14).font('Helvetica-Bold').text(user.school_name.toUpperCase(), { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#CC0000').text('Đề thi chính thức', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.5);
    }

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text(`ĐỀ THI MÔN ${quiz.subject.toUpperCase()}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text(`Chủ đề: ${quiz.topic}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666').text(`Độ khó: ${quiz.difficulty} | Số câu: ${quiz.questions.length}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1);

    // Questions
    quiz.questions.forEach((q, i) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`Câu ${i + 1}: ${clean(q.question)}`);
      doc.moveDown(0.3);
      (q.options || []).forEach(opt => {
        doc.fontSize(10).font('Helvetica').text(`   ${clean(opt)}`, { continued: false });
      });
      if (q.explanation) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#888888')
          .text(`   Đáp án: ${q.correct} — ${clean(q.explanation)}`);
        doc.fillColor('#000000');
      }
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Flashcards ───

// Get due flashcards
router.get('/flashcards/due', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM flashcards WHERE user_id = $1 AND next_review <= NOW()
       ORDER BY next_review ASC LIMIT 20`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all flashcards
router.get('/flashcards/all', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM flashcards WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Review flashcard (update spaced repetition)
router.put('/flashcards/:id/review', auth, async (req, res) => {
  try {
    const { quality } = req.body; // 0-5
    const fc = await pool.query(
      'SELECT * FROM flashcards WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (fc.rows.length === 0) return res.status(404).json({ error: 'Flashcard not found' });

    const flashcard = fc.rows[0];
    const { ease_factor, interval_days, next_review } = calculateNextReview(flashcard, quality);

    await pool.query(
      `UPDATE flashcards SET times_reviewed = times_reviewed + 1, last_reviewed = NOW(),
       next_review = $1, ease_factor = $2, interval_days = $3 WHERE id = $4`,
      [next_review, ease_factor, interval_days, req.params.id]
    );

    res.json({ success: true, next_review, interval_days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete flashcard
router.delete('/flashcards/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM flashcards WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Shared Quizzes ───

// Create share link
router.post('/:id/share', auth, async (req, res) => {
  try {
    // Check quiz belongs to user
    const quiz = await pool.query('SELECT id FROM quizzes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (quiz.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    // Check if already shared
    const existing = await pool.query('SELECT * FROM shared_quizzes WHERE quiz_id = $1', [req.params.id]);
    if (existing.rows.length > 0) {
      return res.json({ share: existing.rows[0], shareUrl: `/shared/${existing.rows[0].share_code}` });
    }

    const shareCode = generateShareCode();
    const result = await pool.query(
      'INSERT INTO shared_quizzes (quiz_id, share_code, created_by) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, shareCode, req.userId]
    );

    res.json({ share: result.rows[0], shareUrl: `/shared/${shareCode}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get shared quiz by code (public, no auth required)
router.get('/shared/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sq.*, q.subject, q.topic, q.difficulty, q.questions, q.type,
              u.name as creator_name
       FROM shared_quizzes sq
       JOIN quizzes q ON sq.quiz_id = q.id
       JOIN users u ON sq.created_by = u.id
       WHERE sq.share_code = $1 AND sq.is_public = true`,
      [req.params.code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found or private' });

    const sq = result.rows[0];
    res.json({
      id: sq.quiz_id,
      subject: sq.subject,
      topic: sq.topic,
      difficulty: sq.difficulty,
      questions: sq.questions,
      type: sq.type,
      creatorName: sq.creator_name,
      attemptCount: sq.attempt_count,
      shareCode: sq.share_code,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit attempt on shared quiz (public)
router.post('/shared/:code/attempt', async (req, res) => {
  try {
    const { answers, score, total, percent, userName } = req.body;

    // Get shared quiz
    const sq = await pool.query(
      'SELECT sq.*, q.questions FROM shared_quizzes sq JOIN quizzes q ON sq.quiz_id = q.id WHERE sq.share_code = $1',
      [req.params.code]
    );
    if (sq.rows.length === 0) return res.status(404).json({ error: 'Shared quiz not found' });

    // Increment attempt count
    await pool.query('UPDATE shared_quizzes SET attempt_count = attempt_count + 1 WHERE share_code = $1', [req.params.code]);

    res.json({ score, total, percent, userName: userName || 'Ẩn danh' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leaderboard for shared quiz
router.get('/shared/:code/leaderboard', async (req, res) => {
  try {
    const sq = await pool.query('SELECT attempt_count FROM shared_quizzes WHERE share_code = $1', [req.params.code]);
    if (sq.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ attemptCount: sq.rows[0].attempt_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's shared quizzes
router.get('/shared/mine', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sq.*, q.subject, q.topic
       FROM shared_quizzes sq
       JOIN quizzes q ON sq.quiz_id = q.id
       WHERE sq.created_by = $1
       ORDER BY sq.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Topic suggestions ───
router.get('/topics/:subject/:grade', auth, async (req, res) => {
  try {
    const { subject, grade } = req.params;
    const TOPICS_BY_SUBJECT = {
      'Toán': ['Hàm số', 'Đại số', 'Tích phân', 'Hình học', 'Số phức', 'Xác suất', 'Thống kê', 'Logarit', 'Bất đẳng thức', 'Đạo hàm', 'Tổ hợp - Hoán vị', 'Vectơ', 'Đa thức', 'Phương trình - Bất phương trình'],
      'Lí': ['Cơ học', 'Điện học', 'Quang học', 'Nhiệt học', 'Sóng', 'Hạt nhân nguyên tử', 'Từ trường', 'Điện từ'],
      'Hóa': ['Vô cơ', 'Hữu cơ', 'Điện hóa', 'Dung dịch', 'Khi', 'Nhiệt hóa', 'Hóa phân tích'],
      'Sinh': ['Di truyền', 'Tiến hóa', 'Sinh thái', 'Tế bào', 'Sinh học phân tử', 'Cơ thể người', 'Thực vật'],
      'Văn': ['Văn học trung đại', 'Văn học hiện đại', 'Văn học nước ngoài', 'Lý luận văn học', 'Làm văn nghị luận'],
      'Sử': ['Lịch sử Việt Nam', 'Lịch sử thế giới', 'Cách mạng tháng Tám', 'Chiến tranh thế giới'],
      'Địa': ['Địa lý tự nhiên', 'Địa lý kinh tế', 'Địa lý dân cư', 'Bản đồ'],
      'Anh': ['Ngữ pháp', 'Từ vựng', 'Đọc hiểu', 'Viết', 'Nghe', 'Giao tiếp'],
      'GDCD': ['Pháp luật', 'Đạo đức', 'Quyền công dân', 'Gia đình xã hội'],
      'Tin học': ['Lập trình', 'Thuật toán', 'Cấu trúc dữ liệu', 'Mạng máy tính', 'Cơ sở dữ liệu'],
    };
    const topics = TOPICS_BY_SUBJECT[subject] || [];
    // Add popularity based on user's past quizzes
    const userTopics = await pool.query(
      'SELECT topic, COUNT(*) as cnt FROM quizzes WHERE user_id = $1 AND subject = $2 GROUP BY topic ORDER BY cnt DESC LIMIT 5',
      [req.userId, subject]
    );
    const popular = userTopics.rows.map(r => r.topic);
    res.json({ topics, popular });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Search quizzes ───
router.get('/search/quizzes', auth, async (req, res) => {
  try {
    const { q, subject, difficulty } = req.query;
    let query = 'SELECT id, subject, topic, difficulty, type, source, created_at FROM quizzes WHERE user_id = $1';
    const params = [req.userId];
    let idx = 2;

    if (q) {
      query += ` AND (topic ILIKE $${idx} OR subject ILIKE $${idx})`;
      params.push(`%${q}%`);
      idx++;
    }
    if (subject) {
      query += ` AND subject = $${idx}`;
      params.push(subject);
      idx++;
    }
    if (difficulty) {
      query += ` AND difficulty = $${idx}`;
      params.push(difficulty);
      idx++;
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
