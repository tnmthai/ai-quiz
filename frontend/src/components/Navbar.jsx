const NAV_ITEMS = [
  { id: 'bank', label: 'Ngân hàng đề', icon: '📚' },
  { id: 'saved', label: 'Đề đã lưu', icon: '💾' },
  { id: 'history', label: 'Lịch sử', icon: '📊' },
  { id: 'flashcards', label: 'Flashcard', icon: '🃏' },
];

export default function Navbar({ user, onLogout, activeTab, onTabChange }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('bank')}>
            <span className="text-xl">🤖</span>
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">AI Teacher Assistant</h1>
              <p className="text-[10px] text-gray-400">v0.3</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
            {user?.role === 'admin' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-amber-50 text-amber-600'
                    : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="mr-1">👑</span>
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </nav>

          {/* User Panel */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('topup')}
              className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-yellow-100 transition"
              title="Nạp coin"
            >
              <span>🪙</span>
              <span>{user?.coins ?? 0}</span>
              <span className="text-yellow-500">+</span>
            </button>
            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-gray-100 transition"
              title="Tài khoản"
            >
              👤
            </button>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 transition text-sm"
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
