import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Truck, RefreshCw, Shield, AlertTriangle, ArrowLeft, UploadCloud, Trash2, FileImage, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useOrderStore } from '../store/orderStore';
import ProductCarousel from '../components/ui/ProductCarousel';
import './ProductDetail.css';

/**
 * ReviewCard — Individual review with expandable "Show more" for long text
 */
function ReviewCard({ rev }) {
  const [expanded, setExpanded] = useState(false);
  const TEXT_LIMIT = 60; // Characters before showing "Show more"
  const isLong = rev && rev.text && rev.text.length > TEXT_LIMIT;

  if (!rev) return null;

  // Force rating to be a valid integer between 0 and 5 to prevent repeat RangeError crashes
  const rating = Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5)));

  return (
    <div className="review-scroll-card animate-fade-up">
      <div className="review-card-top">
        <div>
          <span className="review-author">{rev.author || 'Anonymous'}</span>
          <span className="review-date">{rev.date || ''}</span>
        </div>
        <div className="review-stars">
          {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </div>
      </div>
      <p className={`review-card-text ${expanded ? 'review-card-text--expanded' : ''}`}>
        &ldquo;{rev.text || ''}&rdquo;
      </p>
      {isLong && (
        <button
          type="button"
          className="review-show-more"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const reviews = useOrderStore((state) => state.reviews) || [];
  const fetchReviews = useOrderStore((state) => state.fetchReviews);

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoadingProduct(true);
      try {
        const response = await api.get('/api/products');
        // Handle various response shapes: plain array, {data: [...]}, or string
        let rawProducts = response.data;
        if (typeof rawProducts === 'string') {
          try { rawProducts = JSON.parse(rawProducts); } catch (_) { rawProducts = []; }
        }
        if (rawProducts && !Array.isArray(rawProducts) && Array.isArray(rawProducts.data)) {
          rawProducts = rawProducts.data;
        }
        if (Array.isArray(rawProducts) && rawProducts.length > 0) {
          const mapped = rawProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            rating: p.rating ? Number(p.rating) : 5.0,
            image: p.imageUrl || null,
            video: p.videoUrl || null,
            onSale: p.onSale,
            category: p.category || '',
            variants: Array.isArray(p.variants) ? p.variants.map(v => ({
              id: v.id,
              woodType: v.woodType,
              price: Number(v.price),
              originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
              swatchColor: v.swatchColor || '#8B6914'
            })) : []
          }));

          const matched = mapped.find(p => p.id === Number(id));
          if (matched) {
            setProduct(matched);
            setRecommendedProducts(mapped.filter(p => p.id !== Number(id)));
            setLoadingProduct(false);
            // Fetching reviews for this product from the database
            fetchReviews(id);
            return;
          }
        }
        // No matching product found in the database
        setProduct(null);
      } catch (err) {
        console.error("Failed to load product from backend", err);
        setProduct(null);
      } finally {
        setLoadingProduct(false);
      }
    };
    fetchProduct();
  }, [id, fetchReviews]);

  const productReviews = useMemo(() => {
    const reviewsArray = Array.isArray(reviews) ? reviews : [];
    return reviewsArray.filter(r => r && r.productId === (product?.id || 0));
  }, [reviews, product?.id]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [engravingText, setEngravingText] = useState('');
  const [mediaTab, setMediaTab] = useState('image'); // 'image', 'video'
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  if (loadingProduct) {
    return (
      <main className="product-detail-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-accent-gold)' }} />
      </main>
    );
  }

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
                <span className="detail-rating-stars">
                  {'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(product.rating) || 5))))}
                </span>
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
          <div className="reviews-header">
            <h2 className="detail-name" style={{ fontSize: 'var(--fs-h3)', margin: 0 }}>Customer Reviews</h2>
            <span className="reviews-count-badge">
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
            <div className="reviews-scroll-track">
              {productReviews.map((rev) => (
                <ReviewCard key={rev.id} rev={rev} />
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
            products={recommendedProducts}
          />
        </section>

      </div>
    </main>
  );
}
