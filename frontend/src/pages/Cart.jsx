import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, PenTool, Image } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import './Cart.css';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const subtotal = getTotalPrice();
  
  // Custom Taxation & Pricing calculations
  const shippingCost = subtotal > 3000 ? 0 : 250;
  const gstRate = 0.18; // 18% GST standard fitness gear rate in India
  const gstCost = useMemo(() => Math.round(subtotal * gstRate), [subtotal]);
  const grandTotal = subtotal + shippingCost + gstCost;

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      navigate('/login?returnTo=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <main className="cart-page">
      <div className="cart-container">
        
        {items.length > 0 ? (
          <>
            <h1 className="cart-title animate-fade-up stagger-1">Your Training Pack</h1>
            
            {/* Split layout: Items on Left, Order summary on Right */}
            <div className="cart-layout">
              
              {/* Items List */}
              <div className="cart-list animate-fade-up stagger-2">
                {items.map((item, idx) => {
                  const itemPrice = item.variant.price * item.quantity;
                  return (
                    <div
                      key={`${item.product.id}-${item.variant.woodType}-${idx}`}
                      className="cart-item"
                    >
                      {/* Media Image */}
                      <div className="cart-item-media">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="cart-item-image"
                          />
                        ) : (
                          <span className="cart-item-placeholder">Yatra X</span>
                        )}
                      </div>

                      {/* Text details */}
                      <div className="cart-item-info">
                        <h3 className="cart-item-name">
                          <Link to={`/product/${item.product.id}`}>{item.product.name}</Link>
                        </h3>
                        <p className="cart-item-variant">Wood Variant: {item.variant.woodType}</p>
                        
                        {/* Custom laser carving request detail */}
                        {item.product.engravingRequest && (
                          <div className="cart-item-engrave">
                            <PenTool size={11} />
                            Carving: &ldquo;{item.product.engravingRequest}&rdquo;
                          </div>
                        )}

                        {/* Custom laser carving logo request detail */}
                        {item.product.engravingLogo && (
                          <div className="cart-item-engrave" style={{ marginTop: '4px', gap: '6px' }}>
                            <Image size={11} />
                            <span>Logo: {item.product.engravingLogo.length > 15 ? `${item.product.engravingLogo.substring(0, 12)}...` : item.product.engravingLogo}</span>
                            {item.product.engravingLogoPreview && (
                              <img
                                src={item.product.engravingLogoPreview}
                                alt="Logo preview"
                                style={{ width: '18px', height: '18px', borderRadius: '2px', objectFit: 'cover', border: '1px solid var(--glass-border)', marginLeft: '4px' }}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions, Qty toggler, Price */}
                      <div className="cart-item-actions">
                        <div className="qty-selector" style={{ height: '40px' }}>
                          <button
                            className="qty-btn"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.variant.woodType,
                                item.quantity - 1
                              )
                            }
                          >
                            -
                          </button>
                          <span className="qty-val" style={{ fontSize: 'var(--fs-small)' }}>
                            {item.quantity}
                          </span>
                          <button
                            className="qty-btn"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.variant.woodType,
                                item.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-price">
                          ₹{itemPrice.toLocaleString('en-IN')}
                        </div>

                        <button
                          className="btn-remove-item"
                          onClick={() => removeFromCart(item.product.id, item.variant.woodType)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  );
                })}

                {/* Back to catalog helper */}
                <div style={{ marginTop: '20px' }}>
                  <Link to="/shop" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '50px', border: '1px solid rgba(92, 61, 46, 0.2)' }}>
                    <ArrowLeft size={14} /> Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Order summary Breakdown sidebar */}
              <div className="cart-summary animate-fade-up stagger-3">
                <h2 className="summary-title">Order Summary</h2>
                
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="summary-row">
                  <span>Shipping Cost</span>
                  <span>{shippingCost === 0 ? 'FREE' : `₹${shippingCost.toLocaleString('en-IN')}`}</span>
                </div>

                <div className="summary-row">
                  <span>Tax & GST (18%)</span>
                  <span>₹{gstCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="summary-row summary-row--total">
                  <span>Total Amount</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <button className="btn-checkout" onClick={handleCheckoutClick}>
                  Proceed to Checkout <ArrowRight size={16} />
                </button>

                {/* Guarantee trust badges */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    marginTop: '20px',
                    fontSize: 'var(--fs-tiny)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <ShieldCheck size={14} style={{ color: 'var(--color-accent-green)' }} />
                  <span>Secure SSL 256-bit encrypted transaction</span>
                </div>
              </div>

            </div>
          </>
        ) : (
          /* Empty state */
          <div className="cart-empty animate-scale-in stagger-1">
            <ShoppingBag size={64} style={{ color: 'var(--color-accent-gold)', marginBottom: '20px' }} />
            <h2 className="cart-empty-title">Your Cart is Empty</h2>
            <p className="cart-empty-desc">
              Looks like you haven&apos;t added any premium training equipment to your pack yet. Explore our handcrafted collection to get started.
            </p>
            <Link to="/shop" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.8rem 2rem', borderRadius: '50px' }}>
              Explore Collection <ArrowRight size={16} />
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
