import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserProfile({ token, user, onUserUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [schoolName, setSchoolName] = useState(user?.school_name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { if (user) { setName(user.name || ''); setSchoolName(user.school_name || ''); } }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true); setMsg(null); setErr('');
    try { const { data } = await axios.put('/api/auth/profile', { name, schoolName }, { headers: { Authorization: `Bearer ${token}` } }); setMsg('Cập nhật thành công!'); if (onUserUpdated) onUserUpdated(data.user); }
    catch (e) { setErr(e.response?.data?.error || 'Lỗi'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setSaving(true); setMsg(null); setErr('');
    if (newPw !== confirmPw) { setErr('Mật khẩu xác nhận không khớp'); setSaving(false); return; }
    try { await axios.put('/api/auth/change-password', { currentPassword: currentPw, newPassword: newPw }, { headers: { Authorization: `Bearer ${token}` } }); setMsg('Đổi mật khẩu thành công!'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    catch (e) { setErr(e.response?.data?.error || 'Lỗi'); }
    finally { setSaving(false); }
  };

  const avatarLetter = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">👤 Tài khoản</h1>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4 mb-5 shadow-sm">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg shadow-indigo-200/50">{avatarLetter}</div>
        <div>
          <p className="text-lg font-bold text-gray-900">{user?.name || 'User'}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-base text-amber-600 font-bold mt-0.5">🪙 {user?.coins ?? 0} coin</p>
        </div>
      </div>

      {msg && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium mb-4">✅ {msg}</div>}
      {err && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">⚠️ {err}</div>}

      {/* Edit profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 mb-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📝 Thông tin cá nhân</h2>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Họ và tên</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none transition" placeholder="Nhập họ tên" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Trường</label>
          <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none transition" placeholder="Nhập tên trường" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Email</label>
          <input type="email" value={user?.email || ''} disabled
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-base bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>
        <button onClick={handleSaveProfile} disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl text-lg font-bold hover:shadow-lg transition disabled:opacity-50 active:scale-[0.98]">
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🔒 Đổi mật khẩu</h2>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Mật khẩu hiện tại</label>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none transition" placeholder="••••••" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Mật khẩu mới</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none transition" placeholder="Ít nhất 6 ký tự" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Xác nhận mật khẩu</label>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 outline-none transition" placeholder="Nhập lại mật khẩu" />
        </div>
        <button onClick={handleChangePassword} disabled={saving || !currentPw || !newPw || !confirmPw}
          className="w-full bg-gray-800 text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-900 transition disabled:opacity-50 active:scale-[0.98]">
          {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </div>
  );
}
