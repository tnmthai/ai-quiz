import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchQuiz();
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

  const handleAnswer = (option) => {
    setAnswers({ ...answers, [current]: option });
  };

  const handleSubmit = () => {
    setShowResult(true);
  };

  const getScore = () => {
    if (!quiz) return 0;
    const questions = quiz.questions;
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    return { correct, total: questions.length, percent: Math.round(correct / questions.length * 100) };
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Đang tải...</div>;
  if (!quiz) return <div className="text-center py-12 text-gray-500">Không tìm thấy đề thi</div>;

  const questions = quiz.questions;
  const score = showResult ? getScore() : null;

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">📊 Kết quả</h1>
          <div className="text-6xl font-bold text-indigo-600 my-6">{score.percent}%</div>
          <p className="text-gray-600 text-lg">
            Đúng {score.correct}/{score.total} câu
          </p>

          <div className="mt-8 space-y-4 text-left">
            {questions.map((q, i) => (
              <div key={i} className={`p-4 rounded-lg ${
                answers[i] === q.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              } border`}>
                <p className="font-medium text-gray-800">{i + 1}. {q.question}</p>
                <p className="text-sm mt-1">
                  Bạn chọn: <span className={answers[i] === q.correct ? 'text-green-600' : 'text-red-600'}>
                    {answers[i] || 'Chưa chọn'}
                  </span>
                </p>
                <p className="text-sm text-green-600">Đáp án: {q.correct}</p>
                {q.explanation && <p className="text-sm text-gray-500 mt-1">💡 {q.explanation}</p>}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8 justify-center">
            <button onClick={() => { setShowResult(false); setCurrent(0); setAnswers({}); }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Làm lại
            </button>
            <button onClick={() => navigate('/')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {quiz.subject} — {quiz.topic}
          </h1>
          <span className="text-sm text-gray-500">
            Câu {current + 1}/{questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        <p className="text-gray-800 text-lg mb-6">{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.charAt(0) === '.' || opt.length === 1 ? opt : opt.charAt(0))}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${
                answers[current] === opt.charAt(0)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

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
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Câu tiếp →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Nộp bài ✅
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
