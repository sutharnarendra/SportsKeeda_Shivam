import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ShoppingCart, Menu, X, LogOut } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import './Header.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const cartItems = useCartStore((state) => state.items);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const { user, isAuthenticated, logout } = useAuthStore();

  const cartCount = getTotalItems();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isCartPage = location.pathname === '/cart';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`} id="main-header">
      <div className="header-inner">
        {/* Logo — Top Left */}
        <Link to="/" className="header-logo" id="header-logo">
          <img
            src="/images/bicep.png"
            alt="Yatra X Logo"
            className="logo-img"
          />
          <span className="logo-text">Yatra X</span>
        </Link>

        {/* Center Navigation */}
        <nav className="header-nav" id="header-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/order-history">Order History</NavLink>
        </nav>

        {/* Right Actions — Search, Login, Cart */}
        <div className="header-actions" id="header-actions">
          {/* Expandable Search */}
          <div className={`header-search ${searchOpen ? 'open' : ''}`}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              id="search-input"
            />
          </div>

          <button
            className="header-action-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Toggle search"
            id="btn-search"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          {isAuthenticated ? (
            <div className={`header-user-menu ${isAuthPage ? 'header-user-menu--active' : ''}`}>
              <span className="header-username">Hi, {user?.name}</span>
              <button
                className="header-action-btn"
                onClick={logout}
                aria-label="Logout"
                title="Logout"
                id="btn-logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`header-action-btn ${isAuthPage ? 'header-action-btn--active' : ''}`}
              aria-label="User account"
              id="btn-login"
            >
              <User size={20} />
            </Link>
          )}

          <Link
            to="/cart"
            className={`header-action-btn ${isCartPage ? 'header-action-btn--active' : ''}`}
            aria-label="Shopping cart"
            id="btn-cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="badge">{cartCount}</span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="header-menu-toggle"
            aria-label="Toggle menu"
            id="btn-menu-toggle"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}

