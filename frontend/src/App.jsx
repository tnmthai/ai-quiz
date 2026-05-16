import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Flashcards from './pages/Flashcards';
import QuizHistory from './pages/QuizHistory';
import SharedQuiz from './pages/SharedQuiz';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import { ToastProvider } from './components/Toast';

function AppContent() {
  const location = useLocation();
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

  const navigateTo = (path) => {
    window.location.href = path;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const routes = { bank: '/', saved: '/saved', history: '/history', flashcards: '/flashcards', admin: '/admin', topup: '/topup', profile: '/profile' };
    navigateTo(routes[tab] || '/');
  };

  // Sync activeTab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/saved') setActiveTab('saved');
    else if (path === '/history') setActiveTab('history');
    else if (path === '/flashcards') setActiveTab('flashcards');
    else if (path === '/admin') setActiveTab('admin');
    else if (path === '/topup') setActiveTab('topup');
    else if (path === '/profile') setActiveTab('profile');
    else setActiveTab('bank');
  }, [location.pathname]);

  // Shared quiz — no auth needed
  if (location.pathname.startsWith('/shared/')) {
    return (
      <Routes>
        <Route path="/shared/:code" element={<SharedQuiz />} />
      </Routes>
    );
  }

  // Not logged in
  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  // Logged in
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} activeTab={activeTab} onTabChange={handleTabChange} />
      <Routes>
        <Route path="/" element={<Dashboard token={token} user={user} />} />
        <Route path="/create" element={<CreateQuiz token={token} user={user} onCoinsUpdated={refreshUser} />} />
        <Route path="/quiz/:id" element={<TakeQuiz token={token} />} />
        <Route path="/saved" element={<SavedQuizzes token={token} />} />
        <Route path="/history" element={<QuizHistory token={token} />} />
        <Route path="/flashcards" element={<Flashcards token={token} />} />
        <Route path="/admin" element={<AdminDashboard token={token} user={user} />} />
        <Route path="/topup" element={<TopUp token={token} user={user} onCoinsUpdated={refreshUser} />} />
        <Route path="/profile" element={<UserProfile token={token} user={user} onUserUpdated={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ChatWidget token={token} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
