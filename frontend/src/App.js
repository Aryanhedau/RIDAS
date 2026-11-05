import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Forecasts from './pages/Forecasts';
import Insights from './pages/Insights';
import Expiry from './pages/Expiry';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      setUser({ email: localStorage.getItem('userEmail') });
    }
  }, [token]);

  const handleLogin = (newToken, email) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    setUser({ email });
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="logo">📊 RIDAS</h1>
          <div className="nav-links">
            <button 
              className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${currentPage === 'inventory' ? 'active' : ''}`}
              onClick={() => setCurrentPage('inventory')}
            >
              Inventory
            </button>
            <button 
              className={`nav-btn ${currentPage === 'forecasts' ? 'active' : ''}`}
              onClick={() => setCurrentPage('forecasts')}
            >
              Forecasts
            </button>
            <button 
              className={`nav-btn ${currentPage === 'insights' ? 'active' : ''}`}
              onClick={() => setCurrentPage('insights')}
            >
              Insights
            </button>
            <button 
              className={`nav-btn ${currentPage === 'expiry' ? 'active' : ''}`}
              onClick={() => setCurrentPage('expiry')}
            >
              📦 Expiry
            </button>
            <span className="user-info">{user?.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'dashboard' && <Dashboard token={token} />}
        {currentPage === 'inventory' && <Inventory token={token} />}
        {currentPage === 'forecasts' && <Forecasts token={token} />}
        {currentPage === 'insights' && <Insights token={token} />}
        {currentPage === 'expiry' && <Expiry token={token} />}
      </main>
    </div>
  );
}

export default App;