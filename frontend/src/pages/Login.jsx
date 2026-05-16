import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { email, password, name, schoolName } : { email, password };
      const { data } = await axios.post(endpoint, payload);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex flex-col">
      {/* Decorative top */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-4xl">🤖</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Teacher</h1>
          <p className="text-indigo-200 text-base mt-1">Trợ Lý Giáo Viên AI • v0.3</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-7 sm:p-8">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
            {isRegister ? '📝 Tạo tài khoản mới' : '👋 Đăng nhập'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Họ tên</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 focus:ring-0 transition outline-none"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Tên trường</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 focus:ring-0 transition outline-none"
                    placeholder="THPT Nguyễn Du"
                  />
                  <p className="text-xs text-gray-400 mt-1">Hiện trên header khi export đề thi</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 focus:ring-0 transition outline-none"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base focus:border-indigo-400 focus:ring-0 transition outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl text-lg font-bold hover:shadow-lg hover:shadow-indigo-300/50 transition disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Đang xử lý...
                </span>
              ) : isRegister ? '🚀 Đăng ký miễn phí' : '🔑 Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-indigo-600 font-bold ml-1.5 hover:underline"
              >
                {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
              </button>
            </p>
          </div>

          {/* Features teaser */}
          {!isRegister && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl mb-1">✨</div>
                  <p className="text-xs text-gray-500">AI tạo đề</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">🃏</div>
                  <p className="text-xs text-gray-500">Flashcard</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-xs text-gray-500">Theo dõi</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-indigo-200/70 text-xs mt-8">
          © 2026 AI Teacher Assistant
        </p>
      </div>
    </div>
  );
}
