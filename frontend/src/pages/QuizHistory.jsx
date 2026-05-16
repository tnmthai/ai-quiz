import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function QuizHistory({ token }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'exam' | 'practice'

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get('/api/quiz/attempts/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? history : history.filter(h => h.mode === filter);

  const getScoreColor = (percent) => {
    if (percent >= 80) return 'text-green-600 bg-green-50';
    if (percent >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreEmoji = (percent) => {
    if (percent >= 90) return '🏆';
    if (percent >= 80) return '⭐';
    if (percent >= 60) return '👍';
    if (percent >= 40) return '😐';
    return '😅';
  };

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-800">📊 Lịch sử bài làm</h1>
        <span className="text-sm text-gray-400">{filtered.length} lần làm</span>
      </div>

      {/* Stats summary */}
      {history.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{history.length}</div>
            <div className="text-xs text-gray-500">Tổng lần làm</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-green-600">
              {Math.round(history.reduce((s, h) => s + h.percent, 0) / history.length)}%
            </div>
            <div className="text-xs text-gray-500">Điểm TB</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-purple-600">
              {Math.max(...history.map(h => h.percent))}%
            </div>
            <div className="text-xs text-gray-500">Cao nhất</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-amber-600">
              {history.filter(h => h.mode === 'exam').length}
            </div>
            <div className="text-xs text-gray-500">Lần thi</div>
          </div>
        </div>
      )}

      {/* Progress chart (simple bar) */}
      {history.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 Tiến bộ theo thời gian</h3>
          <div className="flex items-end gap-1 h-24">
            {[...history].reverse().slice(-15).map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all min-w-[8px]"
                style={{ height: `${h.percent}%` }}
                title={`${h.subject}: ${h.percent}%`}
              >
                <div
                  className={`w-full h-full rounded-t ${
                    h.percent >= 80 ? 'bg-green-400' :
                    h.percent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'practice', label: '📝 Luyện tập' },
          { id: 'exam', label: '⏱️ Thi thử' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 text-sm">Chưa có lịch sử bài làm</p>
          <button
            onClick={() => navigate('/create')}
            className="mt-3 text-blue-500 text-sm hover:underline"
          >
            Tạo quiz mới →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((h, i) => (
            <div
              key={i}
              onClick={() => navigate(`/quiz/${h.quiz_id}`)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {h.subject} — {h.topic}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      h.mode === 'exam' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {h.mode === 'exam' ? '⏱️ Thi' : '📝 Luyện'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>🎯 {h.score}/{h.total} câu</span>
                    <span>⏱️ {formatTime(h.time_spent)}</span>
                    <span>🕐 {new Date(h.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-xl font-bold text-lg ${getScoreColor(h.percent)}`}>
                  {getScoreEmoji(h.percent)} {h.percent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
