import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import './ProductCarousel.css';

/**
 * ProductCarousel — Horizontal scrolling product row
 * Shows a section title, subtitle, and a scrollable row of ProductCards
 * with navigation arrows and snap-scroll behaviour.
 */
export default function ProductCarousel({ title, subtitle, products, id }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 340;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="carousel" id={id}>
      {/* Header row — Title + Navigation arrows */}
      <div className="carousel__header">
        <div>
          <h2 className="carousel__title">{title}</h2>
          {subtitle && <p className="carousel__subtitle">{subtitle}</p>}
        </div>
        <div className="carousel__arrows">
          <button
            className={`carousel__arrow ${!canScrollLeft ? 'carousel__arrow--disabled' : ''}`}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className={`carousel__arrow ${!canScrollRight ? 'carousel__arrow--disabled' : ''}`}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable product track */}
      <div className="carousel__track" ref={scrollRef}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Fade edges for scroll indication */}
      {canScrollLeft && <div className="carousel__fade carousel__fade--left" />}
      {canScrollRight && <div className="carousel__fade carousel__fade--right" />}
    </div>
  );
}
