import { create } from 'zustand';

/**
 * Zustand Order and Review Store
 * Persists orders and custom user reviews, syncing immediately to dynamic product detail pages.
 */
export const useOrderStore = create((set, get) => {
  // Load initial orders from localStorage
  const loadInitialOrders = () => {
    try {
      const saved = localStorage.getItem('yatra_x_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Load initial custom reviews from localStorage
  const loadInitialReviews = () => {
    try {
      const saved = localStorage.getItem('yatra_x_reviews');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Default premium seed reviews if empty
    return [
      {
        id: 101,
        productId: 1,
        author: "Vikram Malhotra",
        rating: 5,
        text: "Outstanding solid ash wood quality. The grip feel is phenomenal for handstands. Highly recommend!",
        date: "24 May 2026",
      },
      {
        id: 102,
        productId: 1,
        author: "Priya Sharma",
        rating: 4,
        text: "Beautifully carved. The laser logo looks premium. Extremely sturdy construction.",
        date: "18 May 2026",
      },
      {
        id: 201,
        productId: 2,
        author: "Rohan Das",
        rating: 5,
        text: "Perfect portability. Fits in my backpack cleanly. The silicon pads do not slip on marble floors.",
        date: "20 May 2026",
      }
    ];
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

    // Add a newly placed checkout order
    addOrder: (order) => {
      const updated = [order, ...get().orders];
      set({ orders: updated });
      persistOrders(updated);
    },

    // Submit or update a review for a purchased product
    addReview: (productId, rating, text, author) => {
      const currentReviews = get().reviews;
      const parsedProductId = parseInt(productId);
      const activeAuthor = author || "Anonymous User";

      // Find if review already exists for this product by this specific author
      const existingIndex = currentReviews.findIndex(
        (r) => r.productId === parsedProductId && r.author === activeAuthor
      );

      let updated;
      if (existingIndex > -1) {
        updated = [...currentReviews];
        updated[existingIndex] = {
          ...updated[existingIndex],
          rating: parseInt(rating),
          text: text,
          date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) + " (Updated)"
        };
      } else {
        const newReview = {
          id: Date.now(),
          productId: parsedProductId,
          author: activeAuthor,
          rating: parseInt(rating),
          text: text,
          date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
        };
        updated = [newReview, ...currentReviews];
      }

      set({ reviews: updated });
      persistReviews(updated);
    },

    // Get reviews for a specific product
    getProductReviews: (productId) => {
      return get().reviews.filter(r => r.productId === parseInt(productId));
    }
  };
});
