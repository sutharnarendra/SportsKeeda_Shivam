import { useEffect } from "react";
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight, Trash } from 'lucide-react';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import './Wishlist.css';

export default function Wishlist() {
    const { items, loadWishlist, toggleWishlist, clearWishlist } = useWishlistStore();
    const { addToCart } = useCartStore();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        loadWishlist();
    }, [loadWishlist, isAuthenticated]);

    const handleAddToCart = (e, product) => {
        e.stopPropagation();
        //Default to the first variant (Teak/Sheesham/etc.) if variants exist
        addToCart(product, 0, 1);
    };

    return (
        <main className="wishlist-page">
            <div className="wishlist-container">

                {/* Header Section */}
                <div className="wishlist-header animate-fade-up stagger-1">
                    <div className="header-title-row">
                        <h1 className="wishlist-title">
                            <Heart size={32} fill="var(--color-wood-dark)" style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                            My Saved Items
                        </h1>
                        {items.length > 0 && (
                            <button className="btn-clear-wishlist" onClick={clearWishlist}>
                                <Trash2 size={16} /> Clear All
                            </button>
                        )}
                    </div>
                    <p className="wishlist-subtitle">Your curated selection of premium handcrafted wooden calisthenics equipment.</p>
                </div>

                {items.length === 0 ? (
                    /* Empty Wishlist State */
                    <div className="wishlist-empty animate-scale-in stagger-2">
                        <div className="empty-circle">
                            <Heart size={48} style={{ color: 'var(--color-wood-light)' }} />
                        </div>
                        <h3>Your Wishlist is Empty</h3>
                        <p>Explore our shop catalog and save items you want to keep an eye on.</p>
                        <Link to="/shop" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', borderRadius: '50px' }}>
                            Explore Collection <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                        </Link>
                    </div>
                ) : (
                    /* Wishlist Grid */
                    <div className="wishlist-grid animate-fade-up stagger-3">
                        {items.map((item) => {
                            const product = item.product;
                            const basePrice = product.variants?.[0]?.price || product.price;
                            const originalPrice = product.variants?.[0]?.originalPrice || product.originalPrice;
                            const discount = originalPrice ? Math.round((1 - basePrice / originalPrice) * 100) : 0;

                            return (
                                <div key={item.id} className="wishlist-card">
                                    {/* Media area */}
                                    <div className="wishlist-card-media">
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="wishlist-card-img" />
                                        ) : (
                                            <div className="wishlist-card-fallback" />
                                        )}
                                        {discount > 0 && <span className="wishlist-discount-badge">-{discount}%</span>}

                                        {/* Floating delete button */}
                                        <button
                                            className="btn-remove-item"
                                            onClick={() => toggleWishlist(product)}
                                            title="Remove from wishlist"
                                            aria-label="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Info details */}
                                    <div className="wishlist-card-info">
                                        <h3 className="wishlist-item-name">{product.name}</h3>
                                        <p className="wishlist-item-desc">{product.description}</p>

                                        <div className="wishlist-price-row">
                                            <span className="wishlist-price">₹{basePrice.toLocaleString('en-IN')}</span>
                                            {originalPrice && originalPrice > basePrice && (
                                                <span className="wishlist-price-original">₹{originalPrice.toLocaleString('en-IN')}</span>
                                            )}
                                        </div>

                                        <div className="wishlist-actions">
                                            <Link to={`/product/${product.slug ?? product.id}`} className="btn-view-details">
                                                View Details
                                            </Link>
                                            <button className="btn-add-to-cart-quick" onClick={(e) => handleAddToCart(e, product)}>
                                                <ShoppingCart size={15} style={{ marginRight: '6px' }} /> Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}