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
  const [view, setView] = useState('grid');
  const [sharing, setSharing] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => { fetchQuizzes(); }, [token]);

  useEffect(() => {
    let result = quizzes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(qz => qz.topic.toLowerCase().includes(q) || qz.subject.toLowerCase().includes(q));
    }
    if (subjectFilter) result = result.filter(qz => qz.subject === subjectFilter);
    setFiltered(result);
  }, [quizzes, search, subjectFilter]);

  const fetchQuizzes = async () => {
    try {
      const { data } = await axios.get('/api/quiz/my-quizzes', { headers: { Authorization: `Bearer ${token}` } });
      setQuizzes(data); setFiltered(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa đề thi này?')) return;
    try { await axios.delete(`/api/quiz/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setQuizzes(p => p.filter(q => q.id !== id)); }
    catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleDownload = async (id, subject, fmt) => {
    try {
      const url = fmt === 'pdf' ? `/api/quiz/${id}/pdf` : `/api/quiz/${id}/word`;
      const ext = fmt === 'pdf' ? 'pdf' : 'docx';
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `de-thi-${subject}-${id}.${ext}`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleShare = async (id) => {
    setSharing(id);
    try { const { data } = await axios.post(`/api/quiz/${id}/share`, {}, { headers: { Authorization: `Bearer ${token}` } }); setShareUrl(`${window.location.origin}${data.shareUrl}`); }
    catch (err) { alert('Lỗi: ' + err.message); }
    finally { setSharing(null); }
  };

  const subjects = [...new Set(quizzes.map(q => q.subject))];
  const sourceLabels = { ai: '✨ AI', file: '📁 File', matrix: '📋 Ma trận' };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">💾</div><p className="text-gray-400">Đang tải...</p></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">💾 Đề đã lưu</h1>
        <span className="text-base text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{filtered.length} đề</span>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Tìm kiếm môn, chủ đề..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none mb-4" />

      {/* Subject chips */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setSubjectFilter('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${!subjectFilter ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Tất cả</button>
          {subjects.map(s => (
            <button key={s} onClick={() => setSubjectFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${subjectFilter === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {SUBJECT_ICONS[s] || '📚'} {s}
            </button>
          ))}
        </div>
      )}

      {/* Share URL */}
      {shareUrl && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">🔗 Link chia sẻ:</p>
          <div className="flex gap-2">
            <input value={shareUrl} readOnly className="flex-1 text-sm bg-white border border-indigo-200 rounded-xl px-3 py-2.5" />
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600">Copy</button>
            <button onClick={() => setShareUrl('')} className="text-gray-400 hover:text-gray-600 text-lg px-2">✕</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="text-5xl mb-3">{search || subjectFilter ? '🔍' : '📭'}</div>
          <p className="text-gray-500 text-base">{search || subjectFilter ? 'Không tìm thấy' : 'Chưa có đề thi nào'}</p>
          {!(search || subjectFilter) && <button onClick={() => navigate('/create')} className="mt-4 text-indigo-600 text-base font-bold hover:underline">Tạo đề mới →</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{SUBJECT_ICONS[quiz.subject] || '📚'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">{quiz.topic}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                      {sourceLabels[quiz.source] || quiz.source}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{quiz.subject} · {quiz.difficulty} · {new Date(quiz.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl text-base font-bold hover:shadow-lg transition active:scale-[0.98]">
                  Làm bài
                </button>
                <button onClick={() => handleDownload(quiz.id, quiz.subject, 'word')}
                  className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-lg hover:bg-green-100 transition" title="Word">📥</button>
                <button onClick={() => handleDownload(quiz.id, quiz.subject, 'pdf')}
                  className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-lg hover:bg-red-100 transition" title="PDF">📄</button>
                <button onClick={() => handleShare(quiz.id)} disabled={sharing === quiz.id}
                  className="bg-purple-50 text-purple-600 px-4 py-3 rounded-xl text-lg hover:bg-purple-100 transition" title="Chia sẻ">
                  {sharing === quiz.id ? '⏳' : '🔗'}
                </button>
                <button onClick={() => handleDelete(quiz.id)}
                  className="bg-gray-50 text-gray-400 px-3 py-3 rounded-xl text-lg hover:bg-red-50 hover:text-red-500 transition" title="Xóa">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
