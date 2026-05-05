import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChatWidget from '../components/ChatWidget';

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

  const tools = [
    {
      id: 'ai-create',
      icon: '✨',
      title: 'Tạo đề bằng AI',
      desc: 'Tạo đề thi nhanh chóng với AI',
      count: stats.ai,
      gradient: 'from-indigo-500 to-purple-500',
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      hoverBorder: 'hover:border-indigo-200',
      action: () => navigate('/create'),
    },
    {
      id: 'file-reuse',
      icon: '📁',
      title: 'Tạo đề từ file có sẵn',
      desc: 'Tái sử dụng đề thi từ file Word/PDF',
      count: stats.file,
      gradient: 'from-cyan-500 to-blue-500',
      bg: 'bg-cyan-50',
      iconBg: 'bg-cyan-100',
      hoverBorder: 'hover:border-cyan-200',
      action: () => navigate('/create?source=file'),
    },
    {
      id: 'matrix',
      icon: '📋',
      title: 'Tạo đề từ ma trận',
      desc: 'Xây dựng ma trận đặc tả theo GDPT 2018',
      count: stats.matrix,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      hoverBorder: 'hover:border-emerald-200',
      action: () => navigate('/create?source=matrix'),
    },

  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      <div>
        {/* Left: Main Content */}
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Tool Cards — 4 nút lệnh */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">🧰 Chức năng chính</h2>
            <div className="grid grid-cols-2 gap-4">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={tool.action}
                  className={`${tool.bg} rounded-xl p-4 text-left hover:shadow-lg transition-all group border border-transparent ${tool.hoverBorder} active:scale-[0.98]`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${tool.iconBg} w-10 h-10 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800">{tool.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
                      <span className="inline-block mt-2 text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full font-medium">
                        Đã dùng: {tool.count} lần
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat Widget */}
        <ChatWidget token={token} />
      </div>
    </div>
  );
}
