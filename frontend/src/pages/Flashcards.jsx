import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Flashcards({ token }) {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('due');
  const [completed, setCompleted] = useState(0);

  useEffect(() => { fetchFlashcards(); }, [mode]);

  const fetchFlashcards = async () => {
    setLoading(true);
    try { const { data } = await axios.get(mode === 'due' ? '/api/quiz/flashcards/due' : '/api/quiz/flashcards/all', { headers: { Authorization: `Bearer ${token}` } }); setFlashcards(data); setCurrent(0); setFlipped(false); setCompleted(0); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleReview = async (quality) => {
    const fc = flashcards[current];
    try { await axios.put(`/api/quiz/flashcards/${fc.id}/review`, { quality }, { headers: { Authorization: `Bearer ${token}` } }); } catch (e) { console.error(e); }
    setCompleted(p => p + 1); setFlipped(false);
    if (current < flashcards.length - 1) setCurrent(p => p + 1);
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`/api/quiz/flashcards/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setFlashcards(p => p.filter(f => f.id !== id)); if (current >= flashcards.length - 1) setCurrent(Math.max(0, flashcards.length - 2)); }
    catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">🃏</div><p className="text-gray-400">Đang tải...</p></div>
    </div>
  );

  const allDone = completed > 0 && current >= flashcards.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🃏 Flashcard</h1>
        <div className="flex gap-2">
          <button onClick={() => setMode('due')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === 'due' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Đến hạn</button>
          <button onClick={() => setMode('all')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Tất cả</button>
        </div>
      </div>

      {/* Progress */}
      {flashcards.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-gray-200 rounded-full h-3"><div className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full transition-all" style={{ width: `${(completed / flashcards.length) * 100}%` }} /></div>
          <span className="text-sm font-bold text-gray-500">{completed}/{flashcards.length}</span>
        </div>
      )}

      {flashcards.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{mode === 'due' ? 'Không có thẻ đến hạn!' : 'Chưa có flashcard'}</h2>
          <p className="text-base text-gray-500 mb-5">{mode === 'due' ? 'Làm quiz và trả lời sai sẽ tự tạo flashcard' : 'Hãy làm quiz trước'}</p>
          <button onClick={() => navigate('/create')} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl text-base font-bold hover:shadow-lg">Tạo Quiz →</button>
        </div>
      ) : allDone ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="text-6xl mb-4">🎊</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Hoàn thành!</h2>
          <p className="text-base text-gray-500 mb-5">Đã ôn xong {completed} flashcard</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchFlashcards} className="bg-indigo-500 text-white px-6 py-3 rounded-xl text-base font-bold">Ôn lại</button>
            <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl text-base font-bold">Trang chủ</button>
          </div>
        </div>
      ) : (
        <>
          {/* Card */}
          <div onClick={() => setFlipped(!flipped)} className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 min-h-[360px] cursor-pointer active:scale-[0.99] transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{flashcards[current]?.subject} — {flashcards[current]?.topic}</span>
              <span className="text-sm font-bold text-gray-400">{current + 1}/{flashcards.length}</span>
            </div>
            {!flipped ? (
              <div className="flex flex-col items-center justify-center h-[220px]">
                <div className="text-5xl mb-4">❓</div>
                <p className="text-xl font-bold text-gray-900 text-center px-4 leading-relaxed">{flashcards[current]?.question}</p>
                <div className="mt-5 grid grid-cols-2 gap-2 w-full max-w-md">
                  {flashcards[current]?.options?.map((opt, i) => (
                    <div key={i} className="text-base px-4 py-3 bg-gray-50 rounded-xl text-gray-600 text-center font-medium">{opt}</div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-5">👆 Nhấn để xem đáp án</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px]">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-3xl font-extrabold text-green-600 mb-3">Đáp án: {flashcards[current]?.correct_answer}</p>
                {flashcards[current]?.explanation && <p className="text-base text-gray-600 text-center px-4">💡 {flashcards[current].explanation}</p>}
              </div>
            )}
          </div>

          {/* Review buttons */}
          {flipped && (
            <div className="mt-5 grid grid-cols-4 gap-2 flashcard-review-btns">
              <button onClick={() => handleReview(1)} className="bg-red-50 text-red-600 py-4 rounded-2xl text-base font-bold hover:bg-red-100 transition border-2 border-red-100 active:scale-[0.97]">😵 Quên</button>
              <button onClick={() => handleReview(3)} className="bg-amber-50 text-amber-600 py-4 rounded-2xl text-base font-bold hover:bg-amber-100 transition border-2 border-amber-100 active:scale-[0.97]">😐 Khó</button>
              <button onClick={() => handleReview(4)} className="bg-blue-50 text-blue-600 py-4 rounded-2xl text-base font-bold hover:bg-blue-100 transition border-2 border-blue-100 active:scale-[0.97]">😊 Nhớ</button>
              <button onClick={() => handleReview(5)} className="bg-green-50 text-green-600 py-4 rounded-2xl text-base font-bold hover:bg-green-100 transition border-2 border-green-100 active:scale-[0.97]">🤩 Dễ</button>
            </div>
          )}

          <div className="mt-3 flex justify-between">
            <button onClick={() => { setFlipped(false); setCurrent(p => Math.min(p + 1, flashcards.length - 1)); }} className="text-sm text-gray-400 hover:text-gray-600 font-medium">Bỏ qua →</button>
            <button onClick={() => handleDelete(flashcards[current]?.id)} className="text-sm text-red-400 hover:text-red-600 font-medium">🗑️ Xóa</button>
          </div>
        </>
      )}
    </div>
  );
}
