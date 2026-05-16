import { useState, useEffect, useRef } from 'react';
import { cleanText } from '../utils/cleanText';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const SUBJECTS = ['Toán', 'Lí', 'Hóa', 'Sinh', 'Văn', 'Sử', 'Địa', 'Anh', 'GDCD', 'Tin học'];
const GRADES = ['Lớp 12', 'Lớp 11', 'Lớp 10', 'Lớp 9', 'Lớp 8', 'Lớp 7', 'Lớp 6', 'Lớp 5', 'Lớp 4', 'Lớp 3', 'Lớp 2', 'Lớp 1'];

const TOPICS_BY_SUBJECT = {
  'Toán': ['Hàm số', 'Đại số', 'Tích phân', 'Hình học', 'Số phức', 'Xác suất', 'Thống kê', 'Logarit', 'Bất đẳng thức', 'Đạo hàm', 'Tổ hợp - Hoán vị', 'Vectơ', 'Đa thức', 'Phương trình - Bất phương trình'],
  'Lí': ['Cơ học', 'Điện học', 'Quang học', 'Nhiệt học', 'Sóng', 'Hạt nhân nguyên tử', 'Từ trường', 'Điện từ'],
  'Hóa': ['Vô cơ', 'Hữu cơ', 'Điện hóa', 'Dung dịch', 'Khi', 'Nhiệt hóa', 'Hóa phân tích'],
  'Sinh': ['Di truyền', 'Tiến hóa', 'Sinh thái', 'Tế bào', 'Sinh học phân tử', 'Cơ thể người', 'Thực vật'],
  'Văn': ['Văn học trung đại', 'Văn học hiện đại', 'Văn học nước ngoài', 'Lý luận văn học', 'Làm văn nghị luận'],
  'Sử': ['Lịch sử Việt Nam', 'Lịch sử thế giới', 'Cách mạng tháng Tám', 'Chiến tranh thế giới'],
  'Địa': ['Địa lý tự nhiên', 'Địa lý kinh tế', 'Địa lý dân cư', 'Bản đồ'],
  'Anh': ['Ngữ pháp', 'Từ vựng', 'Đọc hiểu', 'Viết', 'Nghe', 'Giao tiếp'],
  'GDCD': ['Pháp luật', 'Đạo đức', 'Quyền công dân', 'Gia đình xã hội'],
  'Tin học': ['Lập trình', 'Thuật toán', 'Cấu trúc dữ liệu', 'Mạng máy tính', 'Cơ sở dữ liệu'],
};

const DIFFICULTY_LABELS = ['Rất dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó'];

const SOURCE_CONFIG = {
  ai: {
    icon: '✨',
    title: 'Tạo đề bằng AI',
    gradient: 'from-indigo-500 to-purple-500',
    accent: 'blue',
  },
  file: {
    icon: '📁',
    title: 'Tạo đề từ file có sẵn',
    gradient: 'from-cyan-500 to-blue-500',
    accent: 'cyan',
  },
  matrix: {
    icon: '📋',
    title: 'Tạo đề từ ma trận đặc tả',
    gradient: 'from-emerald-500 to-green-500',
    accent: 'emerald',
  },
};

