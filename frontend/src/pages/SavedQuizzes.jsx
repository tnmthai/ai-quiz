import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function SavedQuizzes({ token }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const { data } = await axios.get('/api/quiz/my-quizzes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(data);
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [token]);

  const handleDelete = async (id) => {
    if (!confirm('Xóa đề thi này?')) return;
    try {
      await axios.delete(`/api/quiz/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  const handleDownload = async (id, subject) => {
    try {
      const resp = await fetch(`/api/quiz/${id}/word`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `de-thi-${subject}-${id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi tải file: ' + err.message);
    }
  };

  const sourceLabels = {
    ai: '✨ AI',
    file: '📁 File',
    matrix: '📋 Ma trận',
    'md-to-word': '📝 MD→Word',
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="text-center text-gray-400 py-12">⏳ Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-800">💾 Đề đã lưu</h1>
        <span className="text-sm text-gray-400">{quizzes.length} đề thi</span>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 text-sm">Chưa có đề thi nào</p>
          <button
            onClick={() => navigate('/create')}
            className="mt-3 text-blue-500 text-sm hover:underline"
          >
            Tạo đề mới →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {quiz.subject} — {quiz.topic}
                    </h3>
                    <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {sourceLabels[quiz.source] || quiz.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>📊 {quiz.difficulty}</span>
                    <span>📝 {quiz.type === 'multiple_choice' ? 'Trắc nghiệm' : quiz.type}</span>
                    <span>🕐 {new Date(quiz.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(quiz.id, quiz.subject)}
                    className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                    title="Tải Word"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="bg-red-50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 hover:text-red-600 transition"
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
