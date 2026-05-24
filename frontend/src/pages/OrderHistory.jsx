import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Star, ShieldAlert, CheckCircle, PenTool, Image, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import './OrderHistory.css';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { orders, reviews, addReview } = useOrderStore();

  // Review Dialog State
  const [activeReviewProduct, setActiveReviewProduct] = useState(null); // { id, name, image } or null
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenReviewModal = (product) => {
    setActiveReviewProduct(product);
    setReviewSuccess(false);

    // Look for existing review by active user name for this product
    const existing = reviews.find(
      (r) => r.productId === parseInt(product.id) && r.author === (user?.name || 'Verified Buyer')
    );

    if (existing) {
      setRating(existing.rating);
      setReviewText(existing.text);
      setIsUpdating(true);
    } else {
      setRating(5);
      setReviewText('');
      setIsUpdating(false);
    }
  };

  const handleCloseReviewModal = () => {
    setActiveReviewProduct(null);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    // Dispatch the review to store (handles both add and update dynamically)
    addReview(activeReviewProduct.id, rating, reviewText.trim(), user?.name || 'Verified Buyer');
    setReviewSuccess(true);

    // Auto-close modal shortly
    setTimeout(() => {
      handleCloseReviewModal();
    }, 1500);
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
    </main>
  );
}
