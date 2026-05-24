import { useState, useCallback, useEffect } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import FeatureCards from '../components/ui/FeatureCards';
import ProductCarousel from '../components/ui/ProductCarousel';
import { useSceneStore } from '../store/sceneStore';
import './Home.css';

/* ─── Placeholder Data (will come from admin panel API) ─── */


const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: 'Pro Parallettes',
    description: 'Our flagship model — precision crafted for serious calisthenics athletes. Laser-engraved with your logo.',
    price: 3499,
    originalPrice: 4199,
    rating: 4.8,
    image: null,      // placeholder — admin will upload
    video: null,      // placeholder — admin will upload product video
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 3499, originalPrice: 4199, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 4299, originalPrice: 4999, swatchColor: '#8B6914' },
      { woodType: 'Mango', price: 2999, originalPrice: 3599, swatchColor: '#C4A882' },
    ],
  },
  {
    id: 2,
    name: 'Classic Parallettes',
    description: 'Perfect for beginners and home gyms. Lightweight yet rock solid with anti-slip rubber feet.',
    price: 2799,
    originalPrice: 3299,
    rating: 4.6,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Mango', price: 2799, originalPrice: 3299, swatchColor: '#C4A882' },
      { woodType: 'Sheesham', price: 3299, originalPrice: 3899, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 3,
    name: 'Elite Parallettes',
    description: 'Premium teak with hand-rubbed oil finish. Competition grade with 150kg load capacity.',
    price: 4999,
    originalPrice: 5999,
    rating: 4.9,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Teak', price: 4999, originalPrice: 5999, swatchColor: '#8B6914' },
      { woodType: 'Walnut', price: 5499, originalPrice: 6499, swatchColor: '#3E2723' },
    ],
  },
  {
    id: 4,
    name: 'Mini Parallettes',
    description: 'Compact travel-friendly design. Fits in your backpack — train anywhere, anytime.',
    price: 1999,
    originalPrice: null,
    rating: 4.5,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Mango', price: 1999, originalPrice: null, swatchColor: '#C4A882' },
      { woodType: 'Pine', price: 1699, originalPrice: null, swatchColor: '#DEC099' },
    ],
  },
  {
    id: 5,
    name: 'Gymnast Pro',
    description: 'Extra-wide grip bars for advanced moves like planche, L-sit, and handstand presses.',
    price: 3999,
    originalPrice: 4499,
    rating: 4.7,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Sheesham', price: 3999, originalPrice: 4499, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 4799, originalPrice: 5299, swatchColor: '#8B6914' },
    ],
  },
  {
    id: 6,
    name: 'Studio Set',
    description: 'Gym & studio pack — 2 pairs with custom branding. Bulk pricing for fitness studios.',
    price: 6499,
    originalPrice: 7999,
    rating: 4.8,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 6499, originalPrice: 7999, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 7999, originalPrice: 9499, swatchColor: '#8B6914' },
      { woodType: 'Mango', price: 5499, originalPrice: 6999, swatchColor: '#C4A882' },
    ],
  },
];

const SIMILAR_PRODUCTS = [
  {
    id: 101,
    name: 'Push-Up Bars',
    description: 'Ergonomic wooden push-up bars with angled grip. Same premium craftsmanship.',
    price: 1499,
    originalPrice: 1799,
    rating: 4.4,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Mango', price: 1499, originalPrice: 1799, swatchColor: '#C4A882' },
      { woodType: 'Sheesham', price: 1899, originalPrice: 2199, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 102,
    name: 'Yoga Blocks (Pair)',
    description: 'Sustainably sourced cork & wood yoga blocks. Naturally antimicrobial.',
    price: 999,
    originalPrice: null,
    rating: 4.3,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Cork', price: 999, originalPrice: null, swatchColor: '#D2B48C' },
    ],
  },
  {
    id: 103,
    name: 'Balance Board',
    description: 'Handcrafted wooden balance board for core stability and rehab exercises.',
    price: 2499,
    originalPrice: 2999,
    rating: 4.6,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 2499, originalPrice: 2999, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 2999, originalPrice: 3499, swatchColor: '#8B6914' },
    ],
  },
  {
    id: 104,
    name: 'Gymnastics Rings',
    description: 'Premium wooden gymnastics rings with adjustable nylon straps. Competition grade.',
    price: 2299,
    originalPrice: 2799,
    rating: 4.7,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Birch', price: 2299, originalPrice: 2799, swatchColor: '#F5DEB3' },
    ],
  },
  {
    id: 105,
    name: 'Ab Roller Wheel',
    description: 'Sheesham wood ab roller with dual bearings for smooth, silent rolls.',
    price: 1299,
    originalPrice: 1599,
    rating: 4.5,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 1299, originalPrice: 1599, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 106,
    name: 'Handstand Canes',
    description: 'Tall standing canes for circus handbalancing. Adjustable height, solid teak.',
    price: 5999,
    originalPrice: 6999,
    rating: 4.9,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Teak', price: 5999, originalPrice: 6999, swatchColor: '#8B6914' },
      { woodType: 'Sheesham', price: 5499, originalPrice: 6499, swatchColor: '#5C3D2E' },
    ],
  },
];

const REVIEWS = [
  {
    stars: 5,
    text: '"These parallettes are a game-changer. The wood quality is incredible — you can feel the craftsmanship in every detail. Worth every rupee."',
    name: 'Arjun M.',
    date: 'March 2026',
    initials: 'AM',
  },
  {
    stars: 5,
    text: '"Got the laser engraving with my gym logo. Looks absolutely premium. My clients love training on these. Solid grip, no wobble."',
    name: 'Priya S.',
    date: 'April 2026',
    initials: 'PS',
  },
  {
    stars: 4,
    text: '"Beautiful handcrafted product. The sheesham wood finish is stunning. Shipping was fast and packaging was excellent. Highly recommend!"',
    name: 'Rahul K.',
    date: 'May 2026',
    initials: 'RK',
  },
];

export default function Home() {
  const [showFeatureCards, setShowFeatureCards] = useState(false);
  const isAssembled = useSceneStore((state) => state.isAssembled);

  useEffect(() => {
    if (isAssembled) {
      const timeout = setTimeout(() => setShowFeatureCards(true), 400);
      return () => clearTimeout(timeout);
    }
  }, [isAssembled]);

  const renderStars = (count) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

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
          products={FEATURED_PRODUCTS}
        />
      </section>

      {/* ═══ SIMILAR PRODUCTS — Horizontal Scroll ═══ */}
      <section className="similar-section section" id="similar-section">
        <ProductCarousel
          id="similar-carousel"
          title="You May Also Like"
          subtitle="Explore our range of premium wooden fitness accessories."
          products={SIMILAR_PRODUCTS}
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
          {REVIEWS.map((review, index) => (
            <div key={index} className="review-card" id={`review-card-${index}`}>
              <div className="review-stars">{renderStars(review.stars)}</div>
              <p className="review-text">{review.text}</p>
              <div className="review-author">
                <div className="review-avatar">{review.initials}</div>
                <div>
                  <div className="review-author-name">{review.name}</div>
                  <div className="review-author-date">{review.date}</div>
                </div>
              </div>
            </div>
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
