import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">📝 AI Quiz</Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-indigo-200">Dashboard</Link>
          <Link to="/create" className="hover:text-indigo-200">Tạo đề thi</Link>
          <span className="text-indigo-200">{user?.name || user?.email}</span>
          <button onClick={onLogout} className="bg-indigo-500 hover:bg-indigo-400 px-3 py-1 rounded">
            Đăng xuất
          </button>
        </div>
      </div>
    </nav>
  );
}
