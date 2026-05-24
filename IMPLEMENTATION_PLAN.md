# Yatra X — Premium 3D E-Commerce Website
## Master Implementation Plan & Architecture Reference

> **Last Updated:** 2026-05-23  
> **Status:** In Progress  
> **Tech Stack:** Spring Boot 3.x (Backend) + React 18 + Vite (Frontend)

---

## 1. Product Overview

**Brand:** Yatra X  
**Product:** Premium Wooden Parallettes (Push-Up Bars)  
**Category:** Fitness / Calisthenics Equipment  
**Positioning:** Premium, handcrafted, luxury fitness gear

---

## 2. Complete Feature Inventory

### 2A. Features from Handwritten Notes

| #  | Feature | Priority | Status |
|----|---------|----------|--------|
| 1  | Navigation Welcome to Website (landing hero) | P0 | `[ ]` |
| 2  | Faster loading time (performance optimization) | P0 | `[ ]` |
| 3  | Simple search bar at top | P0 | `[ ]` |
| 4  | Easy to use — user-friendly navigation | P0 | `[ ]` |
| 5  | Mobile friendly (responsive design) | P0 | `[ ]` |
| 6  | High quality images & videos | P0 | `[ ]` |
| 7  | User reviews & ratings | P1 | `[ ]` |
| 8  | Special discount offers (%) | P1 | `[ ]` |
| 9  | Shopping lists / wishlists | P1 | `[ ]` |
| 10 | Find in store feature | P2 | `[ ]` |
| 11 | Similar item suggestion (custom recommendations) | P1 | `[ ]` |
| 12 | FAQs section | P1 | `[ ]` |
| 13 | Social proof — social media integration (Instagram DM, WhatsApp, Twitter/X, Facebook, YouTube) | P1 | `[ ]` |
| 14 | Security features — 2FA in payment transactions | P2 | `[ ]` |
| 15 | Easy payment method & easy add-to-cart | P0 | `[ ]` |
| 16 | Shipping details & tax calculation after order | P1 | `[ ]` |
| 17 | Customer service / contact page (email, phone, chat) | P1 | `[ ]` |
| 18 | No return policy (clearly stated) | P0 | `[ ]` |

### 2B. Features from Verbal Requirements

| #  | Feature | Priority | Status |
|----|---------|----------|--------|
| 19 | 3D product assembly animation on homepage | P0 | `[ ]` |
| 20 | 3D product rotation (premium showcase) | P0 | `[ ]` |
| 21 | 3D model as full-screen background | P0 | `[ ]` |
| 22 | Central rounded-corner rectangle for product (laptop view) | P0 | `[ ]` |
| 23 | 4–6 glassmorphic feature cards around product | P0 | `[ ]` |
| 24 | Feature cards: size, customization, laser engraving, delivery, premium materials, etc. | P0 | `[ ]` |
| 25 | Full glassmorphism design — light theme | P0 | `[ ]` |
| 26 | Premium wooden aesthetic throughout | P0 | `[ ]` |
| 27 | Logo at top-left with proper spacing | P0 | `[ ]` |
| 28 | Search + Login + Cart in top header aligned with logo | P0 | `[ ]` |

---

## 3. Architecture Overview

```
┌─────────────────────────────────┐      REST API (JSON)      ┌──────────────────────────────┐
│      REACT.JS FRONTEND          │ ◄═══════════════════════► │    SPRING BOOT BACKEND       │
│      (Vite Dev Server)          │    JWT Bearer Tokens       │    (Embedded Tomcat)         │
│                                 │                            │                              │
│  • React 18 + Vite              │   /api/products            │  • Spring Security (JWT)     │
│  • react-three-fiber (3D)       │   /api/auth/login          │  • BCrypt password hashing   │
│  • @react-three/drei            │   /api/auth/register       │  • 2FA (TOTP)                │
│  • GSAP + Framer Motion         │   /api/cart                │  • Payment validation        │
│  • React Router v6 (SPA)        │   /api/orders              │  • Product CRUD              │
│  • Zustand (state mgmt)         │   /api/reviews             │  • Order management          │
│  • Vanilla CSS (CSS Modules)    │   /api/wishlist            │  • Spring Data JPA           │
│                                 │   /api/search              │  • MySQL / PostgreSQL        │
│  Port: 5173                     │                            │  Port: 8080                  │
└─────────────────────────────────┘                            └──────────────────────────────┘
```

