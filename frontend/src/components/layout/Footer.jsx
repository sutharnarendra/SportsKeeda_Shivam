import { Instagram, Facebook, Twitter, Youtube, MessageCircle } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-grid">
        {/* Brand Column */}
        <div className="footer-brand">
          <a href="/" className="header-logo">
            <img
              src="/images/bicep.png"
              alt="Yatra X Logo"
              className="logo-img"
            />
            <span className="logo-text">Yatra X</span>
          </a>
          <p>
            Handcrafted premium wooden fitness equipment. Built for athletes
            who value quality, aesthetics, and performance in every rep.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
            <a href="#" aria-label="YouTube"><Youtube size={18} /></a>
            <a href="#" aria-label="WhatsApp"><MessageCircle size={18} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="footer-heading">Shop</h4>
          <div className="footer-links">
            <a href="/shop">All Products</a>
            <a href="/shop?category=parallettes">Parallettes</a>
            <a href="/shop?category=accessories">Accessories</a>
            <a href="/shop?sale=true">Special Offers</a>
            <a href="/wishlist">Wishlist</a>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 className="footer-heading">Support</h4>
          <div className="footer-links">
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact Us</a>
            <a href="/store-locator">Find a Store</a>
            <a href="/policy">Shipping Policy</a>
            <a href="/policy#no-return">Return Policy</a>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="footer-heading">Stay Connected</h4>
          <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-wood-light)', marginBottom: 'var(--space-md)' }}>
            Get exclusive offers and product updates.
          </p>
          <div className="footer-newsletter">
            <input
              type="email"
              placeholder="Your email address"
              id="newsletter-email"
            />
            <button className="btn btn-gold" style={{ width: '100%' }}>
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2026 Yatra X. All rights reserved. Crafted with passion in India.</p>
        <div className="footer-bottom-links">
          <a href="/policy#privacy">Privacy</a>
          <a href="/policy#terms">Terms</a>
          <a href="/policy#no-return">No Return Policy</a>
        </div>
      </div>
    </footer>
  );
}
