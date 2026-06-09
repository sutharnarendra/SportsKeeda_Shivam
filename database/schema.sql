-- =========================================================================
-- Yatra X — Complete Database Schema
-- Database: Neon Serverless PostgreSQL (Singapore Region)
-- Run these queries in order on your Neon SQL Editor
-- =========================================================================


-- =========================================================================
-- TABLE 1: users
-- =========================================================================
-- Stores all registered user accounts.
-- Passwords are NEVER stored as plain text — Spring Boot hashes them
-- with BCrypt before saving. The column stores the hash, not the password.
--
-- Roles: ROLE_USER (default), ROLE_ADMIN, ROLE_SUPER_ADMIN
-- =========================================================================

CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'ROLE_USER',
    avatar_url      VARCHAR(500),
    phone           VARCHAR(20),
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Fast lookup when user logs in with email
CREATE INDEX idx_users_email ON users (email);

-- Filter users by role (admin panel)
CREATE INDEX idx_users_role ON users (role);


-- =========================================================================
-- TABLE 2: products
-- =========================================================================
-- Stores the product catalog. Each product has a unique slug for
-- SEO-friendly URLs (e.g., /products/pro-parallettes instead of /products/1).
--
-- image_url  → Cloudinary CDN link for product photos
-- video_url  → Cloudflare R2 link for HLS video playlist
-- model_url  → Cloudflare R2 link for 3D GLB model
--
-- rating & review_count are denormalized (duplicated) here from the
-- reviews table for performance — avoids expensive JOIN + AVG() on
-- every product listing page. Updated via triggers or application code.
-- =========================================================================

