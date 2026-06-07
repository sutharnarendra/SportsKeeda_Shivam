import { useState, useCallback, useEffect, useMemo } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import FeatureCards from '../components/ui/FeatureCards';
import ProductCarousel from '../components/ui/ProductCarousel';
import { useSceneStore } from '../store/sceneStore';
import { useOrderStore } from '../store/orderStore';
import api from '../utils/api';
import './Home.css';

// Local seed product data removed to enforce dynamic API data fetching

/**
 * HomeReviewCard — Renders an individual review in the shop page styled grid with expandable text.
 */
function HomeReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const TEXT_LIMIT = 70; // Characters limit before showing "Show more"
  
  // Clean quotes from text if present
  const rawText = review.text.replace(/^["&ldquo;]+|["&rdquo;]+$/g, '');
  const isLong = rawText.length > TEXT_LIMIT;

  const renderStars = (count) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

  // Get initials for avatar (e.g. Vikram Malhotra -> VM)
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="review-card animate-fade-up">
      <div className="review-stars">{renderStars(review.rating || review.stars || 5)}</div>
      
      <p className={`review-text ${expanded ? 'review-text--expanded' : ''}`}>
        &ldquo;{rawText}&rdquo;
      </p>

      {isLong && (
        <button
          type="button"
          className="review-show-more-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      <div className="review-author">
        <div className="review-avatar">
          {review.initials || getInitials(review.author || review.name)}
        </div>
        <div>
          <div className="review-author-name">{review.author || review.name}</div>
          <div className="review-author-date">{review.date}</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [showFeatureCards, setShowFeatureCards] = useState(false);
  const isAssembled = useSceneStore((state) => state.isAssembled);
  const allReviews = useOrderStore((state) => state.reviews) || [];

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);

  // Fetch products dynamically from the backend DB seeder on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        if (response.data && response.data.length > 0) {
          const mappedProducts = response.data.map(p => ({
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
            variants: p.variants ? p.variants.map(v => ({
              id: v.id,
              woodType: v.woodType,
              price: Number(v.price),
              originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
              swatchColor: v.swatchColor || '#8B6914'
            })) : []
          }));

          setFeaturedProducts(mappedProducts.filter(p => p.category === 'Parallettes'));
          setSimilarProducts(mappedProducts.filter(p => p.category === 'Accessories'));
        }
      } catch (err) {
        console.error("Failed to fetch products from backend database", err);
      }
    };
    fetchProducts();
  }, []);

  const topReviews = useMemo(() => {
    return [...allReviews]
      .sort((a, b) => {
        const rA = a.rating || a.stars || 5;
        const rB = b.rating || b.stars || 5;
        if (rB !== rA) return rB - rA;
        return (b.id || 0) - (a.id || 0); // Newest reviews first
      })
      .slice(0, 6);
  }, [allReviews]);

  useEffect(() => {
    if (isAssembled) {
      const timeout = setTimeout(() => setShowFeatureCards(true), 400);
      return () => clearTimeout(timeout);
    }
  }, [isAssembled]);

  return (
    <main>
      {/* ═══ SCROLLABLE CONTENT — Floats over the 3D background ═══ */}
      <div className="scroll-content">


        {/* ═══ HERO SECTION — First viewport with tagline over 3D ═══ */}
        <section className="hero-section" id="hero-section">
          {/* Central product frame containing unified tagline and CTA buttons */}
          <div className="hero-product-frame">
            {/* Tagline Content inside the same glass plane */}
            <div className={`hero-content ${showFeatureCards ? 'visible' : ''}`}>
              <h1 className="hero-title">
                Crafted for <span className="highlight">Performance</span>
              </h1>
              <p className="hero-subtitle">
                Premium wooden parallettes, handmade in India
              </p>
              <div className="hero-cta-group">
                <a href="/shop" className="btn btn-primary">
                  Shop Now <ArrowRight size={16} />
                </a>
                <a href="/about" className="btn btn-secondary">
                  Our Story
                </a>
              </div>
            </div>
          </div>

          {/* Feature cards floating around */}
          <FeatureCards visible={showFeatureCards} />
        </section>

      {/* ═══ WELCOME SECTION ═══ */}
      <section className="welcome-section section" id="welcome-section">
        <div className="container">
          <span className="welcome-badge">Welcome to Yatra X</span>
          <h2 className="welcome-title">
            Where Craftsmanship Meets Calisthenics
          </h2>
          <p className="welcome-description">
            Every Yatra X parallette is hand-selected, hand-shaped, and
            hand-finished from sustainably sourced Indian hardwood. We believe
            your equipment should be as dedicated to performance as you are.
          </p>
          <div className="welcome-stats">
            <div className="welcome-stat">
              <div className="welcome-stat-number">5,000+</div>
              <div className="welcome-stat-label">Athletes Trust Us</div>
            </div>
            <div className="welcome-stat">
              <div className="welcome-stat-number">150kg</div>
              <div className="welcome-stat-label">Load Tested</div>
            </div>
            <div className="welcome-stat">
              <div className="welcome-stat-number">100%</div>
              <div className="welcome-stat-label">Handcrafted</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURED COLLECTION — Horizontal Scroll ═══ */}
      <section className="featured-section section" id="featured-section">
        <ProductCarousel
          id="featured-carousel"
          title="Featured Collection"
          subtitle="Our best-selling parallettes — crafted with precision and care."
          products={featuredProducts}
        />
      </section>

      {/* ═══ SIMILAR PRODUCTS — Horizontal Scroll ═══ */}
      <section className="similar-section section" id="similar-section">
        <ProductCarousel
          id="similar-carousel"
          title="You May Also Like"
          subtitle="Explore our range of premium wooden fitness accessories."
          products={similarProducts}
        />
      </section>

      {/* ═══ REVIEWS SECTION ═══ */}
      <section className="reviews-section section" id="reviews-section">
        <div className="container">
          <h2 className="section-title">What Athletes Say</h2>
          <p className="section-subtitle">
            Real reviews from real customers who train with Yatra X every day.
          </p>
        </div>
        <div className="reviews-grid">
          {topReviews.map((review, index) => (
            <HomeReviewCard key={review.id || index} review={review} />
          ))}
        </div>
      </section>

      {/* ═══ DISCOUNT BANNER ═══ */}
      <section className="discount-banner section" id="discount-section">
        <span className="discount-badge">Limited Time Offer</span>
        <h2 className="discount-title">15% Off Your First Order</h2>
        <p className="discount-subtitle">
          Use code <strong>YATRAX15</strong> at checkout. Free shipping on all orders.
        </p>
        <a href="/shop" className="btn btn-gold" style={{ position: 'relative' }}>
          Shop the Collection <ArrowRight size={16} />
        </a>
      </section>
    </div>{/* end scroll-content */}
    </main>
  );
}
