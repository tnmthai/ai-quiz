import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Flashcards({ token }) {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('due'); // 'due' | 'all'
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    fetchFlashcards();
  }, [mode]);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const endpoint = mode === 'due' ? '/api/quiz/flashcards/due' : '/api/quiz/flashcards/all';
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlashcards(data);
      setCurrent(0);
      setFlipped(false);
      setCompleted(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (quality) => {
    const fc = flashcards[current];
    try {
      await axios.put(`/api/quiz/flashcards/${fc.id}/review`, { quality }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }

    setCompleted(prev => prev + 1);
    setFlipped(false);

    if (current < flashcards.length - 1) {
      setCurrent(prev => prev + 1);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/quiz/flashcards/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlashcards(prev => prev.filter(f => f.id !== id));
      if (current >= flashcards.length - 1) setCurrent(Math.max(0, flashcards.length - 2));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const allDone = current >= flashcards.length - 1 && completed > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-800">🃏 Flashcard Ôn Tập</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'due' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Đến hạn
          </button>
          <button
            onClick={() => setMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${flashcards.length > 0 ? (completed / flashcards.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{completed}/{flashcards.length}</span>
      </div>

      {flashcards.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {mode === 'due' ? 'Không có flashcard đến hạn!' : 'Chưa có flashcard nào'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {mode === 'due'
              ? 'Làm quiz và trả lời sai sẽ tự động tạo flashcard'
              : 'Hãy làm quiz trước để tạo flashcard từ câu sai'}
          </p>
          <button
            onClick={() => navigate('/create')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
          >
            Tạo Quiz mới →
          </button>
        </div>
      ) : allDone ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-3">🎊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Hoàn thành!</h2>
          <p className="text-sm text-gray-500 mb-4">Bạn đã ôn xong {completed} flashcard</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchFlashcards}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition">
              Ôn lại
            </button>
            <button onClick={() => navigate('/')}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">
              Về trang chủ
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Flashcard */}
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[320px] cursor-pointer perspective-1000"
            onClick={() => setFlipped(!flipped)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {flashcards[current]?.subject} — {flashcards[current]?.topic}
              </span>
              <span className="text-xs text-gray-400">{current + 1}/{flashcards.length}</span>
            </div>

            {!flipped ? (
              <div className="flex flex-col items-center justify-center h-[200px]">
                <div className="text-3xl mb-4">❓</div>
                <p className="text-lg font-medium text-gray-800 text-center px-4">
                  {flashcards[current]?.question}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-md">
                  {flashcards[current]?.options?.map((opt, i) => (
                    <div key={i} className="text-sm px-3 py-2 bg-gray-50 rounded-lg text-gray-600 text-center">
                      {opt}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">Nhấn để xem đáp án</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px]">
                <div className="text-3xl mb-4">✅</div>
                <p className="text-2xl font-bold text-green-600 mb-3">
                  Đáp án: {flashcards[current]?.correct_answer}
                </p>
                {flashcards[current]?.explanation && (
                  <p className="text-sm text-gray-600 text-center px-4">
                    💡 {flashcards[current].explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Review buttons */}
          {flipped && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <button onClick={() => handleReview(1)}
                className="bg-red-50 text-red-600 py-3 rounded-xl text-sm font-medium hover:bg-red-100 transition border border-red-100">
                😵 Quên
              </button>
              <button onClick={() => handleReview(3)}
                className="bg-amber-50 text-amber-600 py-3 rounded-xl text-sm font-medium hover:bg-amber-100 transition border border-amber-100">
                😐 Khó
              </button>
              <button onClick={() => handleReview(4)}
                className="bg-blue-50 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition border border-blue-100">
                😊 Nhớ
              </button>
              <button onClick={() => handleReview(5)}
                className="bg-green-50 text-green-600 py-3 rounded-xl text-sm font-medium hover:bg-green-100 transition border border-green-100">
                🤩 Dễ
              </button>
            </div>
          )}

          {/* Skip & Delete */}
          <div className="mt-3 flex justify-between">
            <button
              onClick={() => { setFlipped(false); setCurrent(prev => Math.min(prev + 1, flashcards.length - 1)); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Bỏ qua →
            </button>
            <button
              onClick={() => handleDelete(flashcards[current]?.id)}
              className="text-xs text-red-400 hover:text-red-600 transition"
            >
              🗑️ Xóa flashcard này
            </button>
          </div>
        </>
      )}
    </div>
  );
}
