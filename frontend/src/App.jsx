import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import TakeQuiz from './pages/TakeQuiz';
import SavedQuizzes from './pages/SavedQuizzes';
import AdminDashboard from './pages/AdminDashboard';
import TopUp from './pages/TopUp';
import UserProfile from './pages/UserProfile';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';

function AppContent() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('bank');

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'bank') navigate('/');
    else if (tab === 'saved') navigate('/saved');
    else if (tab === 'stats') navigate('/stats');
    else if (tab === 'admin') navigate('/admin');
    else if (tab === 'topup') navigate('/topup');
    else if (tab === 'profile') navigate('/profile');
  };

  // Sync activeTab with URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/saved') setActiveTab('saved');
    else if (path === '/stats') setActiveTab('stats');
    else if (path === '/admin') setActiveTab('admin');
    else if (path === '/topup') setActiveTab('topup');
    else if (path === '/profile') setActiveTab('profile');
    else setActiveTab('bank');
  }, []);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} activeTab={activeTab} onTabChange={handleTabChange} />
      <Routes>
        <Route path="/" element={<Dashboard token={token} user={user} />} />
        <Route path="/create" element={<CreateQuiz token={token} user={user} onCoinsUpdated={refreshUser} />} />
        <Route path="/quiz/:id" element={<TakeQuiz token={token} />} />
        <Route path="/saved" element={<SavedQuizzes token={token} />} />
        <Route path="/admin" element={<AdminDashboard token={token} user={user} />} />
        <Route path="/topup" element={<TopUp token={token} user={user} onCoinsUpdated={refreshUser} />} />
        <Route path="/profile" element={<UserProfile token={token} user={user} onUserUpdated={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ChatWidget token={token} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
