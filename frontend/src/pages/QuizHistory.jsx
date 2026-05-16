import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function QuizHistory({ token }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { (async () => { try { const { data } = await axios.get('/api/quiz/attempts/history', { headers: { Authorization: `Bearer ${token}` } }); setHistory(data); } catch (e) { console.error(e); } finally { setLoading(false); } })(); }, []);

  const filtered = filter === 'all' ? history : history.filter(h => h.mode === filter);
  const getScoreColor = (p) => p >= 80 ? 'text-green-600 bg-green-50' : p >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  const getEmoji = (p) => p >= 90 ? '🏆' : p >= 80 ? '⭐' : p >= 60 ? '👍' : p >= 40 ? '😐' : '😅';
  const fmtTime = (s) => { if (!s) return '—'; return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">📊</div><p className="text-gray-400">Đang tải...</p></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">📊 Lịch sử bài làm</h1>

      {/* Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl">⚡</div>
              <div><p className="text-2xl font-bold text-gray-900">{history.length}</p><p className="text-sm text-gray-500">Tổng lần làm</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🎯</div>
              <div><p className="text-2xl font-bold text-gray-900">{Math.round(history.reduce((s, h) => s + h.percent, 0) / history.length)}%</p><p className="text-sm text-gray-500">Điểm TB</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">🏆</div>
              <div><p className="text-2xl font-bold text-gray-900">{Math.max(...history.map(h => h.percent))}%</p><p className="text-sm text-gray-500">Cao nhất</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">⏱️</div>
              <div><p className="text-2xl font-bold text-gray-900">{history.filter(h => h.mode === 'exam').length}</p><p className="text-sm text-gray-500">Lần thi thử</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {history.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 mb-3">📈 Tiến bộ theo thời gian</h3>
          <div className="flex items-end gap-1.5 h-24">
            {[...history].reverse().slice(-15).map((h, i) => (
              <div key={i} className="flex-1 rounded-lg min-w-[14px] transition-all" style={{ height: `${Math.max(h.percent, 5)}%` }} title={`${h.subject}: ${h.percent}%`}>
                <div className={`w-full h-full rounded-lg ${h.percent >= 80 ? 'bg-gradient-to-t from-green-400 to-green-300' : h.percent >= 50 ? 'bg-gradient-to-t from-amber-400 to-amber-300' : 'bg-gradient-to-t from-red-400 to-red-300'}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[{ id: 'all', label: 'Tất cả' }, { id: 'practice', label: '📝 Luyện tập' }, { id: 'exam', label: '⏱️ Thi thử' }].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{tab.label}</button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-500 text-base">Chưa có lịch sử</p>
          <button onClick={() => navigate('/create')} className="mt-4 text-indigo-600 text-base font-bold hover:underline">Tạo quiz →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h, i) => (
            <div key={i} onClick={() => navigate(`/quiz/${h.quiz_id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition cursor-pointer active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900">{h.subject} — {h.topic}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.mode === 'exam' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{h.mode === 'exam' ? '⏱️ Thi' : '📝 Luyện'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>🎯 {h.score}/{h.total}</span>
                    <span>⏱️ {fmtTime(h.time_spent)}</span>
                    <span>{new Date(h.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl font-bold text-xl ${getScoreColor(h.percent)}`}>{getEmoji(h.percent)} {h.percent}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
