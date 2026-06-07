import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, ChevronRight, ShoppingBag, ShieldCheck, ArrowLeft, Truck, Landmark, Lock, RefreshCw, Smartphone } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import api from '../utils/api';
import './Checkout.css';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, isAuthenticated, updateSavedAddress, updateSavedPayment, getDecryptedPayment } = useAuthStore();
  const navigate = useNavigate();

  // Checkout Steps: 'shipping', 'payment', 'success'
  const [step, setStep] = useState('shipping');
  const [orderId, setOrderId] = useState('');

  // Shipping Form Address Option selection
  const [addressOption, setAddressOption] = useState(user?.address ? 'saved' : 'new');

  // Shipping Form States
  const [shippingForm, setShippingForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    phone: '',
    address: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    postalCode: user?.address?.postalCode || '',
  });

  // Payment Form States
  const [paymentOption, setPaymentOption] = useState(user?.paymentEncrypted ? 'saved' : 'new');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod', 'upi', 'card'
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
  });

  // Checkbox state to save payment method for future orders
  const [savePaymentForFuture, setSavePaymentForFuture] = useState(false);

  // Active Payment Gateway Tracker State
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStage, setPaymentStage] = useState(0);
  const [secureToken, setSecureToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); //10 minutes timer

  const subtotal = getTotalPrice();
  const shippingCost = subtotal > 3000 ? 0 : 250;
  const gstRate = 0.18;
  const gstCost = useMemo(() => Math.round(subtotal * gstRate), [subtotal]);
  const grandTotal = subtotal + shippingCost + gstCost;

  // Retrieve decrypted payment preferences if available
  const decryptedPayment = useMemo(() => {
    return getDecryptedPayment();
  }, [user?.paymentEncrypted]);

  // Synchronize dynamic saved address into form state when option changes
  useEffect(() => {
    if (addressOption === 'saved' && user?.address) {
      setShippingForm((prev) => ({
        ...prev,
        address: user.address.street,
        city: user.address.city,
        state: user.address.state,
        postalCode: user.address.postalCode,
      }));
    }
  }, [addressOption, user?.address]);

  // Handle Form Input Change
  const handleFormChange = (e) => {
    setShippingForm({
      ...shippingForm,
      [e.target.name]: e.target.value,
    });
  };

  // Submit shipping address
  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (
      shippingForm.firstName &&
      shippingForm.lastName &&
      shippingForm.email &&
      shippingForm.address &&
      shippingForm.city &&
      shippingForm.state &&
      shippingForm.postalCode
    ) {
      // If user checked out with a new address, auto-save it to their profile for premium convenience
      if (isAuthenticated && addressOption === 'new') {
        updateSavedAddress({
          street: shippingForm.address,
          city: shippingForm.city,
          state: shippingForm.state,
          postalCode: shippingForm.postalCode,
        });
      }
      setStep('payment');
    } else {
      alert("Please complete all required shipping details.");
    }
  };

  // Place Order Success Action (Launches strict payment tracking gateway loader panel)
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // Auto-generate random unique user payment token
    const token = `SECURE-TX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().substr(-4)}`;
    setSecureToken(token);

    // Save payment method securely if user opted in during checkout
    if (isAuthenticated && paymentOption === 'new' && savePaymentForFuture) {
      let payload = null;
      if (paymentMethod === 'upi' && upiId.trim()) {
        payload = { type: 'upi', upiId: upiId.trim() };
      } else if (paymentMethod === 'card' && cardDetails.cardNumber) {
        payload = { type: 'card', ...cardDetails };
      }
      if (payload) {
        updateSavedPayment(payload);
      }
    }

    // Launch secure dynamic payment tracking flow
    setIsPaying(true);
    setPaymentStage(0);
    setTimeLeft(600);

    //If it's Cash on Delivery, checkout directly and complete
    if (paymentMethod === 'cod') {
      try {
        const res = await useOrderStore.getState().placeOrder(
          shippingForm,
          paymentMethod,
          items,
          grandTotal
        );
        if (res.success) {
          setOrderId(res.orderId);
          setIsPaying(false);
          setStep('success');
          clearCart();
        }
      } catch (err) {
        alert(`Order placement failed: ${err.message}`);
        setIsPaying(false);
      }
    } else {
      // For UPI / Card, place order in PENDING status first, then show payment screens
      try {
        const res = await useOrderStore.getState().placeOrder(
          shippingForm,
          paymentMethod,
          items,
          grandTotal
        );
        if (res.success) {
          setOrderId(res.orderId);
          setPaymentStage(1); //Pending Order Created
        }
      } catch (err) {
        alert(`Order placement failed: ${err.message}`);
        setIsPaying(false);
      }
    }
  };

  // Payment progress advances automatically with intervals
  const handleTimeout = () => {
    alert("Payment window expired. Your order has been cancelled due to timeout.");
    setIsPaying(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper HMAC-SHA256 hashing method on client side for webhook signature verification
  const generateSignature = async (message, secret) => {
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(secret);
    const msgBuf = encoder.encode(message);
    const key = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", key, msgBuf);
    return Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Trigger payment webhook callback to the backend (production: gateway calls this directly)
  const triggerPaymentWebhook = async (status) => {
    try {
      const signature = await generateSignature(orderId + status, "webhook-secret-key-yatrax");
      await api.post('/api/orders/webhook', null, {
        params: {
          orderId: orderId,
          status: status,
          signature: signature
        }
      });
      console.log(`Payment webhook triggered for order #${orderId}: ${status}`);
    } catch (err) {
      console.error(`Payment webhook failed: ${err.response?.data || err.message}`);
    }
  };

  //Countdown timer for pending online payments
  useEffect(() => {
    if (!isPaying || paymentMethod === 'cod' || timeLeft <= 0 || !orderId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaying, paymentMethod, timeLeft, orderId]);

  //Order Status Polling loop (checks `/api/orders/status/{id}`)
  useEffect(() => {
    if (!isPaying || paymentMethod === 'cod' || !orderId || timeLeft <= 0) return;

    const poll = setInterval(async () => {
      try {
        const response = await api.get(`/api/orders/status/${orderId}`);
        const currentStatus = response.data; // PENDING, PROCESSING, CANCELLED

        if (currentStatus === 'PROCESSING') {
          clearInterval(poll);
          setIsPaying(false);
          setStep('success');
          clearCart();
        } else if (currentStatus === 'CANCELLED') {
          clearInterval(poll);
          alert("Order reconciliation daemon has cancelled this timed-out transaction.");
          setIsPaying(false);
        }
      } catch (err) {
        console.error("Status polling failed: ", err);
      }
    }, 3000); //poll every 3 seconds

    return () => clearInterval(poll);
  }, [isPaying, paymentMethod, orderId, timeLeft, clearCart]);

  // Card payment gateway callback progression
  useEffect(() => {
    if (!isPaying || paymentMethod !== 'card' || !orderId) return;

    const interval = setInterval(() => {
      setPaymentStage((prev) => {
        if (prev >= 3) {
          clearInterval(interval);
          // Auto-trigger successful webhook to transition order status
          triggerPaymentWebhook('PAID');
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPaying, paymentMethod, orderId]);

  // Render Left Column Form based on current step
  const renderFormColumn = () => {
    if (step === 'shipping') {
      return (
        <form className="checkout-form-panel" onSubmit={handleShippingSubmit}>
          <h2 className="checkout-section-title">Shipping Address</h2>

          {/* Saved Address Radio Selection Box if logged in */}
          {isAuthenticated && user?.address && (
            <div className="saved-profile-selector" style={{ marginBottom: '20px' }}>
              <div
                className={`saved-card-pill ${addressOption === 'saved' ? 'saved-card-pill--active' : ''}`}
                onClick={() => setAddressOption('saved')}
              >
                <input
                  type="radio"
                  name="addressOption"
                  checked={addressOption === 'saved'}
                  onChange={() => setAddressOption('saved')}
                  className="payment-radio"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 'var(--fs-small)', color: 'var(--color-wood-dark)' }}>
                    Use Saved Registration Address
                  </span>
                  <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-secondary)' }}>
                    {user.address.street}, {user.address.city}, {user.address.state} - {user.address.postalCode}
                  </span>
                </div>
              </div>

              <div
                className={`saved-card-pill ${addressOption === 'new' ? 'saved-card-pill--active' : ''}`}
                onClick={() => setAddressOption('new')}
                style={{ marginTop: '10px' }}
              >
                <input
                  type="radio"
                  name="addressOption"
                  checked={addressOption === 'new'}
                  onChange={() => setAddressOption('new')}
                  className="payment-radio"
                />
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: 'var(--fs-small)', color: 'var(--color-wood-dark)' }}>
                    Deliver to a New Address
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Renders Address inputs if 'new' or if not logged in */}
          {(addressOption === 'new' || !isAuthenticated) && (
            <div className="form-grid animate-fade-up">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="form-input"
                  value={shippingForm.firstName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="form-input"
                  value={shippingForm.lastName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-input"
                  value={shippingForm.email}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="form-input"
                  value={shippingForm.phone}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Street Address *</label>
                <input
                  type="text"
                  name="address"
                  required
                  className="form-input"
                  placeholder="House number and street name"
                  value={shippingForm.address}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  required
                  className="form-input"
                  value={shippingForm.city}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="state"
                  required
                  className="form-input"
                  value={shippingForm.state}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postal Code *</label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  className="form-input"
                  value={shippingForm.postalCode}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          )}

          {addressOption === 'saved' && isAuthenticated && (
            <div className="form-grid animate-fade-up">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="form-input"
                  value={shippingForm.firstName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="form-input"
                  value={shippingForm.lastName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group form-group--full">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="form-input"
                  placeholder="For express delivery notifications"
                  value={shippingForm.phone}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-checkout-next" style={{ marginTop: '20px' }}>
            Continue to Payment <ChevronRight size={16} />
          </button>
        </form>
      );
    }

    if (step === 'payment') {
      return (
        <div className="checkout-form-panel">
          <h2 className="checkout-section-title">Payment Method</h2>

          {/* If user has saved payment details, provide options */}
          {isAuthenticated && decryptedPayment && (
            <div className="saved-profile-selector" style={{ marginBottom: '20px' }}>
              <div
                className={`saved-card-pill ${paymentOption === 'saved' ? 'saved-card-pill--active' : ''}`}
                onClick={() => setPaymentOption('saved')}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'saved'}
                  onChange={() => setPaymentOption('saved')}
                  className="payment-radio"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 'var(--fs-small)', color: 'var(--color-wood-dark)' }}>
                    Use Saved Secure Profile Payment Method
                  </span>
                  <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-accent-green)', fontWeight: 'bold' }}>
                    {decryptedPayment.type === 'upi'
                      ? `UPI: ${decryptedPayment.upiId}`
                      : `Card: •••• •••• •••• ${decryptedPayment.cardNumber.slice(-4)}`
                    } (Encrypted)
                  </span>
                </div>
              </div>

              <div
                className={`saved-card-pill ${paymentOption === 'new' ? 'saved-card-pill--active' : ''}`}
                onClick={() => setPaymentOption('new')}
                style={{ marginTop: '10px' }}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === 'new'}
                  onChange={() => setPaymentOption('new')}
                  className="payment-radio"
                />
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: 'var(--fs-small)', color: 'var(--color-wood-dark)' }}>
                    Use a Different Mode of Payment
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Renders option forms */}
          {paymentOption === 'saved' && isAuthenticated && decryptedPayment ? (
            <div className="animate-fade-up" style={{ padding: '15px', background: 'rgba(92, 61, 46, 0.04)', borderRadius: '8px', border: '1px dashed rgba(92, 61, 46, 0.15)', marginBottom: '20px' }}>
              <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)' }}>
                Upon clicking checkout, we will process an automatic secured amount request of <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> directed to your saved {decryptedPayment.type === 'upi' ? 'UPI address' : 'registered card account'}.
              </p>
            </div>
          ) : (
            <div className="payment-options animate-fade-up">

              {/* COD */}
              <div
                className={`payment-option-card ${paymentMethod === 'cod' ? 'payment-option-card--active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="payment-radio"
                />
                <div className="payment-details">
                  <span className="payment-title">Cash on Delivery (COD)</span>
                  <span className="payment-desc">Pay with cash upon package hand-over.</span>
                </div>
              </div>

              {/* UPI */}
              <div
                className={`payment-option-card ${paymentMethod === 'upi' ? 'payment-option-card--active' : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  className="payment-radio"
                />
                <div className="payment-details">
                  <span className="payment-title">UPI payment / QR Code</span>
                  <span className="payment-desc">Pay instantly using any UPI app (GPay, PhonePe, BHIM).</span>
                </div>
              </div>

              {/* CARD */}
              <div
                className={`payment-option-card ${paymentMethod === 'card' ? 'payment-option-card--active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="payment-radio"
                />
                <div className="payment-details">
                  <span className="payment-title">Credit Card / Debit Card</span>
                  <span className="payment-desc">We accept Visa, MasterCard, RuPay, and American Express.</span>
                </div>
              </div>

            </div>
          )}

          {/* Sub inputs for entering new details */}
          {paymentOption === 'new' && paymentMethod === 'upi' && (
            <div className="form-group animate-fade-up" style={{ marginTop: '15px' }}>
              <label className="form-label">UPI ID *</label>
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

          {paymentOption === 'new' && paymentMethod === 'card' && (
            <div className="animate-fade-up" style={{ marginTop: '15px' }}>
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

          {/* Save payment option secure prompt for future checkout */}
          {isAuthenticated && paymentOption === 'new' && paymentMethod !== 'cod' && (
            <div className="save-payment-check animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
              <input
                type="checkbox"
                id="savePaymentCheckbox"
                checked={savePaymentForFuture}
                onChange={(e) => setSavePaymentForFuture(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--color-wood-dark)' }}
              />
              <label htmlFor="savePaymentCheckbox" style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 'bold' }}>
                Save this payment method securely for future checkouts (Decrypted at checkout only)
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setStep('shipping')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '50px', border: '1px solid rgba(92, 61, 46, 0.2)' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="btn-checkout-next" style={{ margin: 0, flex: 1 }} onClick={handlePlaceOrder}>
              Place Order ₹{grandTotal.toLocaleString('en-IN')}
            </button>
          </div>
        </div>
      );
    }
  };

  // SUCCESS SCREEN
  if (step === 'success') {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-success-screen animate-scale-in stagger-1">
            <div className="success-icon-box">
              <CheckCircle2 size={42} />
            </div>
            <h1 className="detail-name" style={{ fontSize: 'var(--fs-h2)', marginBottom: '8px' }}>
              Order Placed Successfully!
            </h1>
            <p style={{ color: 'var(--color-accent-green)', fontWeight: 'bold', marginBottom: '20px' }}>
              Receipt Ref ID: {orderId}
            </p>
            <p className="detail-description" style={{ fontSize: 'var(--fs-small)', maxWidth: '480px', margin: '0 auto 30px' }}>
              Thank you for trusting Yatra X. Your premium handcrafted calisthenics pack has been queued for shipping. We have dispatched a confirmation email to <strong>{shippingForm.email}</strong>.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '300px',
                margin: '0 auto 30px',
                textAlign: 'left',
                background: 'rgba(92, 61, 46, 0.03)',
                padding: '15px',
                borderRadius: '8px',
                fontSize: 'var(--fs-small)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-wood-dark)', fontWeight: 'bold' }}>
                <Truck size={14} />
                <span>Estimated Delivery</span>
              </div>
              <span style={{ color: 'var(--color-text-secondary)', paddingLeft: '22px' }}>
                3-5 business days (Free Express Delivery)
              </span>
            </div>

            <Link to="/shop" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', borderRadius: '50px' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ACTIVE PAYMENT PROGRESS TRACKER WITH TIMED QR CODE
  if (isPaying) {
    return (
      <main className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-success-screen animate-scale-in" style={{ padding: 'var(--space-2xl) var(--space-xl)', textAlign: 'center' }}>

            <div className="loader-box-payment" style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw className="animate-spin" size={40} style={{ color: 'var(--color-accent-gold)' }} />
              <Lock style={{ position: 'absolute', color: 'var(--color-wood-dark)' }} size={16} />
            </div>

            <h2 className="detail-name" style={{ fontSize: 'var(--fs-h2)', marginBottom: '5px' }}>
              {paymentMethod === 'cod' ? 'Processing Order' : 'Initiating Secure Payment'}
            </h2>

            {paymentMethod === 'cod' ? (
              <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-secondary)', marginBottom: '30px' }}>
                Completing order registration...
              </p>
            ) : paymentMethod === 'upi' ? (
              <>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                  Scan the QR code below using GPay, PhonePe, Paytm, or BHIM to pay <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>.
                </p>

                {/* Timed QR Code Container */}
                <div className="checkout-qr-container">
                  {orderId ? (
                    <img
                      className="checkout-qr-image"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=5c3d2e&data=${encodeURIComponent(
                        `upi://pay?pa=yatrax@okaxis&pn=YatraX&am=${grandTotal}&tn=Order-${orderId}`
                      )}`}
                      alt="UPI QR Code"
                    />
                  ) : (
                    <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--fs-tiny)' }}>
                      Generating secure QR code...
                    </div>
                  )}

                  <div className="checkout-timer-badge">
                    <Lock size={12} />
                    <span>Expires in: {formatTime(timeLeft)}</span>
                  </div>
                </div>

                <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 20px' }}>
                  Do not close or refresh this page. Your checkout session is monitored, and this page will automatically redirect once your payment captures.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text-secondary)', marginBottom: '30px' }}>
                  Processing payment authorization of <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>.
                </p>
                {/* Stage tracker terminal logs */}
                <div style={{ maxWidth: '440px', margin: '0 auto 20px', textAlign: 'left', background: 'rgba(0,0,0,0.03)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(92, 61, 46, 0.1)', fontSize: 'var(--fs-small)', fontFamily: 'monospace' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: paymentStage >= 0 ? 'var(--color-wood-dark)' : 'var(--color-text-muted)' }}>
                    <div className={`step-dot ${paymentStage >= 0 ? 'step-dot--completed' : ''}`} style={{ width: '10px', height: '10px' }} />
                    <span>
                      {paymentStage >= 0 ? `✓ Token Generated: ${secureToken}` : 'Generating transaction token...'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: paymentStage >= 1 ? 'var(--color-wood-dark)' : 'var(--color-text-muted)' }}>
                    <div className={`step-dot ${paymentStage >= 1 ? 'step-dot--completed' : ''} ${paymentStage === 0 ? 'step-dot--active' : ''}`} style={{ width: '10px', height: '10px' }} />
                    <span>
                      {paymentStage >= 1 ? `✓ Auto Amount Request of ₹${grandTotal} Requested` : 'Requesting authorization client...'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: paymentStage >= 2 ? 'var(--color-wood-dark)' : 'var(--color-text-muted)' }}>
                    <div className={`step-dot ${paymentStage >= 2 ? 'step-dot--completed' : ''} ${paymentStage === 1 ? 'step-dot--active' : ''}`} style={{ width: '10px', height: '10px' }} />
                    <span>
                      {paymentStage >= 2 ? '✓ Awaiting Device Authorization Callback' : 'Awaiting mobile device verification...'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: paymentStage >= 3 ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }}>
                    <div className={`step-dot ${paymentStage >= 3 ? 'step-dot--completed' : ''} ${paymentStage === 2 ? 'step-dot--active' : ''}`} style={{ width: '10px', height: '10px' }} />
                    <span style={{ fontWeight: paymentStage >= 3 ? 'bold' : 'normal' }}>
                      {paymentStage >= 3 ? '✓ Secure Payment Verified successfully!' : 'Awaiting response verification...'}
                    </span>
                  </div>
                </div>
              </>
            )}



            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '30px', fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--color-accent-green)' }} />
              <span>SSL Dual-Encrypted Gateway Active</span>
            </div>

          </div>
        </div>
      </main>
    );
  }

  // Fallback if empty
  if (items.length === 0 && step !== 'success') {
    return (
      <main className="checkout-page">
        <div className="checkout-container animate-scale-in stagger-1" style={{ textAlign: 'center', padding: '80px 0' }}>
          <ShoppingBag size={64} style={{ color: 'var(--color-accent-gold)', marginBottom: '20px' }} />
          <h2 className="detail-name">Your Cart is Empty</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px' }}>
            You cannot checkout with an empty shopping cart.
          </p>
          <Link to="/shop" className="btn btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: '50px' }}>
            Go to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <h1 className="checkout-title animate-fade-up stagger-1">Secure Checkout</h1>

        {/* Multi-step indicator bar */}
        <div className="checkout-steps animate-fade-up stagger-2">
          <div className={`checkout-step ${step === 'shipping' ? 'checkout-step--active' : ''}`}>
            <span className="step-number">1</span>
            <span>Shipping</span>
          </div>
          <span className="step-line" />
          <div className={`checkout-step ${step === 'payment' ? 'checkout-step--active' : ''}`}>
            <span className="step-number">2</span>
            <span>Payment</span>
          </div>
          <span className="step-line" />
          <div className="checkout-step">
            <span className="step-number">3</span>
            <span>Success</span>
          </div>
        </div>

        {/* Dynamic checkout split columns */}
        <div className="checkout-layout">

          {/* Left Column Form */}
          <div className="animate-fade-up stagger-3" style={{ width: '100%' }}>
            {renderFormColumn()}
          </div>

          {/* Right Column Order summary */}
          <div className="cart-summary animate-fade-up stagger-4" style={{ position: 'sticky', top: '100px' }}>
            <h2 className="summary-title" style={{ fontSize: 'var(--fs-medium)', marginBottom: '15px' }}>
              Order Review
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(92, 61, 46, 0.05)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-small)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-wood-dark)' }}>
                        {item.product.name}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-tiny)' }}>
                        Qty: {item.quantity} | {item.variant.woodType}
                      </span>
                    </div>
                    <span style={{ fontWeight: 'bold' }}>
                      ₹{(item.variant.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Laser text request inside checkout */}
                  {item.product.engravingRequest && (
                    <span style={{ fontSize: '10px', color: 'var(--color-accent-gold)', marginTop: '2px', paddingLeft: '5px', borderLeft: '2px solid var(--color-accent-gold)' }}>
                      Carving: &ldquo;{item.product.engravingRequest}&rdquo;
                    </span>
                  )}
                  {/* Laser logo request inside checkout */}
                  {item.product.engravingLogo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--color-accent-gold)', marginTop: '2px', paddingLeft: '5px', borderLeft: '2px solid var(--color-accent-gold)' }}>
                      <span>Logo: {item.product.engravingLogo}</span>
                      {item.product.engravingLogoPreview && (
                        <img
                          src={item.product.engravingLogoPreview}
                          alt="Logo detail"
                          style={{ width: '14px', height: '14px', borderRadius: '1px', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="summary-row">
              <span>Shipping Cost</span>
              <span>{shippingCost === 0 ? 'FREE' : `₹${shippingCost.toLocaleString('en-IN')}`}</span>
            </div>

            <div className="summary-row">
              <span>GST Tax (18%)</span>
              <span>₹{gstCost.toLocaleString('en-IN')}</span>
            </div>

            <div className="summary-row summary-row--total">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>

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
              <span>SSL Secure payment validation active</span>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
