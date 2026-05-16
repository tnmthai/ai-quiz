import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function TakeQuiz({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null = select, 'practice' | 'exam'
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [explaining, setExplaining] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetchQuiz();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const { data } = await axios.get(`/api/quiz/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startExam = (examMode) => {
    setMode(examMode);
    startTimeRef.current = Date.now();

    if (examMode === 'exam') {
      const totalTime = (quiz?.questions?.length || 10) * 60; // 1 min/question
      setTimeLeft(totalTime);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleAnswer = (option) => {
    setAnswers({ ...answers, [current]: option });
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeSpent(elapsed);
    setShowResult(true);

    // Save attempt to backend
    const questions = quiz.questions;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const percent = Math.round(correct / questions.length * 100);

    try {
      await axios.post(`/api/quiz/${id}/attempt`, {
        answers, score: correct, total: questions.length, percent,
        timeSpent: elapsed, mode
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('Save attempt error:', err);
    }
  };

  const handleExplain = async (questionIndex) => {
    if (explanations[questionIndex]) {
      setExplaining(explaining === questionIndex ? null : questionIndex);
      return;
    }
    setExplaining(questionIndex);
    try {
      const { data } = await axios.post(`/api/quiz/${id}/explain`, { questionIndex }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExplanations(prev => ({ ...prev, [questionIndex]: data.explanation }));
    } catch (err) {
      setExplanations(prev => ({ ...prev, [questionIndex]: 'Không thể tạo giải thích. Vui lòng thử lại.' }));
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const { data } = await axios.post(`/api/quiz/${id}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareUrl(`${window.location.origin}${data.shareUrl}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const resp = await fetch(`/api/quiz/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `de-thi-${quiz.subject}-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi tải PDF: ' + err.message);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getScore = () => {
    if (!quiz) return { correct: 0, total: 0, percent: 0 };
    const questions = quiz.questions;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    return { correct, total: questions.length, percent: Math.round(correct / questions.length * 100) };
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );

  if (!quiz) return <div className="text-center py-12 text-gray-500">Không tìm thấy đề thi</div>;

  const questions = quiz.questions;
  const score = showResult ? getScore() : null;

  // Mode selection screen
  if (mode === null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📝</div>
            <h1 className="text-xl font-bold text-gray-800">{quiz.subject} — {quiz.topic}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Độ khó: {quiz.difficulty} | {questions.length} câu hỏi
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startExam('practice')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">📝</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Luyện tập</h3>
                  <p className="text-xs text-gray-500">Không giới hạn thời gian, xem đáp án ngay</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startExam('exam')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">⏱️</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Thi thử</h3>
                  <p className="text-xs text-gray-500">Đếm ngược {questions.length} phút, nộp bài tự động</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-8 text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">📊 Kết quả</h1>
          <div className={`text-6xl font-bold my-4 ${score.percent >= 80 ? 'text-green-600' : score.percent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {score.percent}%
          </div>
          <p className="text-gray-600 text-lg">Đúng {score.correct}/{score.total} câu</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-400">
            <span>⏱️ {formatTime(timeSpent)}</span>
            <span>📌 {mode === 'exam' ? 'Thi thử' : 'Luyện tập'}</span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            <button onClick={handleShare} disabled={sharing}
              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
              {sharing ? '⏳' : '🔗'} Chia sẻ
            </button>
            <button onClick={handleDownloadPDF}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">
              📄 Tải PDF
            </button>
            <button onClick={() => { setShowResult(false); setCurrent(0); setAnswers({}); setMode(null); setExplanations({}); }}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-600 transition">
              🔄 Làm lại
            </button>
            <button onClick={() => navigate('/')}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              🏠 Trang chủ
            </button>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="mt-4 bg-blue-50 rounded-lg p-3 text-left">
              <p className="text-xs text-gray-500 mb-1">Link chia sẻ:</p>
              <div className="flex gap-2">
                <input value={shareUrl} readOnly className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1" />
                <button onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review answers with AI explanations */}
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
              answers[i] === q.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className="font-medium text-gray-800">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {q.options?.map((opt, j) => (
                  <div key={j} className={`text-sm px-3 py-2 rounded-lg ${
                    opt.startsWith(q.correct) ? 'bg-green-200 text-green-800 font-medium' :
                    opt.startsWith(answers[i]) && answers[i] !== q.correct ? 'bg-red-200 text-red-800 line-through' :
                    'bg-white text-gray-600'
                  }`}>
                    {opt}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <p className="text-sm text-gray-500 mt-2">💡 {q.explanation}</p>
              )}

              {/* AI Explanation button */}
              <button
                onClick={() => handleExplain(i)}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                {explaining === i && !explanations[i] ? '⏳ Đang tạo...' : '🤖 Giải thích chi tiết bằng AI'}
              </button>
              {explanations[i] && explaining === i && (
                <div className="mt-2 bg-purple-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line border border-purple-100">
                  {explanations[i]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Flashcard reminder */}
        {score.correct < score.total && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🃏</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {score.total - score.correct} câu sai đã được thêm vào Flashcard!
              </p>
              <p className="text-xs text-amber-600">Ôn tập ngay để nhớ lâu hơn</p>
            </div>
            <button onClick={() => navigate('/flashcards')}
              className="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-amber-600 transition">
              Ôn ngay →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Quiz question screen
  const q = questions[current];
  const timerColor = mode === 'exam' && timeLeft < 60 ? 'text-red-600' : 'text-gray-700';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {quiz.subject} — {quiz.topic}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              mode === 'exam' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {mode === 'exam' ? '⏱️ Thi thử' : '📝 Luyện tập'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Câu {current + 1}/{questions.length}</span>
            {mode === 'exam' && (
              <div className={`text-lg font-bold font-mono ${timerColor}`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className={`h-2 rounded-full transition-all ${mode === 'exam' ? 'bg-purple-500' : 'bg-blue-500'}`}
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question map (mini navigation) */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                i === current
                  ? 'bg-blue-500 text-white'
                  : answers[i]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <p className="text-gray-800 text-lg sm:text-xl mb-6 leading-relaxed">{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.charAt(0))}
              className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition text-[15px] sm:text-base quiz-option-btn ${
                answers[current] === opt.charAt(0)
                  ? mode === 'exam' ? 'border-purple-500 bg-purple-50 font-medium' : 'border-blue-500 bg-blue-50 font-medium'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            ← Câu trước
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(current + 1)}
              className={`text-white px-6 py-2 rounded-lg transition ${
                mode === 'exam' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Câu tiếp →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
            >
              Nộp bài ✅
            </button>
          )}
        </div>

        {/* Answer count */}
        <div className="text-center mt-4 text-xs text-gray-400">
          Đã trả lời: {Object.keys(answers).length}/{questions.length} câu
        </div>
      </div>
    </div>
  );
}