---

## 4. Tech Stack — Detailed

### 4A. Frontend

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI component library |
| `vite` | Build tool + dev server (fast HMR) |
| `three` | Core 3D WebGL engine |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Helpers (OrbitControls, Environment, etc.) |
| `gsap` | Timeline animations, scroll-triggered effects |
| `framer-motion` | React component animations & page transitions |
| `react-router-dom` | Client-side SPA routing |
| `zustand` | Lightweight global state (cart, auth, wishlist) |
| `lucide-react` | Icon library |
| `axios` | HTTP client for API calls to Spring Boot |

### 4B. Backend

| Dependency | Purpose |
|------------|---------|
| `spring-boot-starter-web` | REST API + embedded Tomcat |
| `spring-boot-starter-security` | Authentication, authorization, CSRF, CORS |
| `spring-boot-starter-data-jpa` | ORM + database access via Hibernate |
| `spring-boot-starter-validation` | Request body validation |
| `jjwt` (io.jsonwebtoken) | JWT token generation & validation |
| `mysql-connector-j` | MySQL database driver |
| `spring-boot-devtools` | Hot reload during development |
| `lombok` | Reduce boilerplate (getters, setters, constructors) |
| `springdoc-openapi` | Swagger API documentation |

---

## 5. Design System

### 5A. Color Palette (Light Wooden Glassmorphism)

```css
:root {
  --color-wood-dark:       #5C3D2E;
  --color-wood-medium:     #8B6914;
  --color-wood-light:      #C4A882;
  --color-wood-cream:      #F5E6D3;
  --color-bg-primary:      #FDF8F3;
  --color-bg-glass:        rgba(255, 255, 255, 0.25);
  --color-glass-border:    rgba(255, 255, 255, 0.45);
  --color-glass-shadow:    rgba(92, 61, 46, 0.08);
  --color-text-primary:    #2C1810;
  --color-text-secondary:  #6B5344;
  --color-accent-gold:     #D4A574;
  --color-accent-green:    #4A7C59;
  --color-error:           #C0392B;
}
```

### 5B. Typography

```css
--font-heading: 'Playfair Display', serif;
--font-body:    'Inter', sans-serif;
```

### 5C. Glassmorphism Token

```css
.glass-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(92, 61, 46, 0.08);
}
```

---

## 6. Project Structure

### 6A. Frontend (`/frontend`)

```
frontend/
├── public/
│   ├── models/              # 3D GLB models
│   ├── textures/            # Wood grain textures
│   └── images/              # Product images
├── src/
│   ├── main.jsx             # App entry point
│   ├── App.jsx              # Root component + router
│   ├── index.css            # Design system tokens + globals
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx        # Logo + Search + Login + Cart
│   │   │   ├── Header.css
│   │   │   ├── Footer.jsx
│   │   │   └── Footer.css
│   │   ├── three/
│   │   │   ├── Scene.jsx          # Main Three.js canvas
│   │   │   ├── Parallette.jsx     # 3D parallette model
│   │   │   ├── AssemblyAnimation.jsx
│   │   │   └── Environment.jsx
│   │   ├── ui/
│   │   │   ├── GlassCard.jsx
│   │   │   ├── FeatureCard.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ReviewCard.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── Modal.jsx
│   │   └── common/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       └── Loader.jsx         # Loading screen
│   ├── pages/
│   │   ├── Home.jsx               # Hero + 3D showcase
│   │   ├── Shop.jsx               # Product catalog
│   │   ├── ProductDetail.jsx      # Single product + 3D viewer
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Login.jsx
│   │   ├── Wishlist.jsx
│   │   ├── Search.jsx
│   │   ├── FAQ.jsx
│   │   ├── Contact.jsx
│   │   ├── About.jsx
│   │   ├── StoreLocator.jsx
│   │   └── Policy.jsx
│   ├── store/
│   │   ├── cartStore.js           # Zustand cart state
│   │   ├── authStore.js           # Zustand auth state
│   │   └── wishlistStore.js
│   ├── services/
│   │   ├── api.js                 # Axios instance + interceptors
│   │   ├── productService.js
│   │   ├── authService.js
│   │   ├── cartService.js
│   │   └── reviewService.js
│   └── utils/
│       ├── formatters.js
│       └── constants.js
├── package.json
├── vite.config.js
└── index.html
```

