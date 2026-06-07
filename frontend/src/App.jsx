import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Loader from './components/ui/Loader';

const Scene = lazy(() => import('./components/three/Scene'));
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import FAQ from './pages/FAQ';
import Policy from './pages/Policy';
import OrderHistory from './pages/OrderHistory';
import Wishlist from './pages/Wishlist';
import { Analytics } from '@vercel/analytics/react';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <BrowserRouter>
      <ScrollToTop />
      {loading ? (

        <Loader onComplete={() => setLoading(false)} />
      ) : (
        <>
          <Header />

          {/* Global persistent 3D animation background */}
          <div className="scene-fixed-bg">
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </div>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path='/faq' element={<FAQ />} />
            <Route path='/policy' element={<Policy />} />
          </Routes>
          <Footer />
          <Analytics />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;

