import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import TakeQuiz from './pages/TakeQuiz';
import SavedQuizzes from './pages/SavedQuizzes';
import Navbar from './components/Navbar';

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'bank') navigate('/');
    else if (tab === 'saved') navigate('/saved');
    else if (tab === 'stats') navigate('/stats');
  };

  // Sync activeTab with URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/saved') setActiveTab('saved');
    else if (path === '/stats') setActiveTab('stats');
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
        <Route path="/create" element={<CreateQuiz token={token} />} />
        <Route path="/quiz/:id" element={<TakeQuiz token={token} />} />
        <Route path="/saved" element={<SavedQuizzes token={token} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
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