export default function CreateQuiz({ token, user, onCoinsUpdated }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'ai';
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.ai;

  const [subject, setSubject] = useState('Toán');
  const [grade, setGrade] = useState('Lớp 12');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState(3);
  const [questionCount, setQuestionCount] = useState(10);
  const [requirements, setRequirements] = useState([]);
  const [reqInput, setReqInput] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [modelKey, setModelKey] = useState('gemini');
  const [aiModels, setAiModels] = useState([]);
  const resultRef = useRef(null);

  // Fetch available AI models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { data } = await axios.get('/api/quiz/models', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAiModels(data.filter(m => m.enabled));
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    fetchModels();
  }, [token]);

  const topics = TOPICS_BY_SUBJECT[subject] || [];

  useEffect(() => {
    setSelectedTopics([]);
  }, [subject]);

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const addRequirement = (e) => {
    e.preventDefault();
    const val = reqInput.trim();
    if (val && !requirements.includes(val)) {
      setRequirements(prev => [...prev, val]);
      setReqInput('');
    }
  };

  const removeRequirement = (req) => {
    setRequirements(prev => prev.filter(r => r !== req));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation theo source
    if (source === 'file' && files.length === 0) {
      setError('Vui lòng upload ít nhất 1 file');
      return;
    }
    if (source === 'ai' && selectedTopics.length === 0) {
      setError('Vui lòng chọn ít nhất một chuyên đề');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let data;

      if (source === 'file' || files.length > 0) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('subject', subject);
        formData.append('topic', selectedTopics.join(', '));
        formData.append('count', questionCount);
        formData.append('difficulty', DIFFICULTY_LABELS[difficulty - 1]);
        formData.append('requirements', JSON.stringify(requirements));

        const resp = await axios.post('/api/quiz/generate-from-file', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        data = resp.data;
        if (data.coinsRemaining !== undefined && onCoinsUpdated) onCoinsUpdated();
      } else {
        const payload = {
          subject,
          topic: selectedTopics.join(', '),
          count: questionCount,
          difficulty: DIFFICULTY_LABELS[difficulty - 1],
          type: 'multiple_choice',
          source,
          grade,
          requirements,
        };

        const resp = await axios.post('/api/quiz/generate', { ...payload, modelKey }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = resp.data;
        if (data.coinsRemaining !== undefined && onCoinsUpdated) onCoinsUpdated();
      }

      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi tạo đề');
    } finally {
      setLoading(false);
    }
  };

  // ─── Matrix source: coming soon ───
  if (source === 'matrix') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition">
            ← Quay lại
          </button>
          <h1 className="text-lg font-bold text-gray-800">{config.icon} {config.title}</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="text-5xl mb-4">🚧</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Tính năng đang phát triển</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Chức năng tạo đề từ ma trận đặc tả theo chuẩn GDPT 2018 sẽ sớm ra mắt.
            Bạn sẽ có thể xây dựng ma trận với các mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // ─── File source: upload-first layout ───
  if (source === 'file') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition">
            ← Quay lại
          </button>
          <h1 className="text-lg font-bold text-gray-800">{config.icon} {config.title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Upload file — ưu tiên */}
          <div className="bg-white rounded-xl border-2 border-cyan-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center text-xs text-cyan-600 font-bold">1</span>
              Upload tài liệu
              <span className="text-[11px] text-cyan-500 font-normal bg-cyan-50 px-2 py-0.5 rounded-full">Bắt buộc</span>
            </h2>
            <div className="border-2 border-dashed border-cyan-200 rounded-lg p-8 text-center hover:border-cyan-400 transition bg-cyan-50/30">
              <input
                type="file"
                multiple
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-sm text-gray-600 font-medium">Kéo thả file hoặc <span className="text-cyan-600 underline">chọn file</span></p>
                <p className="text-xs text-gray-400 mt-1">Hỗ trợ: .pdf, .docx, .doc, .txt (tối đa 10MB/file, 5 file)</p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-cyan-50 rounded-lg px-3 py-2">
                    <span className="text-sm">📄</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Môn & lớp */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600 font-bold">2</span>
              Chọn môn & lớp
              <span className="text-[11px] text-gray-400 font-normal">Tùy chọn — giúp AI tạo câu hỏi phù hợp hơn</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Môn học</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Khối lớp</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Tùy chỉnh */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs text-purple-600 font-bold">3</span>
              Tùy chỉnh
            </h2>

            {/* Difficulty */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">
                Độ khó: <span className="font-medium text-gray-700">{DIFFICULTY_LABELS[difficulty - 1]}</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button key={level} type="button" onClick={() => setDifficulty(level)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition ${difficulty === level ? 'bg-purple-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Số câu hỏi</label>
              <input type="number" min={1} max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>

            {/* Requirements */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Thêm yêu cầu</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {requirements.map(req => (
                  <span key={req} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    {req}
                    <button type="button" onClick={() => removeRequirement(req)} className="hover:text-amber-900 ml-1">×</button>
                  </span>
                ))}
              </div>
              <form onSubmit={addRequirement} className="flex gap-2">
                <input value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                  placeholder="VD: Không cho điểm âm, Thêm lời giải chi tiết..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                <button type="submit" className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm">+ Thêm</button>
              </form>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Không cho điểm âm', 'Thêm lời giải chi tiết', 'Có câu hỏi tự luận'].map(sug => (
                  <button key={sug} type="button"
                    onClick={() => { if (!requirements.includes(sug)) setRequirements(prev => [...prev, sug]); }}
                    className="text-[11px] text-gray-400 hover:text-cyan-500 transition">+ {sug}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">⚠️ {error}</div>}

          {/* Actions */}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className={`flex-1 bg-gradient-to-r ${config.gradient} text-white py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 text-sm font-semibold`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Đang đọc file & tạo đề...
                </span>
              ) : `📄 Tạo đề từ ${files.length || ''} file`}
            </button>
            <button type="button" onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm">Hủy</button>
          </div>
        </form>

        {/* Result */}
        {result && <div ref={resultRef}><QuizResult result={result} token={token} saved={saved} setSaved={setSaved} /></div>}
      </div>
    );
  }

  // ─── AI source (default): current layout ───
  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition">← Quay lại</button>
          <h1 className="text-lg font-bold text-gray-800">{config.icon} {config.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Chi phí:</span>
          <span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium">🪙 1 coin</span>
          <span className="text-xs text-gray-400">({user?.coins ?? 0} còn lại)</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Chọn môn & lớp + Model AI */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600 font-bold">1</span>
            Chọn môn, lớp & model AI
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Môn học</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Khối lớp</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Model AI</label>
              <select value={modelKey} onChange={(e) => setModelKey(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="gemini">✨ Gemini</option>
                <option value="mimo">🚀 Xiaomi MiMo</option>
                {aiModels.filter(m => !['gemini','mimo'].includes(m.model_key)).map(m => (
                  <option key={m.model_key} value={m.model_key}>
                    {m.model_key === 'chatgpt' ? '🤖' : '🧠'} {m.model_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Tùy chỉnh nội dung */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs text-purple-600 font-bold">2</span>
            Tùy chỉnh nội dung & thêm yêu cầu
          </h2>

          {/* Topics */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Chọn chuyên đề</label>
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => (
                <button key={topic} type="button" onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selectedTopics.includes(topic) ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {selectedTopics.includes(topic) && '✓ '}{topic}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">
              Độ khó: <span className="font-medium text-gray-700">{DIFFICULTY_LABELS[difficulty - 1]}</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button key={level} type="button" onClick={() => setDifficulty(level)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${difficulty === level ? 'bg-purple-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Số câu hỏi</label>
            <input type="number" min={1} max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Thêm yêu cầu</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {requirements.map(req => (
                <span key={req} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  {req}
                  <button type="button" onClick={() => removeRequirement(req)} className="hover:text-amber-900 ml-1">×</button>
                </span>
              ))}
            </div>
            <form onSubmit={addRequirement} className="flex gap-2">
              <input value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                placeholder="VD: Không cho điểm âm, Thêm lời giải chi tiết..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="submit" className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm">+ Thêm</button>
            </form>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Không cho điểm âm', 'Thêm lời giải chi tiết', 'Có câu hỏi tự luận', 'Theo chuẩn GDPT 2018'].map(sug => (
                <button key={sug} type="button"
                  onClick={() => { if (!requirements.includes(sug)) setRequirements(prev => [...prev, sug]); }}
                  className="text-[11px] text-gray-400 hover:text-blue-500 transition">+ {sug}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Upload tài liệu (optional) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-600 font-bold">3</span>
            Thêm tài liệu tham khảo
            <span className="text-[11px] text-gray-400 font-normal">Tùy chọn</span>
          </h2>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition">
            <input type="file" multiple accept=".txt,.doc,.docx,.pdf" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-3xl mb-2">📎</div>
              <p className="text-sm text-gray-500">Kéo thả file hoặc <span className="text-blue-500 font-medium">chọn file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hỗ trợ: .txt, .doc, .docx, .pdf</p>
            </label>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm">📄</span>
                  <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                  <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">⚠️ {error}</div>}

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className={`flex-1 bg-gradient-to-r ${config.gradient} text-white py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 text-sm font-semibold`}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> {files.length > 0 ? 'Đang đọc file & tạo đề...' : 'Đang tạo đề...'}
              </span>
            ) : (
              files.length > 0 ? `📄 Tạo đề từ ${files.length} file` : '✨ Tạo đề thi'
            )}
          </button>
          <button type="button" onClick={() => navigate('/')}
            className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm">Hủy</button>
        </div>
      </form>

      {/* Result */}
      {result && <div ref={resultRef}><QuizResult result={result} token={token} saved={saved} setSaved={setSaved} /></div>}
    </div>
  );
}

// ─── Shared result component ───
function QuizResult({ result, token, saved, setSaved }) {
  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">📋 Đề thi đã tạo</h2>
          {result.fileNames && (
            <p className="text-xs text-gray-400 mt-0.5">📄 Từ: {result.fileNames.join(', ')}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
            {saved ? '✅ Đã lưu!' : '💾 Lưu đề'}
          </button>
          <button
            onClick={async () => {
              if (!result.quiz?.id) return;
              try {
                const resp = await fetch(`/api/quiz/${result.quiz.id}/word`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!resp.ok) throw new Error('Download failed');
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `de-thi-${result.quiz.subject}-${result.quiz.id}.docx`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) { alert('Lỗi tải file: ' + err.message); }
            }}
            className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 transition">
            📥 Tải Word
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {result.questions?.map((q, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Câu {i + 1}: {cleanText(q.question)}</p>
            <div className="grid grid-cols-2 gap-2">
              {q.options?.map((opt, j) => (
                <div key={j} className={`text-sm px-3 py-2 rounded-lg ${opt.startsWith(q.correct) ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                  {cleanText(opt)}
                </div>
              ))}
            </div>
            {q.explanation && <p className="text-xs text-gray-400 mt-2">💡 {cleanText(q.explanation)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
