import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Star, ShieldAlert, CheckCircle, PenTool, Image, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import api from '../utils/api';
import './OrderHistory.css';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { orders, reviews, addReview, loadOrderHistory } = useOrderStore();

  // Review Dialog State
  const [activeReviewProduct, setActiveReviewProduct] = useState(null); // { id, name, image } or null

  // 2FA Setup/Manage States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [show2faDisablePrompt, setShow2faDisablePrompt] = useState(false);
  const [qrUri, setQrUri] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [is2faLoading, setIs2faLoading] = useState(false);

  // Sync state with user profile loaded on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/api/users/me');
        setTwoFactorEnabled(response.data.twoFactorEnabled);
      } catch (err) {
        console.error("Failed to sync 2FA status", err);
      }
    };
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  const handleStart2faSetup = async () => {
    setIs2faLoading(true);
    setStatusMessage('');
    try {
      const response = await api.get('/api/auth/2fa/setup');
      setQrUri(response.data.otpauthUri);
      setSecretKey(response.data.secret);
      setShow2faSetup(true);
    } catch (err) {
      setStatusMessage("Failed to initiate setup: " + (err.response?.data || err.message));
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleConfirm2faEnable = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setIs2faLoading(true);
    setStatusMessage('');
    try {
      await api.post('/api/auth/2fa/enable', null, {
        params: {
          secret: secretKey,
          code: verifyCode.trim()
        }
      });
      setTwoFactorEnabled(true);
      setShow2faSetup(false);
      setVerifyCode('');
      alert("Two-Factor Authentication enabled successfully!!");
    } catch (err) {
      setStatusMessage(err.response?.data || err.message);
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleDisable2fa = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setIs2faLoading(true);
    setStatusMessage('');
    try {
      await api.post('/api/auth/2fa/disable', null, {
        params: {
          code: verifyCode.trim()
        }
      });
      setTwoFactorEnabled(false);
      setShow2faDisablePrompt(false);
      setVerifyCode('');
      alert("Two-Factor Authentication disabled successfully!!");
    } catch (err) {
      setStatusMessage(err.response?.data || err.message);
    } finally {
      setIs2faLoading(false);
    }
  };

  // Fetch orders from backend/localStorage on mount
  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory, isAuthenticated]);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenReviewModal = async (product) => {
    setActiveReviewProduct(product);
    setReviewSuccess(false);

    try {
      //Fetch latest reviews for this product from the database
      await useOrderStore.getState().fetchReviews(product.id);

      const latestReviews = useOrderStore.getState().reviews;

      //Look for existing review by active user name for this product
      const existing = latestReviews.find((r) => r.productId === parseInt(product.id) && r.author === (user?.name || 'Verified Buyer'));

      if (existing) {
        setRating(existing.rating);
        setReviewText(existing.text);
        setIsUpdating(true);
      } else {
        setRating(5);
        setReviewText('');
        setIsUpdating(false);
      }
    } catch (err) {
      console.error("Failed to sync review status with backend", err);
    }
  };

  const handleCloseReviewModal = () => {
    setActiveReviewProduct(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    try {
      //Dispatch the review to backend (handles both add and update dynamically)
      await addReview(activeReviewProduct.id, rating, reviewText.trim());
      setReviewSuccess(true);

      //Auto-close modal shortly
      setTimeout(() => {
        handleCloseReviewModal();
      }, 1500);
    } catch (err) {
      alert("Failed to submit review: " + err.message);
    }
  };

  // IF NOT LOGGED IN
  if (!isAuthenticated) {
    return (
      <main className="order-history-page">
        <div className="order-history-container animate-scale-in" style={{ textAlign: 'center', padding: '80px var(--space-xl)' }}>
          <ClipboardList size={64} style={{ color: 'var(--color-accent-gold)', marginBottom: '20px' }} />
          <h2 className="detail-name" style={{ fontSize: 'var(--fs-h2)', marginBottom: '10px' }}>
            Access Order History
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px', maxWidth: '440px', margin: '0 auto 30px' }}>
            Please authenticate yourself to access your order registry, track active shipments, and write handcrafted product reviews.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', borderRadius: '50px' }}>
            Log In / Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="order-history-page">
      <div className="order-history-container">

        <h1 className="order-history-title animate-fade-up stagger-1">My Orders</h1>
        <p className="order-history-subtitle animate-fade-up stagger-2">
          Track details, secure receipts, and leave custom reviews for your handcrafted calisthenics tools.
        </p>

        {orders.length === 0 ? (
          <div className="order-history-empty animate-scale-in stagger-3" style={{ textAlign: 'center', padding: '60px 0' }}>
            <ClipboardList size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '15px' }} />
            <h3 style={{ fontSize: 'var(--fs-medium)', color: 'var(--color-wood-dark)', marginBottom: '8px' }}>No Orders Found</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '25px', fontSize: 'var(--fs-small)' }}>
              You haven't placed any premium orders yet.
            </p>
            <Link to="/shop" className="btn btn-primary" style={{ padding: '0.6rem 2rem', borderRadius: '50px' }}>
              Shop Handcrafted parallettes
            </Link>
          </div>
        ) : (
          <div className="orders-list animate-fade-up stagger-3">
            {orders.map((order) => (
              <div key={order.id} className="order-card-wrapper">

                {/* Card Header metadata */}
                <div className="order-card-header">
                  <div className="header-meta-group">
                    <span className="meta-label">ORDER ID</span>
                    <span className="meta-val">{order.id}</span>
                  </div>
                  <div className="header-meta-group">
                    <span className="meta-label">DATE PLACED</span>
                    <span className="meta-val">{order.date}</span>
                  </div>
                  <div className="header-meta-group">
                    <span className="meta-label">TOTAL AMOUNT</span>
                    <span className="meta-val" style={{ fontWeight: 'bold', color: 'var(--color-wood-dark)' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className={`status-badge status-badge--${order.status.toLowerCase()}`}>
                    {order.status}
                  </div>
                </div>

                {/* Card body items */}
                <div className="order-card-items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                        <div className="item-thumbnail">
                          {item.image ? (
                            <img src={item.image} alt={item.name} />
                          ) : (
                            <div className="thumbnail-placeholder">X</div>
                          )}
                        </div>
                        <div className="item-details">
                          <h4 className="item-name">
                            <Link to={`/product/${item.id}`}>{item.name}</Link>
                          </h4>
                          <span className="item-specs">
                            Qty: {item.quantity} | {item.woodType} variant | ₹{item.price.toLocaleString('en-IN')}
                          </span>

                          {/* Engraving tags */}
                          {item.engravingRequest && (
                            <div className="item-engraving-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: 'var(--fs-tiny)', color: 'var(--color-accent-gold)' }}>
                              <PenTool size={10} />
                              <span>Laser Carved: &ldquo;{item.engravingRequest}&rdquo;</span>
                            </div>
                          )}
                          {item.engravingLogo && (
                            <div className="item-engraving-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: 'var(--fs-tiny)', color: 'var(--color-accent-gold)', marginLeft: '10px' }}>
                              <Image size={10} />
                              <span>Logo Carved: {item.engravingLogo.length > 15 ? `${item.engravingLogo.substring(0, 12)}...` : item.engravingLogo}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Review trigger */}
                      {(() => {
                        const existingReview = reviews.find(
                          (r) => r.productId === parseInt(item.id) && r.author === (user?.name || 'Verified Buyer')
                        );
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <button
                              className="qty-btn"
                              style={{
                                height: '36px',
                                padding: '0 15px',
                                borderRadius: '4px',
                                background: existingReview ? 'rgba(74, 124, 89, 0.08)' : 'rgba(92, 61, 46, 0.05)',
                                border: existingReview ? '1px solid rgba(74, 124, 89, 0.2)' : '1px solid transparent',
                                fontSize: 'var(--fs-tiny)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onClick={() => handleOpenReviewModal(item)}
                            >
                              <Star size={12} fill={existingReview ? 'var(--color-accent-gold)' : 'none'} style={{ color: 'var(--color-accent-gold)' }} />
                              <span style={{ fontWeight: 'bold', color: existingReview ? 'var(--color-accent-green)' : 'var(--color-wood-dark)' }}>
                                {existingReview ? 'Update Review' : 'Provide Review'}
                              </span>
                            </button>
                            {existingReview && (
                              <span style={{ fontSize: '9px', color: 'var(--color-accent-green)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle size={10} /> Verified Feedback Posted
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* 2FA Security Settings Card */}
        <div className="order-card-wrapper" style={{ marginTop: '40px', padding: '30px' }}>
          <h2 className="summary-title" style={{ fontSize: 'var(--fs-medium)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} style={{ color: 'var(--color-wood-dark)' }} />
            Security Preferences
          </h2>
          <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Protect your Yatra X customer account with Two-Factor Authentication (TOTP) step-up checks.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: '15px', background: 'rgba(92, 61, 46, 0.04)', borderRadius: '8px', border: '1px solid rgba(92, 61, 46, 0.08)' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--color-wood-dark)', fontSize: 'var(--fs-small)' }}>
                Google Authenticator / 2FA Status
              </div>
              <div style={{ fontSize: 'var(--fs-tiny)', color: twoFactorEnabled ? 'var(--color-accent-green)' : 'var(--color-text-muted)', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: twoFactorEnabled ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }} />
                {twoFactorEnabled ? 'ENABLED (Highly Secure)' : 'DISABLED (Recommended to enable)'}
              </div>
            </div>

            {twoFactorEnabled ? (
              <button 
                className="qty-btn"
                style={{ background: 'rgba(192, 57, 43, 0.08)', border: '1px solid rgba(192, 57, 43, 0.2)', color: '#C0392B', height: '40px', padding: '0 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => {
                  setShow2faDisablePrompt(true);
                  setStatusMessage('');
                  setVerifyCode('');
                }}
              >
                Disable 2FA
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                style={{ height: '40px', padding: '0 25px', borderRadius: '50px', margin: 0 }}
                onClick={handleStart2faSetup}
                disabled={is2faLoading}
              >
                {is2faLoading ? 'Loading...' : 'Setup Authenticator'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Write review inline Modal Overlay */}
      {activeReviewProduct && (
        <div className="review-modal-backdrop animate-fade-in" onClick={handleCloseReviewModal}>
          <div className="review-modal-card animate-scale-in" onClick={(e) => e.stopPropagation()}>

            {reviewSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--color-accent-green)', marginBottom: '15px' }} />
                <h3 style={{ color: 'var(--color-wood-dark)' }}>Review Published!</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-small)' }}>
                  Thank you for sharing your feedback. Your review is now published under the product!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview}>
                <h3 className="review-modal-title">{isUpdating ? 'Update Your Review' : 'Write a Review'}</h3>
                <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                  Reviewing: <strong>{activeReviewProduct.name}</strong>
                </p>

                {/* Rating selection (glowing gold stars) */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="review-star-btn"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: '2px' }}
                    >
                      <Star
                        size={36}
                        fill={star <= rating ? 'var(--color-accent-gold)' : 'none'}
                        className="review-star-icon"
                        style={{ color: 'var(--color-accent-gold)', transition: 'transform 0.2s ease' }}
                      />
                    </button>
                  ))}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'left', fontWeight: 'bold' }}>Your Training Feedback *</label>
                  <textarea
                    required
                    className="form-input review-textarea"
                    placeholder="Describe your training experience with this handcrafted parallette..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button type="button" className="skip-btn" style={{ flex: 1 }} onClick={handleCloseReviewModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-auth-submit" style={{ margin: 0, flex: 1 }}>
                    {isUpdating ? 'Update Feedback' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* 2FA SETUP MODAL OVERLAY */}
      {show2faSetup && (
        <div className="review-modal-backdrop animate-fade-in" onClick={() => setShow2faSetup(false)}>
          <div className="review-modal-card animate-scale-in" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="review-modal-title">Enable Authenticator App</h3>
            <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
              Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit verification code below:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', margin: '20px 0' }}>
              {qrUri ? (
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=5c3d2e&data=${encodeURIComponent(qrUri)}`}
                  alt="2FA QR Code"
                  style={{ padding: '10px', background: 'white', border: '1px solid rgba(92, 61, 46, 0.15)', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Loading QR Code...
                </div>
              )}
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                Secret Key: <strong>{secretKey}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirm2faEnable}>
              {statusMessage && (
                <div className="auth-error-box" style={{ marginBottom: '15px' }}>
                  <span>{statusMessage}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label" style={{ textAlign: 'left', fontWeight: 'bold' }}>Verification Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  className="form-input"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="skip-btn" style={{ flex: 1 }} onClick={() => setShow2faSetup(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ margin: 0, flex: 1 }} disabled={is2faLoading}>
                  {is2faLoading ? 'Enabling...' : 'Confirm & Enable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA DISABLE MODAL OVERLAY */}
      {show2faDisablePrompt && (
        <div className="review-modal-backdrop animate-fade-in" onClick={() => setShow2faDisablePrompt(false)}>
          <div className="review-modal-card animate-scale-in" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="review-modal-title">Disable Authenticator App</h3>
            <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
              Please enter the current 6-digit authenticator verification code to confirm disabling Two-Factor Authentication:
            </p>

            <form onSubmit={handleDisable2fa}>
              {statusMessage && (
                <div className="auth-error-box" style={{ marginBottom: '15px' }}>
                  <span>{statusMessage}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label" style={{ textAlign: 'left', fontWeight: 'bold' }}>Verification Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  className="form-input"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="skip-btn" style={{ flex: 1 }} onClick={() => setShow2faDisablePrompt(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-auth-submit" style={{ margin: 0, flex: 1, background: '#C0392B' }} disabled={is2faLoading}>
                  {is2faLoading ? 'Disabling...' : 'Verify & Disable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
