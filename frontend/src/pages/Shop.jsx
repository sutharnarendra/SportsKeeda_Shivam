import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, RotateCcw, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { ALL_PRODUCTS } from '../utils/constants';
import ProductCard from '../components/ui/ProductCard';
import './Shop.css';

const WOOD_TYPES = ['Sheesham', 'Teak', 'Mango', 'Cork', 'Birch', 'Pine', 'Walnut'];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamQuery = searchParams.get('search') || '';

  // Filter States
  const [selectedWoods, setSelectedWoods] = useState([]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('best'); // 'best', 'price-asc', 'price-desc', 'rating'
  const [onlySale, setOnlySale] = useState(false);

  // If a search query is passed in the URL, we keep it in state
  const searchQuery = searchParamQuery;

  // Handle URL changes to reset state or update accordingly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParamQuery]);

  // Toggle Wood Type
  const handleWoodToggle = (wood) => {
    setSelectedWoods((prev) =>
      prev.includes(wood) ? prev.filter((w) => w !== wood) : [...prev, wood]
    );
  };

  // Quick select dynamic material chip
  const handleQuickChipSelect = (wood) => {
    if (wood === 'all') {
      setSelectedWoods([]);
    } else {
      setSelectedWoods([wood]);
    }
  };

  // Clear All Filters
  const handleClearFilters = () => {
    setSelectedWoods([]);
    setMaxPrice(10000);
    setMinRating(0);
    setSortBy('best');
    setOnlySale(false);
    if (searchParamQuery) {
      setSearchParams({});
    }
  };

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    return ALL_PRODUCTS.filter((product) => {
      // 1. Search Query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // 2. Wood Type filter (Checks if any variants match the chosen wood types)
      if (selectedWoods.length > 0) {
        const productWoods = product.variants
          ? product.variants.map((v) => v.woodType)
          : [];
        const hasMatchingWood = selectedWoods.some((w) => productWoods.includes(w));
        if (!hasMatchingWood) return false;
      }

      // 3. Price Filter (Check if base price or any variant price is below maxPrice)
      const lowestPrice = product.variants
        ? Math.min(...product.variants.map((v) => v.price))
        : product.price;
      if (lowestPrice > maxPrice) return false;

      // 4. Rating Filter
      if (product.rating < minRating) return false;

      // 5. On Sale Filter
      if (onlySale && !product.onSale) return false;

      return true;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === 'price-asc') {
        const priceA = a.variants ? Math.min(...a.variants.map((v) => v.price)) : a.price;
        const priceB = b.variants ? Math.min(...b.variants.map((v) => v.price)) : b.price;
        return priceA - priceB;
      }
      if (sortBy === 'price-desc') {
        const priceA = a.variants ? Math.min(...a.variants.map((v) => v.price)) : a.price;
        const priceB = b.variants ? Math.min(...b.variants.map((v) => v.price)) : b.price;
        return priceB - priceA;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0; // 'best' / default ordering
    });
  }, [searchQuery, selectedWoods, maxPrice, minRating, sortBy, onlySale]);

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
          
          {/* Sidebar Filter Panel */}
          <aside className="shop-sidebar animate-fade-up stagger-3">
            {/* Sort Section */}
            <div className="filter-section">
              <h3 className="filter-title">
                <ArrowUpDown size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Sort By
              </h3>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="best">Best Sellers</option>
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
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
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
                      onChange={() => setMinRating(rating)}
                    />
                    <span>{rating}★ & above</span>
                  </label>
                ))}
                <label className="filter-checkbox-label">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === 0}
                    onChange={() => setMinRating(0)}
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
                  onChange={(e) => setOnlySale(e.target.checked)}
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
                {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="shop-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
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
