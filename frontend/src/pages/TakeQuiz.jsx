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
  const [mode, setMode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [explaining, setExplaining] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => { fetchQuiz(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [id]);

  const fetchQuiz = async () => {
    try { const { data } = await axios.get(`/api/quiz/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setQuiz(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const startExam = (m) => {
    setMode(m); startTimeRef.current = Date.now();
    if (m === 'exam') {
      const t = (quiz?.questions?.length || 10) * 60; setTimeLeft(t);
      timerRef.current = setInterval(() => { setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; } return p - 1; }); }, 1000);
    }
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeSpent(elapsed); setShowResult(true);
    const qs = quiz.questions; let correct = 0;
    qs.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const percent = Math.round(correct / qs.length * 100);
    try { await axios.post(`/api/quiz/${id}/attempt`, { answers, score: correct, total: qs.length, percent, timeSpent: elapsed, mode }, { headers: { Authorization: `Bearer ${token}` } }); }
    catch (err) { console.error(err); }
  };

  const handleExplain = async (qi) => {
    if (explanations[qi]) { setExplaining(explaining === qi ? null : qi); return; }
    setExplaining(qi);
    try { const { data } = await axios.post(`/api/quiz/${id}/explain`, { questionIndex: qi }, { headers: { Authorization: `Bearer ${token}` } }); setExplanations(p => ({ ...p, [qi]: data.explanation })); }
    catch { setExplanations(p => ({ ...p, [qi]: 'Không thể tạo giải thích.' })); }
  };

  const handleShare = async () => { setSharing(true); try { const { data } = await axios.post(`/api/quiz/${id}/share`, {}, { headers: { Authorization: `Bearer ${token}` } }); setShareUrl(`${window.location.origin}${data.shareUrl}`); } catch (e) { console.error(e); } finally { setSharing(false); } };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getScore = () => {
    if (!quiz) return { correct: 0, total: 0, percent: 0 };
    let correct = 0; quiz.questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    return { correct, total: quiz.questions.length, percent: Math.round(correct / quiz.questions.length * 100) };
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">📝</div><p className="text-gray-400">Đang tải...</p></div>
    </div>
  );
  if (!quiz) return <div className="text-center py-16 text-gray-500 text-lg">Không tìm thấy đề thi</div>;

  const questions = quiz.questions;
  const score = showResult ? getScore() : null;

  // ─── Mode selection ───
  if (mode === null) return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">📝</div>
        <h1 className="text-2xl font-bold text-gray-900">{quiz.subject}</h1>
        <p className="text-lg text-gray-600 mt-1">{quiz.topic}</p>
        <p className="text-base text-gray-400 mt-2">Độ khó: {quiz.difficulty} · {questions.length} câu hỏi</p>
      </div>
      <div className="space-y-4">
        <button onClick={() => startExam('practice')}
          className="w-full bg-white rounded-2xl border-2 border-gray-100 p-6 text-left hover:border-indigo-300 hover:shadow-lg transition active:scale-[0.98] group">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition">📝</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Luyện tập</h3>
              <p className="text-base text-gray-500 mt-1">Không giới hạn thời gian, xem đáp án ngay</p>
            </div>
            <span className="text-2xl text-gray-300">→</span>
          </div>
        </button>
        <button onClick={() => startExam('exam')}
          className="w-full bg-white rounded-2xl border-2 border-gray-100 p-6 text-left hover:border-purple-300 hover:shadow-lg transition active:scale-[0.98] group">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition">⏱️</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Thi thử</h3>
              <p className="text-base text-gray-500 mt-1">Đếm ngược {questions.length} phút, nộp bài tự động</p>
            </div>
            <span className="text-2xl text-gray-300">→</span>
          </div>
        </button>
      </div>
    </div>
  );

  // ─── Results ───
  if (showResult) {
    const pct = score.percent;
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Score card */}
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center mb-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">📊 Kết quả</h1>
          <div className={`text-7xl font-extrabold my-4 ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</div>
          <p className="text-xl text-gray-600">Đúng {score.correct}/{score.total} câu</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-base text-gray-400">
            <span>⏱️ {formatTime(timeSpent)}</span>
            <span>·</span>
            <span>{mode === 'exam' ? '⏱️ Thi thử' : '📝 Luyện tập'}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <button onClick={handleShare} disabled={sharing} className="bg-indigo-500 text-white px-5 py-3 rounded-xl text-base font-bold hover:bg-indigo-600 transition active:scale-[0.98]">{sharing ? '⏳' : '🔗'} Chia sẻ</button>
            <button onClick={() => { setShowResult(false); setCurrent(0); setAnswers({}); setMode(null); setExplanations({}); }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-3 rounded-xl text-base font-bold hover:shadow-lg transition active:scale-[0.98]">🔄 Làm lại</button>
            <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-600 px-5 py-3 rounded-xl text-base font-bold hover:bg-gray-200 transition">🏠 Trang chủ</button>
          </div>

          {shareUrl && (
            <div className="mt-4 bg-indigo-50 rounded-2xl p-4 text-left">
              <p className="text-sm text-gray-600 mb-2">Link chia sẻ:</p>
              <div className="flex gap-2">
                <input value={shareUrl} readOnly className="flex-1 text-sm bg-white border border-indigo-200 rounded-xl px-3 py-2.5" />
                <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold">Copy</button>
              </div>
            </div>
          )}
        </div>

        {/* Review */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">📋 Chi tiết đáp án</h2>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className={`rounded-2xl p-5 ${answers[i] === q.correct ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <p className="text-base font-bold text-gray-900 mb-3">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {q.options?.map((opt, j) => (
                  <div key={j} className={`text-sm px-3 py-2.5 rounded-xl ${opt.startsWith(q.correct) ? 'bg-green-200 text-green-800 font-bold' : opt.startsWith(answers[i]) && answers[i] !== q.correct ? 'bg-red-200 text-red-800 line-through' : 'bg-white text-gray-600'}`}>{opt}</div>
                ))}
              </div>
              {q.explanation && <p className="text-sm text-gray-500 mt-2">💡 {q.explanation}</p>}
              <button onClick={() => handleExplain(i)} className="mt-2 text-sm text-purple-600 font-bold flex items-center gap-1">
                {explaining === i && !explanations[i] ? '⏳ Đang tạo...' : '🤖 Giải thích chi tiết'}
              </button>
              {explanations[i] && explaining === i && (
                <div className="mt-3 bg-purple-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line border border-purple-100">{explanations[i]}</div>
              )}
            </div>
          ))}
        </div>

        {score.correct < score.total && (
          <div className="mt-5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-amber-200/50">
            <span className="text-4xl">🃏</span>
            <div className="flex-1">
              <p className="text-white font-bold text-base">{score.total - score.correct} câu sai → Flashcard!</p>
              <p className="text-amber-100 text-sm">Ôn ngay để nhớ lâu hơn</p>
            </div>
            <button onClick={() => navigate('/flashcards')} className="bg-white text-amber-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md">Ôn ngay</button>
          </div>
        )}
      </div>
    );
  }

  // ─── Question screen ───
  const q = questions[current];
  const isExam = mode === 'exam';
  const timerWarn = isExam && timeLeft < 60;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="bg-white rounded-3xl shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{quiz.subject}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${isExam ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isExam ? '⏱️ Thi thử' : '📝 Luyện tập'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-base text-gray-500 font-medium">Câu {current + 1}/{questions.length}</p>
            {isExam && <p className={`text-2xl font-bold font-mono ${timerWarn ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>⏱️ {formatTime(timeLeft)}</p>}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div className={`h-3 rounded-full transition-all ${isExam ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Question map */}
        <div className="flex flex-wrap gap-2 mb-5">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition ${i === current ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : answers[i] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</button>
          ))}
        </div>

        {/* Question */}
        <p className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">{q.question}</p>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => setAnswers({ ...answers, [current]: opt.charAt(0) })}
              className={`w-full text-left p-5 rounded-2xl border-2 transition text-lg quiz-option-btn ${answers[current] === opt.charAt(0) ? (isExam ? 'border-purple-500 bg-purple-50 font-bold' : 'border-indigo-500 bg-indigo-50 font-bold') : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between mt-8">
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
            className="text-gray-500 text-lg font-medium disabled:opacity-30 px-4 py-2">← Trước</button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(current + 1)}
              className={`text-white px-8 py-3 rounded-xl text-lg font-bold transition active:scale-[0.98] ${isExam ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}>Tiếp →</button>
          ) : (
            <button onClick={handleSubmit}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl text-lg font-bold hover:shadow-lg transition active:scale-[0.98]">Nộp bài ✅</button>
          )}
        </div>

        <p className="text-center mt-4 text-sm text-gray-400">Đã trả lời: {Object.keys(answers).length}/{questions.length} câu</p>
      </div>
    </div>
  );
}
