import { create } from 'zustand';
import api from '../utils/api';

/**
 * Zustand Order and Review Store
 * Persists orders and custom user reviews, syncing immediately to dynamic product detail pages.
 */
export const useOrderStore = create((set, get) => {

  const isAuth = () => !!localStorage.getItem('yatra_x_token');

  // Load initial orders from localStorage
  const loadInitialOrders = () => {
    try {
      const saved = localStorage.getItem('yatra_x_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Load reviews from localStorage (populated by backend API fetches)
  const loadInitialReviews = () => {
    try {
      const saved = localStorage.getItem('yatra_x_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { }
    return [];
  };

  const persistOrders = (orders) => {
    localStorage.setItem('yatra_x_orders', JSON.stringify(orders));
  };

  const persistReviews = (reviews) => {
    localStorage.setItem('yatra_x_reviews', JSON.stringify(reviews));
  };

  return {
    orders: loadInitialOrders(),
    reviews: loadInitialReviews(),

    loadOrderHistory: async () => {
      if (isAuth()) {
        try {
          const response = await api.get('/api/orders');
          const mappedOrders = response.data.map(order => ({
            id: order.id.toString(),
            date: new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }),
            items: order.items.map(item => ({
              id: item.product.id,
              name: item.productName,
              image: item.product.imageUrl,
              quantity: item.quantity,
              woodType: item.variantInfo || 'Default',
              price: Number(item.productPrice),
            })),
            totalAmount: Number(order.total),
            status: order.status,
          }));
          set({ orders: mappedOrders });
        } catch (err) {
          console.error("Failed to load order history from backend", err);
        }
      } else {
        try {
          const saved = localStorage.getItem('yatra_x_orders');
          set({ orders: saved ? JSON.parse(saved) : [] });
        } catch (e) {
          set({ orders: [] });
        }
      }
    },

    // Place a new order calling API if authenticated, else localStorage
    placeOrder: async (shippingForm, paymentMethod, items, grandTotal) => {
      if (isAuth()) {
        try {
          const response = await api.post('/api/orders/checkout', null, {
            params: {
              shippingName: `${shippingForm.firstName} ${shippingForm.lastName}`,
              shippingPhone: shippingForm.phone,
              shippingAddress: shippingForm.address,
              shippingCity: shippingForm.city,
              shippingState: shippingForm.state,
              shippingPincode: shippingForm.postalCode,
              paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'upi' ? 'UPI' : 'Credit Card',
            }
          });

          const backendOrder = response.data;
          const mappedOrder = {
            id: backendOrder.id.toString(),
            date: new Date(backendOrder.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }),
            items: backendOrder.items.map(item => ({
              id: item.product.id,
              name: item.productName,
              image: item.product.imageUrl,
              quantity: item.quantity,
              woodType: item.variantInfo || 'Default',
              price: Number(item.productPrice),
            })),
            totalAmount: Number(backendOrder.total),
            status: backendOrder.status,
          };

          set(state => ({
            orders: [mappedOrder, ...state.orders]
          }));

          return { success: true, orderId: mappedOrder.id };
        } catch (err) {
          console.error("Backend checkout failed", err);
          throw new Error(err.response?.data || err.message);
        }
      } else {
        throw new Error('Please log in to place an order.');
      }
    },

    // Kept for backward compatibility or local additions
    addOrder: (order) => {
      const updated = [order, ...get().orders];
      set({ orders: updated });
      persistOrders(updated);
    },

    // Submit or update a review for a purchased product
    addReview: async (productId, rating, text) => {
      try {
        await api.post(`/api/review/${productId}`, null, {
          params: {
            rating: parseInt(rating),
            text: text
          }
        });

        //Dynamic re-fetch of reviews for this product from the backend
        await get().fetchReviews(productId);
        return { success: true };
      } catch (err) {
        console.error("Failed to submit review to backend", err);
        throw new Error(err.response?.data || err.message);
      }
    },

    //Fetch reviews from the backend and update the store state
    fetchReviews: async (productId) => {
      try {
        const response = await api.get(`/api/products/${productId}/reviews`);
        const mappedReviews = response.data.map(r => ({
          id: r.id,
          productId: parseInt(productId),
          author: r.authorName,
          rating: r.rating,
          text: r.text,
          date: new Date(r.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        }));

        set(state => {
          //Keep reviews for other products, but update/refresh reviews for this product
          const reviewsArray = Array.isArray(state.reviews) ? state.reviews : [];
          const otherReviews = reviewsArray.filter(rev => rev && rev.productId !== parseInt(productId));
          return { reviews: [...mappedReviews, ...otherReviews] };
        });
      } catch (err) {
        console.error("Failed to fetch reviews from backend", err);
      }
    },

    // Get reviews for a specific product
    getProductReviews: (productId) => {
      const reviewsArray = Array.isArray(get().reviews) ? get().reviews : [];
      return reviewsArray.filter(r => r && r.productId === parseInt(productId));
    }
  };
});
