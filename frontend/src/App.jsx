import { useState, useEffect, lazy, Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Loader from './components/ui/Loader';

// Error boundary to prevent 3D canvas crashes from taking down the entire website
class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[Yatra X] 3D Background Canvas failed to render:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return null; // Suppress crash and fallback gracefully to pure CSS background
    }
    return this.props.children;
  }
}

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        {loading ? (
          <Loader onComplete={() => setLoading(false)} />
        ) : (
          <>
            <Header />

            {/* Global persistent 3D animation background */}
            <div className="scene-fixed-bg">
              <SceneErrorBoundary>
                <Suspense fallback={null}>
                  <Scene />
                </Suspense>
              </SceneErrorBoundary>
            </div>

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
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
    </QueryClientProvider>
  );
}

export default App;

