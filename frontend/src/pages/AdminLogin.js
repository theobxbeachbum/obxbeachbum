import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/admin/login', { password });
      if (response.data.success) {
        toast.success('Login successful!');
        onLogin(response.data.token);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page" style={{
      backgroundImage: 'url(https://customer-assets.emergentagent.com/job_photo-letter/artifacts/8umk2j0t_2024-OBXBB-2023-01-18_9706-Edit-Edit.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="public-container" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 data-testid="admin-login-title">Admin Login</h1>
        <p>Enter your password to access the admin panel</p>

        <form onSubmit={handleSubmit} data-testid="admin-login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              data-testid="password-input"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit-btn"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
          Default password: <strong>admin123</strong><br />
          (Change it in Settings after login)
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;