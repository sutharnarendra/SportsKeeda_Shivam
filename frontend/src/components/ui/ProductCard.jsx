import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import './ProductCard.css';

/**
 * ProductCard — Premium product display card
 * Shows main image, plays video on hover, displays price variants by wood type,
 * and sale discount badges. Data will come from admin panel.
 */
export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const currentVariant = product.variants?.[selectedVariant] || {};
  const currentPrice = currentVariant.price || product.price;
  const currentOriginalPrice = currentVariant.originalPrice || product.originalPrice;
  const discount = currentOriginalPrice
    ? Math.round((1 - currentPrice / currentOriginalPrice) * 100)
    : 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && product.video) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleVariantClick = (e, idx) => {
    e.stopPropagation(); // Avoid triggering card click
    setSelectedVariant(idx);
  };

  return (
    <div
      className={`pcard ${isHovered ? 'pcard--hovered' : ''}`}
      id={`pcard-${product.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* ─── Media Area (Image + Video Hover) ─── */}
      <div className="pcard__media">
        {/* Main product image */}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="pcard__image"
            loading="lazy"
          />
        ) : (
          /* Placeholder gradient when no image */
          <div className="pcard__image-placeholder">
            <div className="pcard__placeholder-icon" />
          </div>
        )}

        {/* Video overlay on hover */}
        {product.video && (
          <video
            ref={videoRef}
            src={product.video}
            className={`pcard__video ${isHovered ? 'pcard__video--active' : ''}`}
            muted
            loop
            playsInline
            preload="none"
          />
        )}

        {/* Video indicator icon */}
        {product.video && !isHovered && (
          <div className="pcard__video-indicator">
            <Play size={14} fill="currentColor" />
          </div>
        )}

        {/* Sale badge */}
        {discount > 0 && (
          <span className="pcard__badge">-{discount}%</span>
        )}

        {/* "Sale" tag for items on sale */}
        {product.onSale && (
          <span className="pcard__sale-tag">Sale</span>
        )}
      </div>

      {/* ─── Product Info ─── */}
      <div className="pcard__info">
        <h3 className="pcard__name">{product.name}</h3>
        <p className="pcard__description">{product.description}</p>

        {/* Wood Type Variants */}
        {product.variants && product.variants.length > 1 && (
          <div className="pcard__variants">
            {product.variants.map((variant, idx) => (
              <button
                key={idx}
                className={`pcard__variant-btn ${selectedVariant === idx ? 'pcard__variant-btn--active' : ''}`}
                onClick={(e) => handleVariantClick(e, idx)}
                title={variant.woodType}
              >
                <span
                  className="pcard__variant-swatch"
                  style={{ background: variant.swatchColor }}
                />
                <span className="pcard__variant-label">{variant.woodType}</span>
              </button>
            ))}
          </div>
        )}

        {/* Price Row */}
        <div className="pcard__price-row">
          <div className="pcard__price">
            ₹{currentPrice.toLocaleString('en-IN')}
            {currentOriginalPrice && currentOriginalPrice > currentPrice && (
              <span className="pcard__price-original">
                ₹{currentOriginalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div className="pcard__rating">
            <Star size={13} fill="currentColor" />
            <span>{product.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

