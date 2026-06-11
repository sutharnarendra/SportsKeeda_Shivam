import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../utils/api';
import { Star, Heart, ShoppingBag, Truck, RefreshCw, Shield, AlertTriangle, ArrowLeft, UploadCloud, Trash2, FileImage, Loader2, Image, Play, Box } from 'lucide-react';
import api from '../utils/api';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useOrderStore } from '../store/orderStore';
import ProductCarousel from '../components/ui/ProductCarousel';
const Scene = React.lazy(() => import('../components/three/Scene'));
import './ProductDetail.css';

// Simple ErrorBoundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="product-detail-page" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h2>Something went wrong loading this product.</h2>
          <p style={{ margin: '20px 0' }}>There was an unexpected application rendering error.</p>
          <a href="/shop" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.8rem 2rem', borderRadius: '50px' }}>
            Return to shop
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}

// ProductDetailSkeleton Component
function ProductDetailSkeleton() {
  return (
    <main className="product-detail-page skeleton">
      <div className="detail-container">
        <div className="detail-breadcrumbs shimmer" style={{ height: '20px', width: '250px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
        <div className="detail-layout">
          <div className="detail-gallery shimmer" style={{ minHeight: '450px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
          <div className="detail-panel">
            <div className="shimmer" style={{ height: '45px', width: '70%', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
            <div className="shimmer" style={{ height: '20px', width: '30%', marginBottom: '25px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
            <div className="shimmer" style={{ height: '120px', width: '100%', marginBottom: '25px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
            <div className="shimmer" style={{ height: '50px', width: '45%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    </main>
  );
}

// Normalise API Product objects to frontend layout structures
const mapProduct = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    rating: p.rating ? Number(p.rating) : 5.0,
    image: p.imageUrl || p.image_url || null,
    video: p.videoUrl || p.video_url || null,
    model: p.modelUrl || p.model_url || null,
    onSale: p.onSale,
    category: p.category || '',
    variants: Array.isArray(p.variants) ? p.variants.map(v => ({
      id: v.id,
      woodType: v.woodType,
      price: Number(v.price),
      originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
      swatchColor: v.swatchColor || '#8B6914',
      image: v.imageUrl || v.image_url || null,
      video: v.videoUrl || v.video_url || null,
      model: v.modelUrl || v.model_url || null
    })) : []
  };
};

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

function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reviews = useOrderStore((state) => state.reviews) || [];
  const fetchReviews = useOrderStore((state) => state.fetchReviews);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [engravingText, setEngravingText] = useState('');
  const [mediaTab, setMediaTab] = useState('image'); // 'image', 'video'
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // Fetch the product details by slug using React Query
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/products/slug/${slug}`);
      if (!res.ok) {
        const err = new Error(`Product not found: ${slug}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return mapProduct(data);
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err.status === 404) return false;
      return failureCount < 2;
    }
  });

  // Fetch the products catalog using React Query to supply recommended accessories
  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['products', 'recommended', product?.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch recommended items');
      const json = await res.json();
      const rawList = json.content ?? json.products ?? json ?? [];
      const mapped = rawList.map(mapProduct).filter(Boolean);
      return mapped.filter(p => p.id !== product?.id);
    },
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000
  });

  // Preselect variant from query parameters (e.g. when navigated from Wishlist)
  useEffect(() => {
    const variantId = searchParams.get('variant');
    if (variantId && product?.variants) {
      const idx = product.variants.findIndex(v => String(v.id) === String(variantId));
      if (idx >= 0) {
        setSelectedVariantIdx(idx);
      }
    }
  }, [searchParams, product]);

  // Sync / fetch reviews from database once product is loaded
  useEffect(() => {
    if (product?.id) {
      fetchReviews(product.id);
    }
  }, [product?.id, fetchReviews]);

  // SEO updates
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | Yatra X`;
      let desc = document.querySelector('meta[name="description"]');
      if (!desc) {
        desc = document.createElement('meta');
        desc.name = 'description';
        document.head.appendChild(desc);
      }
      desc.content = product.description?.slice(0, 155) ?? `${product.name} - Premium wooden fitness accessories by Yatra X`;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = `https://sportskeeda-frontend-shivam.pages.dev/product/${product.slug}`;
    }
  }, [product]);

  // JSON-LD schema
  useEffect(() => {
    if (!product) return;
    const existing = document.getElementById('product-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'product-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.image,
      "sku": product.slug,
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "INR",
        "availability": product.stock > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "url": `https://sportskeeda-frontend-shivam.pages.dev/product/${product.slug}`
      }
    });
    document.head.appendChild(script);
    return () => { document.getElementById('product-jsonld')?.remove(); };
  }, [product]);

  const productReviews = useMemo(() => {
    const reviewsArray = Array.isArray(reviews) ? reviews : [];
    return reviewsArray.filter(r => r && r.productId === (product?.id || 0));
  }, [reviews, product?.id]);

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError || !product) {
    if (error?.status === 404) return <Navigate to="/shop" replace />;
    return (
      <main className="product-detail-page" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <AlertTriangle size={64} style={{ color: 'var(--color-error)', marginBottom: '20px' }} />
        <h2>Something went wrong loading this product.</h2>
        <p style={{ margin: '15px 0' }}>Error details: {error?.message || 'Product not found'}</p>
        <Link to="/shop" className="btn btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: '50px' }}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Return to Shop
        </Link>
      </main>
    );
  }

  const currentVariant = product.variants?.[selectedVariantIdx] || {};
  const isFavorited = isInWishlist(product.id, currentVariant.id);
  const basePrice = currentVariant.price || product.price;
  const currentOriginalPrice = currentVariant.originalPrice || product.originalPrice;
  const discount = currentOriginalPrice
    ? Math.round((1 - basePrice / currentOriginalPrice) * 100)
    : 0;

  const activeImage = currentVariant.image || product.image;
  const activeVideo = currentVariant.video || product.video;
  const activeModel = currentVariant.model || product.model;

  // Engraving Add-on Prices
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
    const cartProduct = {
      ...product,
      engravingRequest: engravingText.trim() ? engravingText.trim() : null,
      engravingLogo: logoFile ? logoFile.name : null,
      engravingLogoPreview: logoPreview || null,
      customPricingAdded: (hasTextEngrave ? TEXT_ENGRAVE_COST : 0) + (hasLogoEngrave ? LOGO_ENGRAVE_COST : 0)
    };
    addToCart(cartProduct, selectedVariantIdx, quantity);
    navigate('/cart');
  };

  console.warn('[Yatra X Debug] Detailed Media Fields:', {
    productKeys: Object.keys(product || {}),
    variantKeys: Object.keys(currentVariant || {}),
    productImage: product?.image,
    productImageUrl: product?.imageUrl,
    productImageUrlSnake: product?.image_url,
    variantImage: currentVariant?.image,
    variantImageUrl: currentVariant?.imageUrl,
    variantImageUrlSnake: currentVariant?.image_url,
    activeImage,
    activeVideo,
    activeModel,
    mediaTab
  });

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
              {mediaTab === '3d' && (product.category === 'Parallettes' || activeModel) ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <React.Suspense fallback={
                    <div style={{ color: 'var(--color-wood-dark)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      Loading 3D Scene...
                    </div>
                  }>
                    <Scene onAssemblyComplete={() => {}} />
                  </React.Suspense>
                </div>
              ) : mediaTab === 'video' && activeVideo ? (
                <video
                  src={activeVideo}
                  className="gallery-main-video"
                  autoPlay
                  controls
                  loop
                  muted
                />
              ) : activeImage ? (
                <img
                  src={activeImage}
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
            <div className="media-tabs-container">
              {activeImage && (
                <button
                  className={`media-tab-btn ${mediaTab === 'image' ? 'media-tab-btn--active' : ''}`}
                  onClick={() => setMediaTab('image')}
                >
                  <Image size={16} />
                  <span className="tab-text">Image</span>
                </button>
              )}
              {activeVideo && (
                <button
                  className={`media-tab-btn ${mediaTab === 'video' ? 'media-tab-btn--active' : ''}`}
                  onClick={() => setMediaTab('video')}
                >
                  <Play size={16} />
                  <span className="tab-text">Video</span>
                </button>
              )}
              {(product.category === 'Parallettes' || activeModel) && (
                <button
                  className={`media-tab-btn ${mediaTab === '3d' ? 'media-tab-btn--active' : ''}`}
                  onClick={() => setMediaTab('3d')}
                >
                  <Box size={16} />
                  <span className="tab-text">3D View</span>
                </button>
              )}
            </div>

            {/* Mobile Only Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="detail-variants-section mobile-only" style={{ marginTop: '18px' }}>
                <span className="section-label" style={{ fontSize: '11px', marginBottom: '8px' }}>
                  Select Material (Live Image Swap)
                </span>
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
              <div className="detail-variants-section desktop-only">
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
                  onClick={() => toggleWishlist(product, currentVariant.id)}
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

export default function ProductDetailPage() {
  return (
    <ErrorBoundary>
      <ProductDetail />
    </ErrorBoundary>
  );
}
