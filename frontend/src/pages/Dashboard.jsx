import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard({ token, user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ ai: 0, file: 0, matrix: 0, 'md-to-word': 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/quiz/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [token]);

  const coins = user?.coins ?? stats.coins ?? 0;

  const tools = [
    {
      id: 'ai-create',
      icon: '✨',
      title: 'Tạo đề bằng AI',
      desc: 'Tạo nhanh với AI',
      count: stats.ai,
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
      count: stats.file,
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
      count: stats.matrix,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      hoverBorder: 'hover:border-emerald-200',
      action: () => navigate('/create?source=matrix'),
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-3">
      {/* Coin balance banner */}
      {coins < 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span>🪙</span>
            <span className="text-xs text-amber-700">Còn <strong>{coins} coin</strong> — Nạp thêm?</span>
          </div>
          <button
            onClick={() => navigate('/topup')}
            className="bg-amber-500 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-amber-600 transition"
          >
            Nạp ngay
          </button>
        </div>
      )}

      {/* Tool Cards */}
      <h2 className="text-sm font-semibold text-gray-700 mb-2">🧰 Chức năng chính</h2>
      <div className="space-y-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={tool.action}
            className={`w-full ${tool.bg} rounded-lg px-3 py-2.5 text-left hover:shadow-md transition-all group border border-transparent ${tool.hoverBorder} active:scale-[0.99]`}
          >
            <div className="flex items-center gap-3">
              <div className={`${tool.iconBg} w-9 h-9 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition shrink-0`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800">{tool.title}</h3>
                <p className="text-xs text-gray-500">{tool.desc}</p>
              </div>
              <span className="text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full font-medium shrink-0">
                {tool.count}×
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
