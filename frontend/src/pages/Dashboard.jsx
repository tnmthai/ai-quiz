import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard({ token, user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/quiz/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data);
    } catch {
      try {
        const { data } = await axios.get('/api/quiz/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(data);
      } catch (e) { console.error(e); }
    } finally {
      setLoading(false);
    }
  };

  const coins = user?.coins ?? stats?.coins ?? 0;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-3">🤖</div>
          <p className="text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      {/* ─── Hero greeting ─── */}
      <div className="mb-6">
        <p className="text-gray-500 text-base">{greeting} 👋</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
          {user?.name || 'Bạn'} ơi, học gì hôm nay?
        </h1>
      </div>

      {/* ─── Coin banner (low balance) ─── */}
      {coins < 3 && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 shadow-lg shadow-amber-200/50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🪙</span>
            <div>
              <p className="text-white font-bold text-base">Còn {coins} coin</p>
              <p className="text-amber-100 text-sm">Nạp thêm để tạo đề không giới hạn</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/topup')}
            className="bg-white text-amber-600 px-5 py-2.5 rounded-xl text-base font-bold hover:bg-amber-50 transition shadow-md"
          >
            Nạp
          </button>
        </div>
      )}

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">📝</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalQuizzes ?? 0}</p>
              <p className="text-sm text-gray-500">Đề đã tạo</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🎯</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgScore ?? 0}%</p>
              <p className="text-sm text-gray-500">Điểm TB</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">⚡</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalAttempts ?? 0}</p>
              <p className="text-sm text-gray-500">Lần làm bài</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition" onClick={() => navigate('/flashcards')}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">🃏</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.dueFlashcards ?? 0}</p>
              <p className="text-sm text-gray-500">Thẻ đến hạn</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Progress chart ─── */}
      {stats?.recentAttempts?.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 mb-3">📈 Tiến bộ gần đây</h3>
          <div className="flex items-end gap-1.5 h-20">
            {[...stats.recentAttempts].reverse().map((a, i) => (
              <div
                key={i}
                className="flex-1 rounded-lg transition-all min-w-[16px]"
                style={{ height: `${Math.max(a.percent, 8)}%` }}
                title={`${a.subject}: ${a.percent}%`}
              >
                <div className={`w-full h-full rounded-lg ${
                  a.percent >= 80 ? 'bg-gradient-to-t from-green-400 to-green-300' :
                  a.percent >= 50 ? 'bg-gradient-to-t from-amber-400 to-amber-300' :
                  'bg-gradient-to-t from-red-400 to-red-300'
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick actions ─── */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">⚡ Tạo đề nhanh</h2>

      <div className="space-y-3 mb-6">
        {/* AI Create */}
        <button
          onClick={() => navigate('/create')}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-5 text-left hover:shadow-xl hover:shadow-indigo-200/50 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition">
              ✨
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Tạo đề bằng AI</h3>
              <p className="text-indigo-100 text-sm mt-0.5">Chọn môn, chuyên đề, AI tạo ngay</p>
            </div>
            <span className="text-white/70 text-2xl">→</span>
          </div>
        </button>

        {/* File Upload */}
        <button
          onClick={() => navigate('/create?source=file')}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-5 text-left hover:shadow-xl hover:shadow-cyan-200/50 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition">
              📁
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Tạo đề từ file</h3>
              <p className="text-cyan-100 text-sm mt-0.5">Upload Word/PDF, AI phân tích tạo đề</p>
            </div>
            <span className="text-white/70 text-2xl">→</span>
          </div>
        </button>

        {/* Matrix */}
        <button
          onClick={() => navigate('/create?source=matrix')}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 text-left hover:shadow-xl hover:shadow-emerald-200/50 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition">
              📋
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Tạo từ ma trận</h3>
              <p className="text-emerald-100 text-sm mt-0.5">Ma trận đặc tả GDPT 2018</p>
            </div>
            <span className="text-white/70 text-2xl">→</span>
          </div>
        </button>
      </div>

      {/* ─── Study tools ─── */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">📚 Học tập</h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/flashcards')}
          className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition active:scale-[0.98] relative"
        >
          {stats?.dueFlashcards > 0 && (
            <span className="absolute top-3 right-3 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {stats.dueFlashcards}
            </span>
          )}
          <div className="text-3xl mb-2">🃏</div>
          <h3 className="text-base font-bold text-gray-900">Flashcard</h3>
          <p className="text-sm text-gray-500 mt-1">Ôn câu đã sai</p>
        </button>

        <button
          onClick={() => navigate('/history')}
          className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-base font-bold text-gray-900">Lịch sử</h3>
          <p className="text-sm text-gray-500 mt-1">Xem tiến bộ</p>
        </button>

        <button
          onClick={() => navigate('/saved')}
          className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">💾</div>
          <h3 className="text-base font-bold text-gray-900">Đã lưu</h3>
          <p className="text-sm text-gray-500 mt-1">{stats?.totalQuizzes ?? 0} đề thi</p>
        </button>

        <button
          onClick={() => navigate('/topup')}
          className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">🪙</div>
          <h3 className="text-base font-bold text-gray-900">{coins} Coin</h3>
          <p className="text-sm text-gray-500 mt-1">Nạp thêm</p>
        </button>
      </div>

      {/* ─── Subject stats ─── */}
      {stats?.subjectStats?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 mb-3">📚 Điểm theo môn</h3>
          <div className="space-y-3">
            {stats.subjectStats.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{s.subject}</span>
                  <span className="text-gray-500">{s.avg_score}% · {s.count} lần</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      s.avg_score >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                      s.avg_score >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${s.avg_score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
