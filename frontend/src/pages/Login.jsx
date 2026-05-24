import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogIn, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, isAuthenticated, error, loading } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card animate-scale-in">
          
          {/* Logo icon header */}
          <div className="auth-logo-box">
            <User size={26} style={{ color: 'var(--color-wood-dark)' }} />
          </div>

          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to manage your premium athletic packs</p>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            
            {error && (
              <div className="auth-error-box">
                <ShieldAlert size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="e.g. arjun@yatrax.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Prompt */}
          <div className="auth-switch-prompt">
            Don&apos;t have an account? <Link to="/register">Create Account</Link>
          </div>

        </div>
      </div>
    </main>
  );
}