CREATE TABLE products (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    slug            VARCHAR(200)    NOT NULL UNIQUE,
    description     TEXT,
    price           DECIMAL(10,2)   NOT NULL,
    original_price  DECIMAL(10,2),
    stock           INTEGER         NOT NULL DEFAULT 0,
    rating          DECIMAL(2,1)    NOT NULL DEFAULT 0.0,
    review_count    INTEGER         NOT NULL DEFAULT 0,
    on_sale         BOOLEAN         NOT NULL DEFAULT FALSE,
    category        VARCHAR(100),
    image_url       VARCHAR(500),
    video_url       VARCHAR(500),
    model_url       VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Slug lookups for SEO-friendly URLs
CREATE INDEX idx_products_slug ON products (slug);

-- Filter products by category (e.g., "Parallettes", "Accessories")
CREATE INDEX idx_products_category ON products (category);

-- Filter sale items on the Shop page
CREATE INDEX idx_products_on_sale ON products (on_sale) WHERE on_sale = TRUE;


-- =========================================================================
-- TABLE 3: product_variants
-- =========================================================================
-- Each product can have multiple variants (wood types with different prices).
-- Example: "Pro Parallettes" has Sheesham (₹3499), Teak (₹4299), Mango (₹2999)
--
-- Why a separate table instead of JSONB?
--   1. We can query "show all Teak products" with a simple WHERE
--   2. Each variant has its own stock count
--   3. Foreign key ensures no orphan variants exist
--   4. Indexes work on individual columns (not possible inside JSONB)
-- =========================================================================

CREATE TABLE product_variants (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    wood_type       VARCHAR(50)     NOT NULL,
    price           DECIMAL(10,2)   NOT NULL,
    original_price  DECIMAL(10,2),
    stock           INTEGER         NOT NULL DEFAULT 0,
    swatch_color    VARCHAR(7),
    image_url       VARCHAR(500),
    video_url       VARCHAR(500),
    model_url       VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Get all variants for a product (Product Detail page)
CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);

-- Prevent duplicate wood types per product
CREATE UNIQUE INDEX idx_product_variants_unique ON product_variants (product_id, wood_type);


-- =========================================================================
-- TABLE 4: cart_items
-- =========================================================================
-- Stores shopping cart state in the database for persistence across sessions.
-- Redis (Upstash) is used as a fast read cache on top of this table.
--
-- The variant_id links to the specific wood type the user selected.
-- A unique constraint prevents the same user from having duplicate entries
-- for the same product + variant — instead, quantity is incremented.
-- =========================================================================

CREATE TABLE cart_items (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      BIGINT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      BIGINT          REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity        INTEGER         NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Get all cart items for a user (Cart page)
CREATE INDEX idx_cart_items_user_id ON cart_items (user_id);

-- Prevent duplicate product+variant per user
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items (user_id, product_id, variant_id);


-- =========================================================================
-- TABLE 5: orders
-- =========================================================================
-- Created when a user completes checkout. Stores the order header with
-- shipping details, total amount, and current status.
--
-- Status lifecycle: PLACED → CONFIRMED → SHIPPED → DELIVERED
--                   PLACED → CANCELLED (if cancelled before shipping)
--
-- Shipping fields are stored as individual columns (not JSONB) because
-- we may need to search/filter by city, state, or pincode for analytics.
-- =========================================================================

CREATE TABLE orders (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total               DECIMAL(10,2)   NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PLACED',
    shipping_name       VARCHAR(100)    NOT NULL,
    shipping_phone      VARCHAR(20)     NOT NULL,
    shipping_address    TEXT            NOT NULL,
    shipping_city       VARCHAR(100)    NOT NULL,
    shipping_state      VARCHAR(100)    NOT NULL,
    shipping_pincode    VARCHAR(10)     NOT NULL,
    payment_method      VARCHAR(50)     NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Get all orders for a user (Order History page), newest first
CREATE INDEX idx_orders_user_id ON orders (user_id, created_at DESC);

-- Filter orders by status (Admin panel: "show all SHIPPED orders")
CREATE INDEX idx_orders_status ON orders (status);


-- =========================================================================
-- TABLE 6: order_items
-- =========================================================================
-- Each order contains one or more line items. Stores a snapshot of the
-- product details AT THE TIME OF PURCHASE — because product prices and
-- names can change later, but the order record must remain accurate.
--
-- Why a separate table instead of JSONB?
--   1. We can query "total revenue for product X" across all orders
--   2. We can count "how many units of product X were sold"
--   3. Proper foreign keys ensure data integrity
-- =========================================================================

CREATE TABLE order_items (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        BIGINT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      BIGINT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name    VARCHAR(200)    NOT NULL,
    product_price   DECIMAL(10,2)   NOT NULL,
    variant_info    VARCHAR(100),
    quantity        INTEGER         NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

-- Get all items in a specific order (Order Detail page)
CREATE INDEX idx_order_items_order_id ON order_items (order_id);

-- Revenue analytics: "how many times was this product sold?"
CREATE INDEX idx_order_items_product_id ON order_items (product_id);


-- =========================================================================
-- TABLE 7: reviews
-- =========================================================================
-- Product reviews submitted by authenticated users. Each user can only
-- review a product once (enforced by unique constraint).
--
-- rating: 1 to 5 stars (enforced by CHECK constraint)
--
-- When a new review is inserted, the application code should also update
-- products.rating and products.review_count (denormalized fields).
-- =========================================================================

CREATE TABLE reviews (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating          INTEGER         NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text     TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Get all reviews for a product (Product Detail page)
CREATE INDEX idx_reviews_product_id ON reviews (product_id);

-- One review per user per product
CREATE UNIQUE INDEX idx_reviews_unique ON reviews (product_id, user_id);


-- =========================================================================
-- TABLE 8: wishlist_items
-- =========================================================================
-- Users can save products to their wishlist for later. Simple many-to-many
-- relationship between users and products.
-- =========================================================================

CREATE TABLE wishlist_items (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      BIGINT          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      BIGINT          REFERENCES product_variants(id) ON DELETE CASCADE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Get all wishlist items for a user (Wishlist page)
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items (user_id);

-- Prevent duplicate wishlist entries for the same variant
CREATE UNIQUE INDEX uk_wishlist_user_product_variant ON wishlist_items (user_id, product_id, variant_id);


-- =========================================================================
-- VERIFICATION: List all created tables
-- =========================================================================
-- Run this after executing all the above to confirm everything was created:

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
