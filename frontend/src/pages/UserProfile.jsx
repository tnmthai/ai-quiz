import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserProfile({ token, user, onUserUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [schoolName, setSchoolName] = useState(user?.school_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSchoolName(user.school_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMsg(null);
    setErr('');
    try {
      const { data } = await axios.put('/api/auth/profile', { name, schoolName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Cập nhật thông tin thành công!');
      if (onUserUpdated) onUserUpdated(data.user);
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSaving(true);
    setMsg(null);
    setErr('');
    if (newPw !== confirmPw) {
      setErr('Mật khẩu xác nhận không khớp');
      setSaving(false);
      return;
    }
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: currentPw,
        newPassword: newPw,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Đổi mật khẩu thành công!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
      <h1 className="text-base font-bold text-gray-800">👤 Tài khoản</h1>

      {/* Avatar + basic info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
          {avatarLetter}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <p className="text-xs text-amber-600 mt-0.5">🪙 {user?.coins ?? 0} coin</p>
        </div>
      </div>

      {/* Messages */}
      {msg && <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs">✅ {msg}</div>}
      {err && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs">⚠️ {err}</div>}

      {/* Edit profile */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📝 Thông tin cá nhân</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Họ và tên</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Nhập họ tên"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Trường</label>
          <input
            type="text"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Nhập tên trường"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">🔒 Đổi mật khẩu</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="••••••"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mật khẩu mới</label>
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Ít nhất 6 ký tự"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Nhập lại mật khẩu mới"
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={saving || !currentPw || !newPw || !confirmPw}
          className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </div>
  );
}
