import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Sparkles, ShieldAlert, Loader2, ArrowRight, ArrowLeft, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register, verify, isAuthenticated, error, loading } = useAuthStore();

  // Multi-step Registration Wizard State (1 = Credentials, 2 = Address, 3 = Payment, 4 = Verification)
  const [currentStep, setCurrentStep] = useState(1);
  const [validationError, setValidationError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Step 1: Account Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Shipping Address Details
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  // Step 3: Payment Preferences (Optional)
  const [paymentType, setPaymentType] = useState('none'); // 'none', 'upi', 'card'
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Handle Address change
  const handleAddressChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value,
    });
  };

  // Handle Card details change
  const handleCardChange = (e) => {
    setCardDetails({
      ...cardDetails,
      [e.target.name]: e.target.value,
    });
  };

  // Next Step trigger for Step 1
  const handleStep1Next = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!name || !email || !password || !confirmPassword) {
      setValidationError('Please fill in all account credential fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setCurrentStep(2);
  };

  // Next Step trigger for Step 2
  const handleStep2Next = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!address.street || !address.city || !address.state || !address.postalCode) {
      setValidationError('Please provide a complete shipping address.');
      return;
    }

    setCurrentStep(3);
  };

  // Complete Registration step
  const handleCompleteRegister = async (e, skipPayment = false) => {
    if (e) e.preventDefault();
    setValidationError('');

    let finalPayment = null;
    if (!skipPayment && paymentType !== 'none') {
      if (paymentType === 'upi') {
        if (!upiId.trim()) {
          setValidationError('Please enter a valid UPI ID (e.g. user@okaxis).');
          return;
        }
        finalPayment = { type: 'upi', upiId: upiId.trim() };
      } else if (paymentType === 'card') {
        if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.cardExpiry) {
          setValidationError('Please complete all your credit card details.');
          return;
        }
        finalPayment = { type: 'card', ...cardDetails };
      }
    }

    // Call the updated register function in the Zustand store
    const result = await register(name, email, password, address, finalPayment);
    if (result.success) {
      if (result.needsVerification) {
        setRegisteredEmail(result.email || email);
        setCurrentStep(4);
      } else {
        navigate('/');
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setValidationError('Please enter a 6-digit verification code.');
      return;
    }

    const result = await verify(registeredEmail, otpCode.trim());
    if (result.success) {
      navigate('/login', { state: { verified: true } });
    }
  };

  const displayError = validationError || error;

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-card animate-scale-in">
          
          {/* Logo icon header */}
          <div className="auth-logo-box">
            <UserPlus size={26} style={{ color: 'var(--color-wood-dark)' }} />
          </div>

          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the collective to track your training orders</p>

          {/* Staggered progress dots */}
          <div className="step-indicator-bar">
            <div className={`step-dot ${currentStep === 1 ? 'step-dot--active' : ''} ${currentStep > 1 ? 'step-dot--completed' : ''}`} title="Account Credentials" />
            <div className={`step-dot ${currentStep === 2 ? 'step-dot--active' : ''} ${currentStep > 2 ? 'step-dot--completed' : ''}`} title="Shipping Address" />
            <div className={`step-dot ${currentStep === 3 ? 'step-dot--active' : ''} ${currentStep > 3 ? 'step-dot--completed' : ''}`} title="Payment Preferences" />
            <div className={`step-dot ${currentStep === 4 ? 'step-dot--active' : ''}`} title="Verify Email" />
          </div>

          {/* Form container */}
          <div className="auth-form">
            
            {displayError && (
              <div className="auth-error-box">
                <ShieldAlert size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span>{displayError}</span>
              </div>
            )}

            {/* STEP 1: ACCOUNT CREDENTIALS */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1Next} className="animate-fade-up">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Arjun Mehta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. arjun@yatrax.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-auth-submit" style={{ marginTop: '20px' }}>
                  Next: Shipping Address <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                </button>
              </form>
            )}

            {/* STEP 2: SHIPPING ADDRESS DETAILS */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2Next} className="animate-fade-up">
                <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', marginBottom: '15px', textAlign: 'center' }}>
                  Step 2 of 3: Provide your default shipping address. You can instantly select this address during checkout.
                </p>

                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <input
                    type="text"
                    name="street"
                    required
                    className="form-input"
                    placeholder="House number, apartment, street name"
                    value={address.street}
                    onChange={handleAddressChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    className="form-input"
                    placeholder="e.g. Mumbai"
                    value={address.city}
                    onChange={handleAddressChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input
                    type="text"
                    name="state"
                    required
                    className="form-input"
                    placeholder="e.g. Maharashtra"
                    value={address.state}
                    onChange={handleAddressChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Postal Code *</label>
                  <input
                    type="text"
                    name="postalCode"
                    required
                    className="form-input"
                    placeholder="e.g. 400001"
                    value={address.postalCode}
                    onChange={handleAddressChange}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="qty-btn" style={{ width: '48px', height: '48px', borderRadius: '50%' }} onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={16} />
                  </button>
                  <button type="submit" className="btn-auth-submit" style={{ margin: 0, flex: 1 }}>
                    Next: Payment Info <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: PAYMENT PREFERENCES (OPTIONAL / CAN SKIP!) */}
            {currentStep === 3 && (
              <form onSubmit={(e) => handleCompleteRegister(e, false)} className="animate-fade-up">
                <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', marginBottom: '15px', textAlign: 'center' }}>
                  Step 3 of 3 (Optional): Save secure payment details for direct 1-click amount auto-requests at checkout. <strong>You can securely skip this page.</strong>
                </p>

                <div className="payment-options" style={{ marginBottom: '15px' }}>
                  <div
                    className={`payment-option-card ${paymentType === 'none' ? 'payment-option-card--active' : ''}`}
                    style={{ padding: 'var(--space-md)' }}
                    onClick={() => setPaymentType('none')}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentType === 'none'}
                      onChange={() => setPaymentType('none')}
                      className="payment-radio"
                    />
                    <div className="payment-details">
                      <span className="payment-title" style={{ fontSize: 'var(--fs-small)' }}>Do Not Save Payment Info</span>
                      <span className="payment-desc">I prefer providing payment info at checkout.</span>
                    </div>
                  </div>

                  <div
                    className={`payment-option-card ${paymentType === 'upi' ? 'payment-option-card--active' : ''}`}
                    style={{ padding: 'var(--space-md)' }}
                    onClick={() => setPaymentType('upi')}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentType === 'upi'}
                      onChange={() => setPaymentType('upi')}
                      className="payment-radio"
                    />
                    <div className="payment-details">
                      <span className="payment-title" style={{ fontSize: 'var(--fs-small)' }}>Save UPI Address (Encrypted)</span>
                      <span className="payment-desc">Provide your default UPI VPA handle.</span>
                    </div>
                  </div>

                  <div
                    className={`payment-option-card ${paymentType === 'card' ? 'payment-option-card--active' : ''}`}
                    style={{ padding: 'var(--space-md)' }}
                    onClick={() => setPaymentType('card')}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentType === 'card'}
                      onChange={() => setPaymentType('card')}
                      className="payment-radio"
                    />
                    <div className="payment-details">
                      <span className="payment-title" style={{ fontSize: 'var(--fs-small)' }}>Save Card Details (Encrypted)</span>
                      <span className="payment-desc">We strictly encrypt and decrypt key credentials.</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Form for UPI */}
                {paymentType === 'upi' && (
                  <div className="form-group animate-fade-up">
                    <label className="form-label">UPI ID / VPA *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. arjun@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                )}

                {/* Sub-Form for CARD */}
                {paymentType === 'card' && (
                  <div className="animate-fade-up">
                    <div className="form-group">
                      <label className="form-label">Card Number *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. 4321 8765 2468 1357"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                      />
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Name on Card *</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Arjun Mehta"
                          value={cardDetails.cardName}
                          onChange={(e) => setCardDetails({ ...cardDetails, cardName: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expiry (MM/YY) *</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="12/29"
                          value={cardDetails.cardExpiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, cardExpiry: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="qty-btn" style={{ width: '48px', height: '48px', borderRadius: '50%' }} onClick={() => setCurrentStep(2)}>
                    <ArrowLeft size={16} />
                  </button>
                  
                  {paymentType === 'none' ? (
                    <button
                      type="button"
                      className="btn-auth-submit"
                      style={{ margin: 0, flex: 1 }}
                      onClick={(e) => handleCompleteRegister(e, true)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Complete & Register</>}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="skip-btn"
                        onClick={(e) => handleCompleteRegister(e, true)}
                        disabled={loading}
                      >
                        Skip
                      </button>
                      <button
                        type="submit"
                        className="btn-auth-submit"
                        style={{ margin: 0, flex: 1 }}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Save & Register</>}
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}

            {/* STEP 4: EMAIL VERIFICATION (OTP CHECK) */}
            {currentStep === 4 && (
              <form onSubmit={handleVerifyOtp} className="animate-fade-up">
                <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', marginBottom: '15px', textAlign: 'center' }}>
                  Step 4 of 4: Enter the 6-digit OTP code sent to your email.
                </p>

                <div className="form-group">
                  <label className="form-label">Verification Code (6-digit OTP)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: 'var(--fs-medium)', fontWeight: 'bold' }}
                  />
                </div>

                <button type="submit" className="btn-auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Verify & Activate</>}
                </button>
              </form>
            )}

          </div>

          {/* Prompt */}
          <div className="auth-switch-prompt">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>

        </div>
      </div>
    </main>
  );
}
