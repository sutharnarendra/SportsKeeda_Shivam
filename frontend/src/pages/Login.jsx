import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, LogIn, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const { login, loginWithGoogle, isAuthenticated, error, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract returnTo destination from query params (e.g., /login?returnTo=/checkout)
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo);
    }
  }, [isAuthenticated, navigate, returnTo]);

  useEffect(() => {
    if (location.state?.verified) {
      setSuccessMessage('Account verified successfully! Please log in.');
    }
  }, [location.state]);

  // Handle successfyl Google token generation
  const handleGoogleLoginSuccess = async (response) => {
    if (!response.credential) return;
    const result = await loginWithGoogle(response.credential);
    if (result.success) {
      if (result.twoFactorRequired) {
        setShow2fa(true);
      } else {
        navigate(returnTo);
      }
    }
  };

  //Render Google button
  useEffect(() => {
    /* global google */
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleLoginSuccess
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large", width: "100%", text: "continue_with" }
      );
    }
  }, [loginWithGoogle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const result = await login(email, password);
    if (result.success) {
      if (result.twoFactorRequired) {
        setShow2fa(true);
      } else {
        navigate(returnTo);
      }
    }
  };

  const handle2faSubmit = async (e) => {
    e.preventDefault();
    if (!totpCode.trim()) return;

    const result = await useAuthStore.getState().verify2FA(email, totpCode.trim());
    if (result.success) {
      navigate(returnTo);
    }
  };

  if (show2fa) {
    return (
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-card animate-scale-in">
            <div className="auth-logo-box">
              <User size={26} style={{ color: 'var(--color-wood-dark)' }} />
            </div>

            <h1 className="auth-title">Two-Factor Authentication</h1>
            <p className="auth-subtitle" style={{ marginBottom: '25px' }}>
              Enter the 6-digit verification code from your authenticator app (Google Authenticator / Microsoft Authenticator).
            </p>

            <form className="auth-form" onSubmit={handle2faSubmit}>
              {error && (
                <div className="auth-error-box" style={{ marginBottom: '15px' }}>
                  <ShieldAlert size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label">Authenticator Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="form-input"
                  placeholder="e.g. 123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' }}
                />
              </div>

              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button 
                type="button" 
                className="skip-btn" 
                style={{ marginTop: '10px', width: '100%', height: '44px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)', cursor: 'pointer', borderRadius: '8px', fontSize: 'var(--fs-small)' }} 
                onClick={() => setShow2fa(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

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

            {successMessage && (
              <div className="auth-success-box" style={{ background: 'rgba(74, 117, 89, 0.15)', border: '1px solid #4A7559', color: '#4A7559', padding: '10px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', fontSize: 'var(--fs-small)' }}>
                <CheckCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

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
            {/* Divider and Google login button */}
            <div className='auth-divider' style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 10px', fontSize: '12px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            {/* Premium Animated Google Login Wrapper */}
            <div
              className="google-btn-wrapper"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* This is the visual button that expands */}
              <div className={`custom-google-btn ${isHovered ? `expanded` : ''}`}>
                <div className="google-icon-container">
                  <svg viewBox='0 0 24 24' width='20' height='20' xmlns='http://www.w3.org/2000/svg'>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <span className="google-btn-text">Continue with Google</span>
              </div>
              {/* This is Google's actual invisible ifram button covering the whole wrapper */}
              <div id="google-signin-button"></div>
            </div>
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

