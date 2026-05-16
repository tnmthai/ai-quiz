import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminDashboard({ token, user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [aiModels, setAiModels] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [modelForm, setModelForm] = useState({});
  const [coinAction, setCoinAction] = useState({ userId: null, type: 'add', amount: '', reason: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { if (user?.role !== 'admin') { navigate('/'); return; } fetchData(); }, []);

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [s, u, m] = await Promise.all([
        axios.get('/api/admin/stats', { headers: h }),
        axios.get('/api/admin/users', { headers: h }),
        axios.get('/api/admin/ai-models', { headers: h }),
      ]);
      setStats(s.data); setUsers(u.data); setAiModels(m.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Đổi role thành ${newRole}?`)) return;
    try { await axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } }); setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u)); showToast(`Đã đổi role thành ${newRole}`); }
    catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`Xóa user ${email}?`)) return;
    try { await axios.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }); setUsers(p => p.filter(u => u.id !== userId)); showToast('Đã xóa user'); }
    catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) { showToast('Mật khẩu >= 6 ký tự', 'error'); return; }
    try { await axios.put(`/api/admin/users/${userId}/password`, { password: newPassword }, { headers: { Authorization: `Bearer ${token}` } }); showToast('Đã reset mật khẩu!'); setEditingUser(null); setNewPassword(''); }
    catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  const handleCoinAction = async () => {
    const { userId, type, amount, reason } = coinAction;
    if (!userId || !amount || parseInt(amount) <= 0) { showToast('Chọn user và nhập số coin', 'error'); return; }
    try {
      const { data } = await axios.post(`/api/admin/users/${userId}/${type === 'add' ? 'coins/add' : 'coins/deduct'}`, { amount: parseInt(amount), reason }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(p => p.map(u => u.id === parseInt(userId) ? { ...u, coins: data.newBalance } : u));
      setCoinAction({ userId: null, type: 'add', amount: '', reason: '' });
      showToast(`${type === 'add' ? 'Thêm' : 'Trừ'} thành công!`);
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  const handleSaveModel = async (modelKey) => {
    try { const { data } = await axios.put(`/api/admin/ai-models/${modelKey}`, modelForm, { headers: { Authorization: `Bearer ${token}` } }); setAiModels(p => p.map(m => m.model_key === modelKey ? { ...m, ...data } : m)); setEditingModel(null); setModelForm({}); showToast('Đã lưu cấu hình!'); }
    catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  const toggleModelEnabled = async (modelKey, currentEnabled) => {
    try { await axios.put(`/api/admin/ai-models/${modelKey}`, { enabled: !currentEnabled }, { headers: { Authorization: `Bearer ${token}` } }); setAiModels(p => p.map(m => m.model_key === modelKey ? { ...m, enabled: !currentEnabled } : m)); showToast(!currentEnabled ? 'Đã bật' : 'Đã tắt'); }
    catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">👑</div><p className="text-gray-400">Đang tải...</p></div>
    </div>
  );

  const sections = [
    { id: 'overview', label: '📊 Tổng quan' },
    { id: 'users', label: '👥 Users' },
    { id: 'coins', label: '🪙 Coin' },
    { id: 'ai-models', label: '🤖 AI Models' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-slide-in ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-5">👑 Admin</h1>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${activeSection === s.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{s.label}</button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">👥</div>
                <div><p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p><p className="text-sm text-gray-500">Users</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">📝</div>
                <div><p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p><p className="text-sm text-gray-500">Đề thi</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">🪙</div>
                <div><p className="text-2xl font-bold text-gray-900">{stats.totalCoins?.toLocaleString()}</p><p className="text-sm text-gray-500">Tổng coin</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💰</div>
                <div><p className="text-2xl font-bold text-gray-900">{stats.totalRevenue?.toLocaleString()}đ</p><p className="text-sm text-gray-500">Doanh thu</p></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 mb-3">🕐 Users mới nhất</h3>
              <div className="space-y-3">
                {stats.recentUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">{(u.name || u.email)[0].toUpperCase()}</div>
                    <span className="text-sm text-gray-700 flex-1 truncate">{u.email}</span>
                    <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 mb-3">💳 Giao dịch gần đây</h3>
              {stats.recentPayments?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentPayments.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-lg">{p.status === 'paid' ? '✅' : '⏳'}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{p.email}</span>
                      <span className="text-sm font-bold text-gray-900">{p.amount_vnd?.toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Chưa có giao dịch</p>}
            </div>
          </div>
        </>
      )}

      {/* Users */}
      {activeSection === 'users' && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">{(u.name || u.email)[0].toUpperCase()}</div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{u.name || u.email}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    {u.school_name && <p className="text-xs text-gray-400">🏫 {u.school_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRoleToggle(u.id, u.role)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </button>
                  <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">🪙 {u.coins ?? 0}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setCoinAction({ ...coinAction, userId: u.id })}
                  className="bg-amber-50 text-amber-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 transition">🪙 Coin</button>
                <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}
                  className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-100 transition">🔑 Đổi MK</button>
                <button onClick={() => handleDelete(u.id, u.email)}
                  className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition">🗑️ Xóa</button>
              </div>
              {editingUser === u.id && (
                <div className="mt-3 flex gap-2">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none" />
                  <button onClick={() => handleResetPassword(u.id)} className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600">Lưu</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Coins */}
      {activeSection === 'coins' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🪙 Thêm / Trừ Coin</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Chọn user</label>
                <select value={coinAction.userId || ''} onChange={(e) => setCoinAction({ ...coinAction, userId: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base bg-white focus:border-indigo-400 outline-none">
                  <option value="">-- Chọn user --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.email} ({u.coins ?? 0} coins)</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCoinAction({ ...coinAction, type: 'add' })}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${coinAction.type === 'add' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>➕ Thêm</button>
                <button onClick={() => setCoinAction({ ...coinAction, type: 'deduct' })}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${coinAction.type === 'deduct' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>➖ Trừ</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Số coin</label>
                  <input type="number" min="1" value={coinAction.amount} onChange={(e) => setCoinAction({ ...coinAction, amount: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none" placeholder="10" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Lý do</label>
                  <input type="text" value={coinAction.reason} onChange={(e) => setCoinAction({ ...coinAction, reason: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none" placeholder="Khuyến mãi..." />
                </div>
              </div>
              <button onClick={handleCoinAction}
                className={`w-full py-4 rounded-xl text-lg font-bold text-white transition active:scale-[0.98] ${coinAction.type === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                {coinAction.type === 'add' ? '➕ Thêm coin' : '➖ Trừ coin'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-3">💰 Số dư coin</h2>
            <div className="space-y-3">
              {[...users].sort((a, b) => (b.coins || 0) - (a.coins || 0)).map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{u.email}</span>
                  <span className="text-base font-bold text-amber-600">{u.coins ?? 0} 🪙</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Models */}
      {activeSection === 'ai-models' && (
        <div className="space-y-4">
          {aiModels.map(model => (
            <div key={model.model_key} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{model.model_key === 'gemini' ? '✨' : model.model_key === 'mimo' ? '🚀' : model.model_key === 'chatgpt' ? '🤖' : '🧠'}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{model.model_name}</h3>
                    <p className="text-sm text-gray-400">{model.model_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleModelEnabled(model.model_key, model.enabled)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition ${model.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {model.enabled ? '✅ Bật' : '⭕ Tắt'}
                  </button>
                  <button onClick={() => { setEditingModel(editingModel === model.model_key ? null : model.model_key); setModelForm({}); }}
                    className="text-indigo-500 hover:text-indigo-700 text-lg">⚙️</button>
                </div>
              </div>

              {editingModel === model.model_key && (
                <div className="border-t border-gray-100 pt-4 mt-3 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">Tên model</label>
                    <input type="text" defaultValue={model.model_name} onChange={(e) => setModelForm({ ...modelForm, modelName: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-indigo-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">API Key</label>
                    <input type="password" defaultValue="" placeholder={model.api_key ? '••••••••' : 'Chưa cấu hình'}
                      onChange={(e) => setModelForm({ ...modelForm, apiKey: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-indigo-400 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1.5 block">Base URL</label>
                      <input type="text" defaultValue={model.base_url} onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1.5 block">Model ID</label>
                      <input type="text" defaultValue={model.model_id} onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleSaveModel(model.model_key)}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl text-base font-bold hover:shadow-lg transition active:scale-[0.98]">💾 Lưu</button>
                    <button onClick={() => setEditingModel(null)}
                      className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl text-base font-bold hover:bg-gray-200 transition">Hủy</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <p className="text-sm text-gray-400">💡 Gemini dùng GEMINI_API_KEY từ env nếu chưa nhập key.</p>
        </div>
      )}
    </div>
  );
}
