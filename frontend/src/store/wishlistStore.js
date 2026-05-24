import { create } from 'zustand';

/**
 * Zustand Wishlist Store
 * Handles user's wishlist persistence.
 */
export const useWishlistStore = create((set, get) => {
  const loadInitialWishlist = () => {
    try {
      const saved = localStorage.getItem('yatra_x_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load wishlist from localStorage", e);
      return [];
    }
  };

  const persistWishlist = (items) => {
    try {
      localStorage.setItem('yatra_x_wishlist', JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save wishlist to localStorage", e);
    }
  };

  return {
    items: loadInitialWishlist(), // List of product objects

    toggleWishlist: (product) => {
      const currentItems = get().items;
      const exists = currentItems.some((item) => item.id === product.id);

      let newItems;
      if (exists) {
        newItems = currentItems.filter((item) => item.id !== product.id);
      } else {
        newItems = [...currentItems, product];
      }

      set({ items: newItems });
      persistWishlist(newItems);
    },

    isInWishlist: (productId) => {
      return get().items.some((item) => item.id === productId);
    },
  };
});
