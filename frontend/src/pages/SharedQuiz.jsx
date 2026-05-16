import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function SharedQuiz() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [userName, setUserName] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [code]);

  const fetchQuiz = async () => {
    try {
      const { data } = await axios.get(`/api/quiz/shared/${code}`);
      setQuiz(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option) => {
    setAnswers({ ...answers, [current]: option });
  };

  const handleSubmit = async () => {
    const questions = quiz.questions;
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    const percent = Math.round(correct / questions.length * 100);

    try {
      await axios.post(`/api/quiz/shared/${code}/attempt`, {
        answers, score: correct, total: questions.length, percent, userName
      });
    } catch (err) {
      console.error(err);
    }

    setShowResult(true);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Đang tải...</div>;
  if (!quiz) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🔗</div>
      <p className="text-gray-500">Quiz không tồn tại hoặc đã bị xóa</p>
    </div>
  );

  const questions = quiz.questions;

  // Start screen
  if (!started) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{quiz.subject} — {quiz.topic}</h1>
          <p className="text-sm text-gray-500 mb-1">Độ khó: {quiz.difficulty} | {questions.length} câu hỏi</p>
          <p className="text-xs text-gray-400 mb-6">Tạo bởi: {quiz.creatorName} | Đã làm: {quiz.attemptCount} lần</p>

          <div className="mb-4">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập tên của bạn (tùy chọn)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition"
          >
            Bắt đầu làm bài →
          </button>

          <button onClick={() => navigate('/')} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Results
  if (showResult) {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const percent = Math.round(correct / questions.length * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-8 text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">📊 Kết quả</h1>
          <div className={`text-6xl font-bold my-4 ${percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {percent}%
          </div>
          <p className="text-gray-600">Đúng {correct}/{questions.length} câu</p>
          {userName && <p className="text-sm text-gray-400 mt-1">👤 {userName}</p>}
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
              answers[i] === q.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className="font-medium text-gray-800">{i + 1}. {q.question}</p>
              <p className="text-sm mt-1">
                Bạn chọn: <span className={answers[i] === q.correct ? 'text-green-600 font-medium' : 'text-red-600'}>
                  {answers[i] || 'Chưa chọn'}
                </span>
              </p>
              <p className="text-sm text-green-600">Đáp án: {q.correct}</p>
              {q.explanation && <p className="text-sm text-gray-500 mt-1">💡 {q.explanation}</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 justify-center">
          <button onClick={() => { setShowResult(false); setCurrent(0); setAnswers({}); }}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
            Làm lại
          </button>
          <button onClick={() => navigate('/')}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-sm font-semibold text-gray-700">
            {quiz.subject} — {quiz.topic}
          </h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            Câu {current + 1}/{questions.length}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        <p className="text-gray-800 text-lg mb-6">{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.charAt(0))}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${
                answers[current] === opt.charAt(0)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-30">
            ← Câu trước
          </button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(current + 1)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
              Câu tiếp →
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">
              Nộp bài ✅
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