### 6B. Backend (`/backend`)

```
backend/
├── src/main/java/com/yatrax/
│   ├── YatraXApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── CorsConfig.java
│   │   └── JwtConfig.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── ProductController.java
│   │   ├── CartController.java
│   │   ├── OrderController.java
│   │   ├── ReviewController.java
│   │   └── WishlistController.java
│   ├── model/
│   │   ├── User.java
│   │   ├── Product.java
│   │   ├── CartItem.java
│   │   ├── Order.java
│   │   ├── Review.java
│   │   └── WishlistItem.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── ProductRepository.java
│   │   └── ...
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── ProductService.java
│   │   ├── JwtService.java
│   │   └── ...
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── ProductResponse.java
│   │   └── ...
│   └── security/
│       ├── JwtAuthFilter.java
│       └── JwtTokenProvider.java
├── src/main/resources/
│   ├── application.properties
│   └── data.sql                   # Seed product data
├── pom.xml
└── mvnw
```

---

## 7. Page Layouts

### Page 1: Homepage (`Home.jsx`) — Hero + 3D Showcase

```
┌─────────────────────────────────────────────────────┐
│ [LOGO]                    [Search] [Login] [Cart]   │  ← Glassmorphic navbar
├─────────────────────────────────────────────────────┤
│                                                     │
│          ╔═══════════════════════════╗              │
│          ║   3D PARALLETTES         ║              │
│          ║   Assembly Animation     ║  ← Full BG   │
│   [Card] ║   Rotating Showcase      ║ [Card]       │
│          ║                          ║              │
│          ╚═══════════════════════════╝              │
│   [Card]        [Card]        [Card]     [Card]     │  ← Feature cards
│                                                     │
├─────────────────────────────────────────────────────┤
│  "Welcome to Yatra X" — Brand intro section         │
├─────────────────────────────────────────────────────┤
│  Featured Products Grid (3–4 cards)                 │
├─────────────────────────────────────────────────────┤
│  Customer Reviews Carousel                          │
├─────────────────────────────────────────────────────┤
│  Special Discount Banner                            │
├─────────────────────────────────────────────────────┤
│  Social Proof (Instagram / YouTube embeds)          │
├─────────────────────────────────────────────────────┤
│  Footer (links, socials, contact, no-return policy) │
└─────────────────────────────────────────────────────┘
```

### Page 2: Product Detail — 3D Interactive Viewer

- Full 3D interactive viewer (drag to rotate, scroll to zoom)
- Assembly animation replay button
- Product info + pricing + customization panel
- Feature cards (size, materials, laser engraving options)
- Reviews & ratings + similar products carousel

### Page 3–13: See Feature Inventory (Section 2)

---

## 8. 3D Animation Specification

### Assembly Animation Timeline (Homepage)

```
T=0.0s   Scene loads, warm lighting, camera at 45°
         Parts invisible, scattered off-screen

T=0.5s   Left foot block flies in from bottom-left
         Easing: power3.out | Duration: 0.8s

T=1.0s   Right foot block flies in from bottom-right
         Easing: power3.out | Duration: 0.8s

T=1.5s   Left foot block (top) flies in from top-left
         Easing: power3.out | Duration: 0.8s

T=2.0s   Right foot block (top) flies in from top-right
         Easing: power3.out | Duration: 0.8s

T=2.5s   Two horizontal bars slide in from center
         Snap into foot blocks with subtle bounce
         Easing: elastic.out(1, 0.5) | Duration: 1s

T=3.5s   Assembly complete — camera slowly orbits
         Rotation: Y-axis, 10s per revolution
         Subtle float: Y ±5px, 3s cycle

T=4.0s   Feature cards fade in (staggered 0.15s each)
```

