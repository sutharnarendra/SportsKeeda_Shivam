import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { API_BASE } from '../utils/api';
import ProductCard from '../components/ui/ProductCard';
import './Shop.css';

const WOOD_TYPES = ['Sheesham', 'Teak', 'Mango', 'Cork', 'Birch', 'Pine', 'Walnut'];

// Shimmer skeleton component
function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="shop-grid" style={{ padding: '10px 0' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="pcard shimmer" style={{ height: '420px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
      ))}
    </div>
  );
}

// Slugify helper
const slugify = str => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// Map backend properties to frontend
const mapProduct = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug ?? slugify(p.name),
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
  };
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamQuery = searchParams.get('search') || '';

  // Synchronise Filter States with URLSearchParams
  const selectedWoods = searchParams.getAll('wood');
  const maxPrice = Number(searchParams.get('maxPrice') ?? 10000);
  const minPrice = Number(searchParams.get('minPrice') ?? 0);
  const sortBy = searchParams.get('sort') ?? 'best_sellers';
  const onlySale = searchParams.get('sale') === 'true';
  const minRating = Number(searchParams.get('rating') ?? 0);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchQuery = searchParamQuery;
  const filters = { selectedWoods, maxPrice, minPrice, sortBy, onlySale, minRating };

  // Fetch products using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', 'catalog', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWoods.length) selectedWoods.forEach(w => params.append('material', w));
      if (maxPrice < 10000) params.set('maxPrice', String(maxPrice));
      if (minPrice > 0) params.set('minPrice', String(minPrice));
      if (sortBy !== 'best_sellers') params.set('sort', sortBy);
      if (onlySale) params.set('sale', 'true');
      
      const res = await fetch(`${API_BASE}/api/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch catalog products');
      const json = await res.json();
      const rawProducts = json.content ?? json.products ?? json ?? [];
      return rawProducts.map(mapProduct).filter(Boolean);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev
  });

  const products = data ?? [];

  // Minimum 200ms loading skeleton display logic
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShowSkeleton(true), 200);
    } else {
      setShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Handle URL changes to reset state or update accordingly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParamQuery]);

  // Toggle Wood Type Filter in URL
  const handleWoodToggle = (wood) => {
    const current = searchParams.getAll('wood');
    const updated = current.includes(wood)
      ? current.filter(w => w !== wood)
      : [...current, wood];
      
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('wood');
      updated.forEach(w => next.append('wood', w));
      return next;
    });
    setMobileFiltersOpen(false);
  };

  // Quick select dynamic material chip in URL
  const handleQuickChipSelect = (wood) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('wood');
      if (wood !== 'all') {
        next.append('wood', wood);
      }
      return next;
    });
    setMobileFiltersOpen(false);
  };

  // Clear All URL Filters
  const handleClearFilters = () => {
    setSearchParams({});
    setMobileFiltersOpen(false);
  };

  // Check if filters are at defaults
  const isFiltersDefault = 
    selectedWoods.length === 0 &&
    maxPrice === 10000 &&
    minPrice === 0 &&
    minRating === 0 &&
    sortBy === 'best_sellers' &&
    !onlySale;

  // Filter and Sort Products client-side as backup and for refined sorting
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search Query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // 2. Wood Type filter
      if (selectedWoods.length > 0) {
        const productWoods = product.variants
          ? product.variants.map((v) => v.woodType)
          : [];
        const hasMatchingWood = selectedWoods.some((w) => productWoods.includes(w));
        if (!hasMatchingWood) return false;
      }

      // 3. Price Filter
      const lowestPrice = product.variants && product.variants.length > 0
        ? Math.min(...product.variants.map((v) => v.price))
        : product.price;
      if (lowestPrice > maxPrice || lowestPrice < minPrice) return false;

      // 4. Rating Filter
      if (product.rating < minRating) return false;

      // 5. On Sale Filter
      if (onlySale && !product.onSale) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') {
        const priceA = a.variants && a.variants.length > 0 ? Math.min(...a.variants.map((v) => v.price)) : a.price;
        const priceB = b.variants && b.variants.length > 0 ? Math.min(...b.variants.map((v) => v.price)) : b.price;
        return priceA - priceB;
      }
      if (sortBy === 'price-desc') {
        const priceA = a.variants && a.variants.length > 0 ? Math.min(...a.variants.map((v) => v.price)) : a.price;
        const priceB = b.variants && b.variants.length > 0 ? Math.min(...b.variants.map((v) => v.price)) : b.price;
        return priceB - priceA;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0; // default / bestsellers
    });
  }, [products, searchQuery, selectedWoods, maxPrice, minPrice, minRating, sortBy, onlySale]);

  return (
    <main className="shop-page">
      <div className="shop-container">
        
        {/* Header Block */}
        <div className="shop-header animate-fade-up stagger-1">
          <h1 className="shop-title">The Woodcraft Collective</h1>
          <p className="shop-subtitle">Hand-carved strength. Premium athletic equipment made to last.</p>
        </div>

        {/* Dynamic Material Quick Chips */}
        <div className="shop-quick-filters animate-fade-up stagger-2">
          <button
            className={`quick-filter-chip ${selectedWoods.length === 0 ? 'quick-filter-chip--active' : ''}`}
            onClick={() => handleQuickChipSelect('all')}
          >
            All Materials
          </button>
          {WOOD_TYPES.map((wood) => {
            const isActive = selectedWoods.length === 1 && selectedWoods[0] === wood;
            return (
              <button
                key={wood}
                className={`quick-filter-chip ${isActive ? 'quick-filter-chip--active' : ''}`}
                onClick={() => handleQuickChipSelect(wood)}
              >
                {wood}
              </button>
            );
          })}
        </div>

        {/* Search status indicator */}
        {searchQuery && (
          <div className="shop-results-header animate-fade-in stagger-3" style={{ marginBottom: '20px' }}>
            <span className="search-indicator">
              Showing results for &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
        )}

        {/* Filter & Main Grid Layout */}
        <div className="shop-layout">
          
          {/* Mobile Filters Trigger Toggle Button */}
          <button
            type="button"
            className="mobile-filter-trigger animate-fade-up stagger-3"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <Filter size={16} /> Filters & Sorting
          </button>

          {/* Sidebar Filter Panel */}
          <aside className={`shop-sidebar animate-fade-up stagger-3 ${mobileFiltersOpen ? 'shop-sidebar--open' : ''}`}>
            <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(92, 61, 46, 0.08)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-wood-dark)', fontSize: 'var(--fs-medium)' }}>Filters & Sorting</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 'var(--fs-medium)', fontWeight: 'bold' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Sort Section */}
            <div className="filter-section">
              <h3 className="filter-title">
                <ArrowUpDown size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Sort By
              </h3>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.set('sort', e.target.value);
                    return next;
                  });
                  setMobileFiltersOpen(false);
                }}
              >
                <option value="best_sellers">Best Sellers</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {/* Price Filter */}
            <div className="filter-section">
              <h3 className="filter-title">Price Range</h3>
              <div className="price-range-inputs">
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.set('maxPrice', val);
                      return next;
                    });
                  }}
                  className="price-range-slider"
                />
                <div className="price-range-values">
                  <span>Under</span>
                  <span>₹{maxPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Wood Type Multi-check */}
            <div className="filter-section">
              <h3 className="filter-title">Wood Varieties</h3>
              <div className="filter-checkbox-list">
                {WOOD_TYPES.map((wood) => (
                  <label key={wood} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedWoods.includes(wood)}
                      onChange={() => handleWoodToggle(wood)}
                    />
                    <span>{wood}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="filter-section">
              <h3 className="filter-title">Minimum Rating</h3>
              <div className="filter-checkbox-list">
                {[4.8, 4.5, 4.0].map((rating) => (
                  <label key={rating} className="filter-checkbox-label">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => {
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.set('rating', String(rating));
                          return next;
                        });
                        setMobileFiltersOpen(false);
                      }}
                    />
                    <span>{rating}★ & above</span>
                  </label>
                ))}
                <label className="filter-checkbox-label">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === 0}
                    onChange={() => {
                      setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('rating');
                        return next;
                      });
                      setMobileFiltersOpen(false);
                    }}
                  />
                  <span>All Ratings</span>
                </label>
              </div>
            </div>

            {/* Special Sale toggle */}
            <div className="filter-section">
              <label className="filter-checkbox-label" style={{ fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={onlySale}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      if (isChecked) {
                        next.set('sale', 'true');
                      } else {
                        next.delete('sale');
                      }
                      return next;
                    });
                    setMobileFiltersOpen(false);
                  }}
                />
                <span>Special Offers %</span>
              </label>
            </div>

            {/* Clear All CTA */}
            <button className="btn-clear-filters" onClick={handleClearFilters}>
              <RotateCcw size={14} /> Clear Filters
            </button>
          </aside>

          {/* Main Grid Area */}
          <section className="shop-grid-area animate-fade-up stagger-4">
            <div className="shop-results-header">
              <span className="results-count">
                {showSkeleton ? 'Loading...' : `${filteredProducts.length} Product${filteredProducts.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {showSkeleton ? (
              <ProductGridSkeleton count={6} />
            ) : isError ? (
              <div className="shop-empty">
                <AlertTriangle size={48} style={{ color: 'var(--color-error)', marginBottom: '15px' }} />
                <h3 className="shop-empty-title">Failed to load catalog</h3>
                <p className="shop-empty-desc">An error occurred while connecting to the backend API. Please try again later.</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="shop-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : isFiltersDefault ? (
              <div className="shop-empty">
                <AlertTriangle size={48} style={{ color: 'var(--color-accent-gold)', marginBottom: '15px' }} />
                <h3 className="shop-empty-title">Catalog is currently empty</h3>
                <p className="shop-empty-desc">No fitness accessories could be loaded from the database catalog.</p>
              </div>
            ) : (
              <div className="shop-empty">
                <AlertTriangle size={48} style={{ color: 'var(--color-accent-gold)', marginBottom: '15px' }} />
                <h3 className="shop-empty-title">No products found</h3>
                <p className="shop-empty-desc">Try resetting your filters or adjusting your search criteria.</p>
                <button className="btn-reset-empty" onClick={handleClearFilters}>
                  Reset Filters
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
