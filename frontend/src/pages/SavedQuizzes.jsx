import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SUBJECT_ICONS = {
  'Toán': '🧮', 'Lí': '⚡', 'Hóa': '🧪', 'Sinh': '🧬',
  'Văn': '📖', 'Sử': '🏛️', 'Địa': '🗺️', 'Anh': '🌍',
  'GDCD': '⚖️', 'Tin học': '💻',
};

export default function SavedQuizzes({ token }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [sharing, setSharing] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, [token]);

  useEffect(() => {
    let result = quizzes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(qz =>
        qz.topic.toLowerCase().includes(q) ||
        qz.subject.toLowerCase().includes(q)
      );
    }
    if (subjectFilter) {
      result = result.filter(qz => qz.subject === subjectFilter);
    }
    setFiltered(result);
  }, [quizzes, search, subjectFilter]);

  const fetchQuizzes = async () => {
    try {
      const { data } = await axios.get('/api/quiz/my-quizzes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(data);
      setFiltered(data);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownloadPDF = async (id, subject) => {
    try {
      const resp = await fetch(`/api/quiz/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `de-thi-${subject}-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi tải PDF: ' + err.message);
    }
  };

  const handleShare = async (id) => {
    setSharing(id);
    try {
      const { data } = await axios.post(`/api/quiz/${id}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareUrl(`${window.location.origin}${data.shareUrl}`);
    } catch (err) {
      alert('Lỗi chia sẻ: ' + err.message);
    } finally {
      setSharing(null);
    }
  };

  const subjects = [...new Set(quizzes.map(q => q.subject))];

  const sourceLabels = {
    ai: '✨ AI', file: '📁 File', matrix: '📋 Ma trận', 'md-to-word': '📝 MD→Word',
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">💾 Đề đã lưu</h1>
        <span className="text-sm text-gray-400">{filtered.length}/{quizzes.length} đề</span>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm theo môn, chủ đề..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Tất cả môn</option>
          {subjects.map(s => <option key={s} value={s}>{SUBJECT_ICONS[s] || '📚'} {s}</option>)}
        </select>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2 text-sm ${view === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}
          >
            ▦
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Subject filter chips */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setSubjectFilter('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              !subjectFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tất cả
          </button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                subjectFilter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {SUBJECT_ICONS[s] || '📚'} {s}
            </button>
          ))}
        </div>
      )}

      {/* Share URL modal */}
      {shareUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-600 mb-1">🔗 Link chia sẻ:</p>
          <div className="flex gap-2">
            <input value={shareUrl} readOnly className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1.5" />
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); }}
              className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-600">
              Copy
            </button>
            <button onClick={() => setShareUrl('')}
              className="text-gray-400 hover:text-gray-600 text-xs px-2">✕</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">{search || subjectFilter ? '🔍' : '📭'}</div>
          <p className="text-gray-500 text-sm">
            {search || subjectFilter ? 'Không tìm thấy đề thi phù hợp' : 'Chưa có đề thi nào'}
          </p>
          {!(search || subjectFilter) && (
            <button onClick={() => navigate('/create')} className="mt-3 text-blue-500 text-sm hover:underline">
              Tạo đề mới →
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{SUBJECT_ICONS[quiz.subject] || '📚'}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {sourceLabels[quiz.source] || quiz.source}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{quiz.topic}</h3>
              <p className="text-xs text-gray-500 mb-3">{quiz.subject} · {quiz.difficulty}</p>
              <p className="text-[10px] text-gray-400 mb-3">
                {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="flex-1 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                  Làm bài
                </button>
                <button onClick={() => handleDownload(quiz.id, quiz.subject)}
                  className="bg-green-50 text-green-600 px-2 py-1.5 rounded-lg text-xs hover:bg-green-100" title="Word">
                  📥
                </button>
                <button onClick={() => handleDownloadPDF(quiz.id, quiz.subject)}
                  className="bg-red-50 text-red-600 px-2 py-1.5 rounded-lg text-xs hover:bg-red-100" title="PDF">
                  📄
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <div className="space-y-2">
          {filtered.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{SUBJECT_ICONS[quiz.subject] || '📚'}</span>
                    <h3 className="text-sm font-semibold text-gray-800">{quiz.subject} — {quiz.topic}</h3>
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
                <div className="flex gap-1.5 ml-4">
                  <button onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                    Làm bài
                  </button>
                  <button onClick={() => handleDownload(quiz.id, quiz.subject)}
                    className="bg-green-50 text-green-600 px-2 py-1.5 rounded-lg text-xs hover:bg-green-100 transition" title="Word">
                    📥
                  </button>
                  <button onClick={() => handleDownloadPDF(quiz.id, quiz.subject)}
                    className="bg-red-50 text-red-600 px-2 py-1.5 rounded-lg text-xs hover:bg-red-100 transition" title="PDF">
                    📄
                  </button>
                  <button onClick={() => handleShare(quiz.id)}
                    disabled={sharing === quiz.id}
                    className="bg-purple-50 text-purple-600 px-2 py-1.5 rounded-lg text-xs hover:bg-purple-100 transition" title="Chia sẻ">
                    {sharing === quiz.id ? '⏳' : '🔗'}
                  </button>
                  <button onClick={() => handleDelete(quiz.id)}
                    className="bg-red-50 text-red-400 px-2 py-1.5 rounded-lg text-xs hover:bg-red-100 hover:text-red-600 transition" title="Xóa">
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
