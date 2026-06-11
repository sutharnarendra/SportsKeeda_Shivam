import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../../utils/api';
import { Star, Play } from 'lucide-react';
import './ProductCard.css';

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
 * ProductCard — Premium product display card
 * Shows main image, plays video on hover, displays price variants by wood type,
 * and sale discount badges. Data will come from admin panel.
 */
export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [tapped, setTapped] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    setTapped(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleCardClick = (e) => {
    // On touch devices with video: first tap plays video, second navigates
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && product.video && !tapped) {
      e.preventDefault();
      setTapped(true);
      setIsHovered(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      return;
    }
    // TODO: Ensure API always returns slug, use id as safe fallback for now
    navigate(`/product/${product.slug ?? product.id}`);
  };

  const handleVariantClick = (e, idx) => {
    e.stopPropagation(); // Avoid triggering card click
    setSelectedVariant(idx);
  };

  return (
    <div
      className={`pcard ${isHovered ? 'pcard--hovered' : ''}`}
      id={`pcard-${product.id}`}
      onMouseEnter={() => {
        handleMouseEnter();
        const slugValue = product.slug ?? product.id;
        if (slugValue) {
          queryClient.prefetchQuery({
            queryKey: ['product', String(slugValue)],
            queryFn: async () => {
              const res = await fetch(`${API_BASE}/api/products/slug/${slugValue}`);
              if (!res.ok) throw new Error('Not found');
              const data = await res.json();
              return mapProduct(data);
            },
            staleTime: 10 * 60 * 1000
          });
        }
      }}
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

