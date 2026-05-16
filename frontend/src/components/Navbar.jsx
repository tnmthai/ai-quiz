const NAV_ITEMS = [
  { id: 'bank', label: 'Ngân hàng', icon: '📚' },
  { id: 'saved', label: 'Đã lưu', icon: '💾' },
  { id: 'history', label: 'Lịch sử', icon: '📊' },
  { id: 'flashcards', label: 'Flashcard', icon: '🃏' },
];

export default function Navbar({ user, onLogout, activeTab, onTabChange }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-[68px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => onTabChange('bank')}>
            <span className="text-3xl">🤖</span>
            <div className="hidden sm:block">
              <h1 className="text-lg font-extrabold text-gray-900 leading-tight">AI Teacher</h1>
              <p className="text-xs text-gray-400 font-medium">v0.3</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1.5 flex-1 justify-center px-3">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2.5 rounded-xl text-base font-extrabold transition whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
            {user?.role === 'admin' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-4 py-2.5 rounded-xl text-base font-extrabold transition whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                    : 'text-gray-700 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="mr-1">👑</span>
                Admin
              </button>
            )}
          </nav>

          {/* User Panel */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTabChange('topup')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3.5 py-2.5 rounded-xl text-base font-extrabold hover:shadow-lg shadow-amber-200 transition"
              title="Nạp coin"
            >
              <span>🪙</span>
              <span>{user?.coins ?? 0}</span>
              <span className="text-white/80">+</span>
            </button>
            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center bg-gray-100 text-gray-700 px-3.5 py-2.5 rounded-xl text-lg font-bold hover:bg-gray-200 transition"
              title="Tài khoản"
            >
              👤
            </button>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 transition text-2xl p-1"
              title="Đăng xuất"
            >
              🚪
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
