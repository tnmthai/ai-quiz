import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard({ token }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data } = await axios.get('/api/quiz/my-quizzes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (id) => {
    if (!confirm('Xóa đề thi này?')) return;
    try {
      await axios.delete(`/api/quiz/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📋 Đề thi của tôi</h1>
        <Link
          to="/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          ➕ Tạo đề thi mới
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Chưa có đề thi nào</p>
          <Link to="/create" className="text-indigo-600 hover:underline mt-2 inline-block">
            Tạo đề thi đầu tiên →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{quiz.subject}</h3>
                  <p className="text-gray-500 text-sm">{quiz.topic}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  quiz.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {quiz.difficulty}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  to={`/quiz/${quiz.id}`}
                  className="flex-1 text-center bg-indigo-50 text-indigo-600 py-2 rounded-lg hover:bg-indigo-100 text-sm"
                >
                  Làm bài
                </Link>
                <button
                  onClick={() => deleteQuiz(quiz.id)}
                  className="text-red-500 hover:text-red-700 px-3"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
