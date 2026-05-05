import { useState } from 'react';
import AIChat from '../components/AIChat';

const SUBJECTS = ['Toán', 'Lí', 'Hóa', 'Sinh', 'Văn', 'Sử', 'Địa', 'Anh', 'GDCD', 'Tin học'];
const GRADES = ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];
const EXAM_TYPES = ['Kiểm tra 15 phút', 'Kiểm tra 1 tiết', 'Giữa kì', 'Cuối kì', 'Thi thử'];

const TOOLS = [
  {
    id: 'ai-create',
    icon: '✨',
    title: 'Tạo đề bằng AI',
    desc: 'Tạo đề thi nhanh chóng với AI',
    usage: 26,
    color: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
  },
  {
    id: 'file-reuse',
    icon: '📁',
    title: 'Tạo đề từ file có sẵn',
    desc: 'Tái sử dụng đề thi từ file Word/PDF',
    usage: 3,
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    iconBg: 'bg-cyan-100',
  },
  {
    id: 'matrix',
    icon: '📋',
    title: 'Tạo đề từ ma trận',
    desc: 'Xây dựng ma trận đặc tả theo GDPT 2018',
    usage: 0,
    color: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 'md-to-word',
    icon: '📝',
    title: 'Chuyển Markdown → Word',
    desc: 'Chuyển đổi nội dung Markdown sang Word',
    usage: 0,
    color: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
  },
];

export default function Dashboard({ token, user }) {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [examType, setExamType] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      <div className="flex gap-5">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-5">
          {/* System Config */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚙️</span>
              <h2 className="text-sm font-semibold text-gray-700">System Config</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Chọn môn --</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Khối lớp</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Chọn lớp --</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Loại đề</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Chọn loại --</option>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tool Cards */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">🧰 Chức năng chính</h2>
            <div className="grid grid-cols-2 gap-4">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  className={`${tool.bg} rounded-xl p-4 text-left hover:shadow-md transition group border border-transparent hover:border-gray-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${tool.iconBg} w-10 h-10 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800">{tool.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
                      <span className="inline-block mt-2 text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full">
                        Đã dùng: {tool.usage} lần
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="w-80 flex-shrink-0">
          <AIChat token={token} />
        </div>
      </div>
    </div>
  );
}
