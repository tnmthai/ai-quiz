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

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, modelsRes] = await Promise.all([
        axios.get('/api/admin/stats', { headers }),
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/ai-models', { headers }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAiModels(modelsRes.data);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Đổi role thành ${newRole}?`)) return;
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`Xóa user ${email}?`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) { alert('Mật khẩu phải >= 6 ký tự'); return; }
    try {
      await axios.put(`/api/admin/users/${userId}/password`, { password: newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Đã reset mật khẩu!');
      setEditingUser(null);
      setNewPassword('');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleCoinAction = async () => {
    const { userId, type, amount, reason } = coinAction;
    if (!userId || !amount || parseInt(amount) <= 0) { alert('Vui lòng chọn user và nhập số coin'); return; }
    try {
      const endpoint = type === 'add' ? 'coins/add' : 'coins/deduct';
      const { data } = await axios.post(`/api/admin/users/${userId}/${endpoint}`, {
        amount: parseInt(amount),
        reason,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u.id === parseInt(userId) ? { ...u, coins: data.newBalance } : u));
      setCoinAction({ userId: null, type: 'add', amount: '', reason: '' });
      alert(`${type === 'add' ? 'Thêm' : 'Trừ'} thành công!`);
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleSaveModel = async (modelKey) => {
    try {
      const { data } = await axios.put(`/api/admin/ai-models/${modelKey}`, modelForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiModels(prev => prev.map(m => m.model_key === modelKey ? { ...m, ...data } : m));
      setEditingModel(null);
      setModelForm({});
      alert('Đã lưu cấu hình model!');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const toggleModelEnabled = async (modelKey, currentEnabled) => {
    try {
      const { data } = await axios.put(`/api/admin/ai-models/${modelKey}`, {
        enabled: !currentEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAiModels(prev => prev.map(m => m.model_key === modelKey ? { ...m, enabled: !currentEnabled } : m));
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  if (loading) return <div className="text-center text-gray-400 py-12">⏳ Đang tải...</div>;

  const sections = [
    { id: 'overview', label: '📊 Tổng quan', icon: '📊' },
    { id: 'users', label: '👥 Users', icon: '👥' },
    { id: 'coins', label: '🪙 Quản lý Coin', icon: '🪙' },
    { id: 'ai-models', label: '🤖 AI Models', icon: '🤖' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      <h1 className="text-lg font-bold text-gray-800">👑 Admin Dashboard</h1>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeSection === s.id ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-500">Tổng users</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.totalQuizzes}</div>
              <div className="text-sm text-gray-500">Tổng đề thi</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.totalCoins?.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Tổng coin</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-green-600">{stats.totalRevenue?.toLocaleString()}đ</div>
              <div className="text-sm text-gray-500">Doanh thu</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🕐 Users mới nhất</h3>
              <div className="space-y-2">
                {stats.recentUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">{(u.name || u.email)[0].toUpperCase()}</div>
                    <span className="text-gray-700 flex-1 truncate">{u.email}</span>
                    <span className="text-gray-400">{new Date(u.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">💳 Giao dịch mới nhất</h3>
              <div className="space-y-2">
                {stats.recentPayments?.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className={`font-medium ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {p.status === 'paid' ? '✅' : '⏳'}
                    </span>
                    <span className="text-gray-700 flex-1 truncate">{p.email}</span>
                    <span className="text-gray-600 font-medium">{p.amount_vnd?.toLocaleString()}đ</span>
                  </div>
                )) || <p className="text-xs text-gray-400">Chưa có giao dịch</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Users */}
      {activeSection === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">👥 Quản lý Users</h2>
            <span className="text-xs text-gray-400">{users.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Tên</th>
                  <th className="px-4 py-2">Trường</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">🪙 Coins</th>
                  <th className="px-4 py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400">{u.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{u.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{u.school_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleRoleToggle(u.id, u.role)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role === 'admin' ? '👑 admin' : '👤 user'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-amber-600 font-medium">{u.coins ?? 0}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => setCoinAction({ ...coinAction, userId: u.id })} className="text-amber-400 hover:text-amber-600 text-xs" title="Quản lý coin">🪙</button>
                        <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)} className="text-blue-400 hover:text-blue-600 text-xs" title="Reset mật khẩu">🔑</button>
                        <button onClick={() => handleDelete(u.id, u.email)} className="text-red-400 hover:text-red-600 text-xs" title="Xóa user">🗑️</button>
                      </div>
                      {editingUser === u.id && (
                        <div className="mt-2 flex gap-1.5">
                          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="border border-gray-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <button onClick={() => handleResetPassword(u.id)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">OK</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coin Management */}
      {activeSection === 'coins' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🪙 Thêm / Trừ Coin</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Chọn user</label>
                <select value={coinAction.userId || ''} onChange={(e) => setCoinAction({ ...coinAction, userId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">-- Chọn user --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.email} ({u.coins ?? 0} coins)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hành động</label>
                <div className="flex gap-2">
                  <button onClick={() => setCoinAction({ ...coinAction, type: 'add' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${coinAction.type === 'add' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    ➕ Thêm
                  </button>
                  <button onClick={() => setCoinAction({ ...coinAction, type: 'deduct' })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${coinAction.type === 'deduct' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    ➖ Trừ
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Số coin</label>
                <input type="number" min="1" value={coinAction.amount} onChange={(e) => setCoinAction({ ...coinAction, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="10" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lý do</label>
                <input type="text" value={coinAction.reason} onChange={(e) => setCoinAction({ ...coinAction, reason: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Khuyến mãi..." />
              </div>
            </div>
            <button onClick={handleCoinAction}
              className={`mt-4 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition ${coinAction.type === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {coinAction.type === 'add' ? '➕ Thêm coin' : '➖ Trừ coin'}
            </button>
          </div>

          {/* User coin balances table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">💰 Số dư coin</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Coins</th>
                    <th className="px-4 py-2">Trường</th>
                  </tr>
                </thead>
                <tbody>
                  {users.sort((a, b) => (b.coins || 0) - (a.coins || 0)).map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{u.email}</td>
                      <td className="px-4 py-2.5 font-semibold text-amber-600">{u.coins ?? 0} 🪙</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{u.school_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Models */}
      {activeSection === 'ai-models' && (
        <div className="space-y-4">
          {aiModels.map(model => (
            <div key={model.model_key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{model.model_key === 'gemini' ? '✨' : model.model_key === 'chatgpt' ? '🤖' : '🧠'}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{model.model_name}</h3>
                    <p className="text-[11px] text-gray-400">Model: {model.model_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleModelEnabled(model.model_key, model.enabled)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${model.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {model.enabled ? '✅ Bật' : '⭕ Tắt'}
                  </button>
                  <button onClick={() => { setEditingModel(editingModel === model.model_key ? null : model.model_key); setModelForm({}); }}
                    className="text-blue-400 hover:text-blue-600 text-xs">⚙️</button>
                </div>
              </div>

              {editingModel === model.model_key && (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tên model</label>
                    <input type="text" defaultValue={model.model_name}
                      onChange={(e) => setModelForm({ ...modelForm, modelName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">API Key</label>
                    <input type="password" defaultValue="" placeholder={model.api_key ? '••••••••' : 'Chưa cấu hình'}
                      onChange={(e) => setModelForm({ ...modelForm, apiKey: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Base URL</label>
                      <input type="text" defaultValue={model.base_url}
                        onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Model ID</label>
                      <input type="text" defaultValue={model.model_id}
                        onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveModel(model.model_key)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition">💾 Lưu</button>
                    <button onClick={() => setEditingModel(null)}
                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">Hủy</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400">💡 Gemini sử dụng GEMINI_API_KEY từ env nếu chưa nhập API key ở trên.</p>
        </div>
      )}
    </div>
  );
}