### Rendering Specs

- **Renderer:** WebGLRenderer (antialias, alpha, preserveDrawingBuffer)
- **Lighting:** HDR environment map + 2 directional lights + ambient
- **Materials:** MeshStandardMaterial with wood textures (diffuse, normal, roughness)
- **Post-processing:** Subtle bloom + ambient occlusion
- **Fallback:** Static image for WebGL-unsupported devices

---

## 9. Responsive Breakpoints

| Breakpoint | Target | 3D Behavior |
|-----------|--------|-------------|
| `>1200px` | Desktop | Full 3D + 6 feature cards |
| `992–1200px` | Laptop | Full 3D + 4 feature cards |
| `768–991px` | Tablet | Simplified 3D + 2 cards |
| `<768px` | Mobile | Static image fallback + stacked cards |

---

## 10. Development Phases & Progress

### Phase 1 — Project Setup ⬅ CURRENT
- `[ ]` Initialize React + Vite frontend
- `[ ]` Install all frontend dependencies
- `[ ]` Initialize Spring Boot backend
- `[ ]` Configure CORS between frontend (5173) and backend (8080)
- `[ ]` Setup design system CSS

### Phase 2 — Homepage & 3D (First Visible Output)
- `[ ]` Loading/splash screen with brand animation
- `[ ]` Header component (logo, search, login, cart)
- `[ ]` Three.js scene setup with lighting
- `[ ]` Build parallette 3D model (procedural geometry)
- `[ ]` Assembly animation with GSAP
- `[ ]` Continuous rotation post-assembly
- `[ ]` Glassmorphic feature cards around 3D
- `[ ]` Welcome section + brand intro
- `[ ]` Footer component
- `[ ]` Responsive adjustments

### Phase 3 — Core E-Commerce Pages
- `[ ]` Shop/catalog page with product grid
- `[ ]` Product detail page with 3D viewer
- `[ ]` Cart page with state management
- `[ ]` Checkout page with payment flow
- `[ ]` Login/register pages

### Phase 4 — Backend API
- `[ ]` Database schema + JPA entities
- `[ ]` Auth API (register, login, JWT)
- `[ ]` Product API (CRUD, search, filter)
- `[ ]` Cart API
- `[ ]` Order API + payment integration
- `[ ]` Review API
- `[ ]` Connect frontend to backend APIs

### Phase 5 — Additional Features
- `[ ]` Search with live suggestions
- `[ ]` Reviews & ratings
- `[ ]` Wishlist
- `[ ]` FAQ, Contact, About, Policy pages
- `[ ]` Store locator
- `[ ]` Social media integration
- `[ ]` Discount/promo system

### Phase 6 — Polish & Deployment
- `[ ]` Performance optimization (Lighthouse >85)
- `[ ]` SEO meta tags
- `[ ]` Micro-animations & hover effects
- `[ ]` Mobile testing
- `[ ]` 2FA implementation
- `[ ]` Deployment (Vercel + Railway)

---

## 11. Commands Reference

### Frontend Setup
```bash
# Create React project with Vite
npm create vite@latest frontend -- --template react

# Install core dependencies
cd frontend && npm install

# 3D engine
npm install three @react-three/fiber @react-three/drei

# Animations
npm install gsap framer-motion

# Routing + state + HTTP
npm install react-router-dom zustand axios

# Icons
npm install lucide-react
```

### Backend Setup
```bash
# Generate via Spring Initializr (or curl)
# Dependencies: Web, Security, JPA, MySQL, Validation, DevTools, Lombok
```

### Development Servers
```bash
# Frontend (port 5173)
cd frontend && npm run dev

# Backend (port 8080)
cd backend && mvnw spring-boot:run
```

---

> **This document is the single source of truth for all development sessions.**  
> Update the Status column and Phase checkboxes as progress is made.
