import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Truck, RefreshCw, Shield, AlertTriangle, ArrowLeft, UploadCloud, Trash2, FileImage } from 'lucide-react';
import { getProductById, SIMILAR_PRODUCTS } from '../utils/constants';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useOrderStore } from '../store/orderStore';
import ProductCarousel from '../components/ui/ProductCarousel';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = useMemo(() => getProductById(id), [id]);
  const reviews = useOrderStore((state) => state.reviews) || [];
  const productReviews = useMemo(() => {
    return reviews.filter(r => r.productId === (product?.id || 0));
  }, [reviews, product?.id]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [engravingText, setEngravingText] = useState('');
  const [mediaTab, setMediaTab] = useState('image'); // 'image', 'video'

  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  if (!product) {
    return (
      <main className="product-detail-page">
        <div className="detail-container animate-scale-in stagger-1" style={{ textAlign: 'center', padding: '100px 0' }}>
          <AlertTriangle size={64} style={{ color: 'var(--color-error)', marginBottom: '20px' }} />
          <h2 className="detail-name">Product Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px' }}>
            The product you are looking for does not exist or has been removed.
          </p>
          <Link to="/shop" className="btn btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: '50px' }}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  const isFavorited = isInWishlist(product.id);
  const currentVariant = product.variants?.[selectedVariantIdx] || {};
  const basePrice = currentVariant.price || product.price;
  const currentOriginalPrice = currentVariant.originalPrice || product.originalPrice;
  const discount = currentOriginalPrice
    ? Math.round((1 - basePrice / currentOriginalPrice) * 100)
    : 0;

  // Engraving Add-on Prices (Indicated by admin / config parameters)
  const TEXT_ENGRAVE_COST = 299;
  const LOGO_ENGRAVE_COST = 799;

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const hasTextEngrave = engravingText.trim().length > 0;
  const hasLogoEngrave = !!logoFile;

  // Recalculated total product price reflecting wood variant + text add-on + logo add-on
  const currentPrice = basePrice + (hasTextEngrave ? TEXT_ENGRAVE_COST : 0) + (hasLogoEngrave ? LOGO_ENGRAVE_COST : 0);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleAddToCart = () => {
    // Incorporate the engraving text and logo request if present
    const cartProduct = {
      ...product,
      engravingRequest: engravingText.trim() ? engravingText.trim() : null,
      engravingLogo: logoFile ? logoFile.name : null,
      engravingLogoPreview: logoPreview || null,
      customPricingAdded: (hasTextEngrave ? TEXT_ENGRAVE_COST : 0) + (hasLogoEngrave ? LOGO_ENGRAVE_COST : 0)
    };
    addToCart(cartProduct, selectedVariantIdx, quantity);
    
    // Smooth scroll navigation to Cart
    navigate('/cart');
  };

  return (
    <main className="product-detail-page">
      <div className="detail-container">
        
        {/* Breadcrumbs */}
        <div className="detail-breadcrumbs animate-fade-up stagger-1">
          <Link to="/">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/shop">Shop</Link>
          <span className="breadcrumb-separator">/</span>
          <span>{product.name}</span>
        </div>

        {/* Detail Panel Split Grid */}
        <div className="detail-layout">
          
          {/* Media Section */}
          <div className="detail-gallery animate-scale-in stagger-2">
            <div className="gallery-main-frame">
              {product.onSale && discount > 0 && (
                <span className="detail-badge-sale">Sale -{discount}%</span>
              )}

              {/* Render Media switcher based on state */}
              {mediaTab === 'video' && product.video ? (
                <video
                  src={product.video}
                  className="gallery-main-video"
                  autoPlay
                  controls
                  loop
                  muted
                />
              ) : product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="gallery-main-image"
                />
              ) : (
                <div className="gallery-main-placeholder">
                  <div style={{ color: 'var(--color-wood-dark)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    Yatra X Premium
                  </div>
                </div>
              )}
            </div>

            {/* Media Tabs Switched Buttons */}
            {product.video && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`detail-variant-pill ${mediaTab === 'image' ? 'detail-variant-pill--active' : ''}`}
                  onClick={() => setMediaTab('image')}
                >
                  Product Image
                </button>
                <button
                  className={`detail-variant-pill ${mediaTab === 'video' ? 'detail-variant-pill--active' : ''}`}
                  onClick={() => setMediaTab('video')}
                >
                  Watch Demo Video
                </button>
              </div>
            )}
          </div>

          {/* Info Details Column */}
          <div className="detail-panel animate-fade-up stagger-3">
            <h1 className="detail-name">{product.name}</h1>
            
            {/* Meta Row */}
            <div className="detail-meta-row">
              <div className="detail-rating">
                <span className="detail-rating-stars">{'★'.repeat(Math.round(product.rating))}</span>
                <span>{product.rating}</span>
              </div>
              <span style={{ opacity: 0.3 }}>|</span>
              <span className="detail-spec-brief">Calisthenics Excellence</span>
            </div>

            {/* Product description */}
            <p className="detail-description">{product.description}</p>

            {/* Wood variant picker */}
            {product.variants && product.variants.length > 0 && (
              <div className="detail-variants-section">
                <span className="section-label">Select Wood Type Variant</span>
                <div className="detail-variants-grid">
                  {product.variants.map((v, idx) => (
                    <button
                      key={v.woodType}
                      className={`detail-variant-pill ${selectedVariantIdx === idx ? 'detail-variant-pill--active' : ''}`}
                      onClick={() => setSelectedVariantIdx(idx)}
                    >
                      <span
                        className="variant-color-dot"
                        style={{ background: v.swatchColor }}
                      />
                      {v.woodType}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Laser Carving Engraving Request box */}
            <div className="detail-engrave-section">
              <span className="section-label" style={{ marginBottom: '4px' }}>
                Laser Engraving Customization (Optional)
              </span>
              <p style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Make it yours. Choose initials, text (+₹{TEXT_ENGRAVE_COST}) or upload your logo (+₹{LOGO_ENGRAVE_COST}) for laser carving.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter text to carve (e.g. ARJUN.M or BEAST)"
                  className="engrave-input"
                  value={engravingText}
                  onChange={(e) => setEngravingText(e.target.value)}
                />

                <div className="logo-upload-container" style={{ marginTop: '10px' }}>
                  {!logoFile ? (
                    <label className="logo-upload-dropzone">
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLogoUpload}
                      />
                      <UploadCloud size={28} className="upload-icon" />
                      <span className="upload-title">Upload Custom Brand Logo</span>
                      <span className="upload-subtitle">Click or drag image file here (PNG, JPG • Max 5MB)</span>
                    </label>
                  ) : (
                    <div className="logo-upload-preview-card">
                      <div className="preview-card-left">
                        {logoPreview ? (
                          <div className="preview-thumbnail-wrapper">
                            <img src={logoPreview} alt="Brand Logo Preview" />
                          </div>
                        ) : (
                          <div className="preview-thumbnail-fallback">
                            <FileImage size={20} />
                          </div>
                        )}
                        <div className="preview-details">
                          <span className="preview-name">
                            {logoFile.name.length > 25 ? `${logoFile.name.substring(0, 22)}...` : logoFile.name}
                          </span>
                          <span className="preview-size">
                            {(logoFile.size / 1024).toFixed(1)} KB • Image attached successfully
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="preview-remove-btn"
                        title="Remove Attachment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price section & action button row */}
            <div className="detail-actions-section">
              <div className="price-box">
                <span className="price-main">₹{currentPrice.toLocaleString('en-IN')}</span>
                {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                  <span className="price-original">₹{currentOriginalPrice.toLocaleString('en-IN')}</span>
                )}
                {currentPrice > basePrice && (
                  <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-accent-gold)', display: 'block', marginTop: '2px', fontWeight: 'bold' }}>
                    Includes custom laser engraving request (+₹{currentPrice - basePrice})
                  </span>
                )}
              </div>

              {/* Incrementor and Wishlist/Cart trigger */}
              <div className="detail-interact-row">
                <div className="qty-selector">
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <button className="btn-add-cart" onClick={handleAddToCart}>
                  <ShoppingBag size={18} /> Add to Cart
                </button>

                <button
                  className={`btn-wishlist ${isFavorited ? 'btn-wishlist--active' : ''}`}
                  onClick={() => toggleWishlist(product)}
                  aria-label="Add to wishlist"
                >
                  <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Policies indicators */}
            <div className="detail-policies">
              <div className="policy-item">
                <Truck size={18} className="policy-icon" />
                <span>Free Express Shipping across India (3-5 days delivery)</span>
              </div>
              <div className="policy-item">
                <Shield size={18} className="policy-icon" />
                <span>1-Year structural warranty under maximum load test</span>
              </div>
              <div className="policy-item">
                <RefreshCw size={18} className="policy-icon" />
                <span style={{ fontWeight: 'bold' }}>All sales final — No return policy</span>
              </div>
            </div>

          </div>
        </div>

        {/* Tech Specifications block */}
        <section className="detail-specs-area animate-fade-up stagger-4">
          <h2 className="detail-name" style={{ fontSize: 'var(--fs-h3)' }}>Technical Specifications</h2>
          <table className="specs-table">
            <tbody>
              <tr>
                <td className="specs-label">Structural Material</td>
                <td className="specs-value">Premium Hand-carved Hardwood (Sheesham, Teak, Mango, Walnut)</td>
              </tr>
              <tr>
                <td className="specs-label">Grip Diameter</td>
                <td className="specs-value">38mm (Olympic calisthenics & gymnastics grip standards)</td>
              </tr>
              <tr>
                <td className="specs-label">Weight Capacity</td>
                <td className="specs-value">150kg per bar (300kg total system capacity)</td>
              </tr>
              <tr>
                <td className="specs-label">Feet Blocks Bases</td>
                <td className="specs-value">Anti-slip rubber protection padding (zero wobble, zero slippage)</td>
              </tr>
              <tr>
                <td className="specs-label">Finish Coating</td>
                <td className="specs-value">Natural organic hand-rubbed linseed oil coating (perfect grip texture)</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Dynamic Handcrafted Customer Reviews Section */}
        <section className="detail-specs-area animate-fade-up stagger-4" style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(92, 61, 46, 0.08)', paddingBottom: '10px' }}>
            <h2 className="detail-name" style={{ fontSize: 'var(--fs-h3)', margin: 0 }}>Customer Reviews</h2>
            <span style={{ fontSize: 'var(--fs-tiny)', fontWeight: 'bold', background: 'rgba(92, 61, 46, 0.06)', padding: '4px 10px', borderRadius: '4px' }}>
              {productReviews.length} Verified {productReviews.length === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>

          {productReviews.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-small)', margin: 0 }}>
                No reviews have been written for this handcrafted product yet. Place an order to submit a premium verified review!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {productReviews.map((rev) => (
                <div key={rev.id} style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.35)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(92, 61, 46, 0.02)' }} className="animate-fade-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-wood-dark)', fontSize: 'var(--fs-small)' }}>{rev.author}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '10px' }}>{rev.date}</span>
                    </div>
                    <div style={{ color: 'var(--color-accent-gold)', fontSize: 'var(--fs-small)' }}>
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--fs-small)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Similar Items suggestions carousel */}
        <section style={{ marginTop: '5rem' }} className="animate-fade-up stagger-5">
          <ProductCarousel
            id="detail-similar-carousel"
            title="Recommended Accessories"
            subtitle="Explore our range of matching handcrafted wooden training equipment."
            products={SIMILAR_PRODUCTS}
          />
        </section>

      </div>
    </main>
  );
}
