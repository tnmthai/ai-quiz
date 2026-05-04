import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SUBJECTS = ['Toán', 'Lý', 'Hóa', 'Văn', 'Anh', 'Sử', 'Địa', 'Sinh'];

export default function CreateQuiz({ token }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('Toán');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return setError('Vui lòng nhập chủ đề');

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('/api/quiz/generate',
        { subject, topic, count, difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/quiz/${data.quiz.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi tạo đề thi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">✨ Tạo đề thi bằng AI</h1>

      <form onSubmit={handleGenerate} className="bg-white rounded-xl shadow-md p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  subject === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: Phương trình bậc 2, Động lực học vật rắn..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số câu hỏi</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              {[5, 10, 15, 20, 30, 50].map(n => (
                <option key={n} value={n}>{n} câu</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              AI đang tạo câu hỏi...
            </span>
          ) : '🚀 Tạo đề thi'}
        </button>
      </form>
    </div>
  );
}
