const NAV_ITEMS = [
  { id: 'bank', label: 'Ngân hàng đề', icon: '📚' },
  { id: 'saved', label: 'Đã lưu', icon: '💾' },
  { id: 'history', label: 'Lịch sử', icon: '📊' },
  { id: 'flashcards', label: 'Flashcard', icon: '🃏' },
];

export default function Navbar({ user, onLogout, activeTab, onTabChange }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-15">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => onTabChange('bank')}>
            <span className="text-xl sm:text-2xl">🤖</span>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-gray-800 leading-tight">AI Teacher Assistant</h1>
              <p className="text-[10px] text-gray-400">v0.3</p>
            </div>
          </div>

          {/* Nav Tabs — scrollable on mobile */}
          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto flex-1 justify-center px-2 no-scrollbar">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[13px] sm:text-sm font-medium transition whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-0.5 sm:mr-1">{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
              </button>
            ))}
            {user?.role === 'admin' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[13px] sm:text-sm font-medium transition whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-amber-50 text-amber-600'
                    : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="mr-0.5 sm:mr-1">👑</span>
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
          </nav>

          {/* User Panel */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => onTabChange('topup')}
              className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium hover:bg-yellow-100 transition"
              title="Nạp coin"
            >
              <span>🪙</span>
              <span className="font-bold">{user?.coins ?? 0}</span>
              <span className="text-yellow-500 font-bold">+</span>
            </button>
            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center bg-gray-50 text-gray-600 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 transition"
              title="Tài khoản"
            >
              👤
            </button>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 transition text-base sm:text-lg p-1"
              title="Đăng xuất"
            >
              🚪
            </button>
          </div>
        </div>
      </div>
      {/* Hide scrollbar on nav */}
      <style>{`nav::-webkit-scrollbar { display: none; } nav { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </header>
  );
}
