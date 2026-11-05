import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@ridas.com');
  const [password, setPassword] = useState('Test@1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/auth/login', {
        email,
        password
      });

      onLogin(response.data.token, email);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📊 RIDAS</h1>
        <p>Retail Inventory & Demand Analytics</p>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ridas.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Test@1234"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="test-creds">
          Test: admin@ridas.com / Test@1234
        </p>
      </div>
    </div>
  );
}

export default Login;