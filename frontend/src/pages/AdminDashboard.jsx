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

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/stats', { headers }),
        axios.get('/api/admin/users', { headers }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
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
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`Xóa user ${email}?`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Mật khẩu phải >= 6 ký tự');
      return;
    }
    try {
      await axios.put(`/api/admin/users/${userId}/password`, { password: newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã reset mật khẩu!');
      setEditingUser(null);
      setNewPassword('');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">⏳ Đang tải...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      <h1 className="text-lg font-bold text-gray-800">👑 Admin Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-sm text-gray-500">Tổng users</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.totalQuizzes}</div>
            <div className="text-sm text-gray-500">Tổng đề thi</div>
          </div>
        </div>
      )}

      {/* Users Table */}
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
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Ngày tạo</th>
                <th className="px-4 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400">{u.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{u.email}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.name}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleRoleToggle(u.id, u.role)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.role === 'admin' ? '👑 admin' : '👤 user'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}
                        className="text-blue-400 hover:text-blue-600 text-xs"
                        title="Reset mật khẩu"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="text-red-400 hover:text-red-600 text-xs"
                        title="Xóa user"
                      >
                        🗑️
                      </button>
                    </div>
                    {/* Password reset form */}
                    {editingUser === u.id && (
                      <div className="mt-2 flex gap-1.5">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mật khẩu mới"
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🕐 Users mới nhất</h3>
            <div className="space-y-2">
              {stats.recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {(u.name || u.email)[0].toUpperCase()}
                  </div>
                  <span className="text-gray-700 flex-1 truncate">{u.email}</span>
                  <span className="text-gray-400">{new Date(u.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 Đề thi mới nhất</h3>
            <div className="space-y-2">
              {stats.recentQuizzes.map(q => (
                <div key={q.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-700 flex-1 truncate">{q.subject} — {q.topic}</span>
                  <span className="text-gray-400">{q.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
