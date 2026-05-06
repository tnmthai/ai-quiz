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

  if (provider === 'chatgpt' || provider === 'deepseek') {
    // OpenAI-compatible API
    const response = await fetch(`${config.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model_id,
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

module.exports = router;
