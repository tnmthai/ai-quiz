import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard({ token, user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/quiz/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(data);
      } catch (err) {
        // Fallback to basic stats
        try {
          const { data } = await axios.get('/api/quiz/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStats(data);
        } catch (e) {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const coins = user?.coins ?? stats?.coins ?? 0;

  const tools = [
    {
      id: 'ai-create',
      icon: '✨',
      title: 'Tạo đề bằng AI',
      desc: 'Tạo nhanh với AI',
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      hoverBorder: 'hover:border-indigo-200',
      action: () => navigate('/create'),
    },
    {
      id: 'file-reuse',
      icon: '📁',
      title: 'Tạo đề từ file',
      desc: 'Word/PDF có sẵn',
      bg: 'bg-cyan-50',
      iconBg: 'bg-cyan-100',
      hoverBorder: 'hover:border-cyan-200',
      action: () => navigate('/create?source=file'),
    },
    {
      id: 'matrix',
      icon: '📋',
      title: 'Tạo đề từ ma trận',
      desc: 'Ma trận GDPT 2018',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      hoverBorder: 'hover:border-emerald-200',
      action: () => navigate('/create?source=matrix'),
    },
    {
      id: 'flashcards',
      icon: '🃏',
      title: 'Flashcard ôn tập',
      desc: stats?.dueFlashcards > 0 ? `${stats.dueFlashcards} thẻ đến hạn` : 'Ôn câu đã sai',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      hoverBorder: 'hover:border-amber-200',
      action: () => navigate('/flashcards'),
      badge: stats?.dueFlashcards > 0 ? stats.dueFlashcards : null,
    },
    {
      id: 'history',
      icon: '📊',
      title: 'Lịch sử bài làm',
      desc: stats?.totalAttempts > 0 ? `${stats.totalAttempts} lần làm` : 'Xem tiến bộ',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      hoverBorder: 'hover:border-purple-200',
      action: () => navigate('/history'),
    },
  ];

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-3">
      {/* Coin balance banner */}
      {coins < 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0">🪙</span>
            <span className="text-xs text-amber-700 truncate">Còn <strong>{coins} coin</strong> — Nạp thêm?</span>
          </div>
          <button
            onClick={() => navigate('/topup')}
            className="bg-amber-500 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-amber-600 transition"
          >
            Nạp ngay
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4 stats-grid">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalQuizzes ?? 0}</div>
            <div className="text-[10px] text-gray-500">Đề thi</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className={`text-lg font-bold ${getScoreColor(stats.avgScore ?? 0)}`}>
              {stats.avgScore ?? 0}%
            </div>
            <div className="text-[10px] text-gray-500">Điểm TB</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-lg font-bold text-purple-600">{stats.totalAttempts ?? 0}</div>
            <div className="text-[10px] text-gray-500">Lần làm</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center cursor-pointer" onClick={() => navigate('/flashcards')}>
            <div className="text-lg font-bold text-amber-600">{stats.dueFlashcards ?? 0}</div>
            <div className="text-[10px] text-gray-500">Flashcard</div>
          </div>
        </div>
      )}

      {/* Progress chart */}
      {stats?.recentAttempts?.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">📈 Tiến bộ gần đây</h3>
          <div className="flex items-end gap-1 h-16">
            {stats.recentAttempts.map((a, i) => (
              <div
                key={i}
                className="flex-1 rounded-t min-w-[12px] transition-all"
                style={{ height: `${Math.max(a.percent, 5)}%` }}
                title={`${a.subject}: ${a.percent}%`}
              >
                <div className={`w-full h-full rounded-t ${
                  a.percent >= 80 ? 'bg-green-400' :
                  a.percent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject stats */}
      {stats?.subjectStats?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">📚 Theo môn học</h3>
          <div className="space-y-2">
            {stats.subjectStats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-16 truncate">{s.subject}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      s.avg_score >= 80 ? 'bg-green-400' :
                      s.avg_score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${s.avg_score}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 w-12 text-right">{s.avg_score}% ({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Cards */}
      <h2 className="text-sm font-semibold text-gray-700 mb-2">🧰 Chức năng chính</h2>
      <div className="space-y-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={tool.action}
            className={`w-full ${tool.bg} rounded-lg px-3 py-2.5 text-left hover:shadow-md transition-all group border border-transparent ${tool.hoverBorder} active:scale-[0.99] overflow-hidden relative`}
          >
            {tool.badge && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {tool.badge}
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className={`${tool.iconBg} w-9 h-9 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition shrink-0`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate">{tool.title}</h3>
                <p className="text-xs text-gray-500 truncate">{tool.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
