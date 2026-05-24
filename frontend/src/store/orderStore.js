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
        text: "Outstanding solid ash wood quality. The grip feel is phenomenal for handstands and L-sits. My training has improved drastically since I started using these. Highly recommend to every calisthenics enthusiast!",
        date: "24 May 2026",
      },
      {
        id: 102,
        productId: 1,
        author: "Priya Sharma",
        rating: 4,
        text: "Beautifully carved. The laser logo looks premium. Extremely sturdy construction — tested with 120kg bodyweight and zero flex.",
        date: "18 May 2026",
      },
      {
        id: 201,
        productId: 2,
        author: "Rohan Das",
        rating: 5,
        text: "Perfect portability. Fits in my backpack cleanly. The silicon pads do not slip on marble floors at all. Great for travel workouts.",
        date: "20 May 2026",
      },
      {
        id: 202,
        productId: 2,
        author: "Ananya Iyer",
        rating: 5,
        text: "I ordered the Sheesham variant and the grain pattern is gorgeous. Worth every rupee for the quality you get. My coach was impressed!",
        date: "22 May 2026",
      },
      {
        id: 301,
        productId: 3,
        author: "Karthik Nair",
        rating: 5,
        text: "The Elite Parallettes are on another level. The walnut finish is museum-grade. I use them for planche progressions daily and they haven't budged.",
        date: "21 May 2026",
      },
      {
        id: 302,
        productId: 3,
        author: "Sneha Reddy",
        rating: 4,
        text: "Solid build and absolutely beautiful design. The engraving service was a nice touch — got my gym name on it. Only wish they came in more colors.",
        date: "19 May 2026",
      },
      {
        id: 401,
        productId: 4,
        author: "Aditya Verma",
        rating: 5,
        text: "Mini parallettes are perfect for push-up variations. My home gym setup looks incredibly premium now. Fast delivery to Bangalore too!",
        date: "23 May 2026",
      },
      {
        id: 501,
        productId: 5,
        author: "Meera Joshi",
        rating: 4,
        text: "The portable travel set is exactly what I needed. Lightweight yet strong. Takes my street workout sessions to the next level wherever I go.",
        date: "17 May 2026",
      },
      {
        id: 601,
        productId: 6,
        author: "Arjun Kapoor",
        rating: 5,
        text: "Competition-grade parallettes — the balance and weight distribution is perfect for professional gymnastics training. Olympic-level equipment at an amazing price!",
        date: "23 May 2026",
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
