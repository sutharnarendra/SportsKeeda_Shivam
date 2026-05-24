import { create } from 'zustand';

/**
 * Zustand Cart Store
 * Handles adding, removing, quantity updates, and persistency to localStorage.
 */
export const useCartStore = create((set, get) => {
  // Load initial cart state from localStorage
  const loadInitialCart = () => {
    try {
      const saved = localStorage.getItem('yatra_x_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
      return [];
    }
  };

  const persistCart = (items) => {
    try {
      localStorage.setItem('yatra_x_cart', JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  };

  return {
    items: loadInitialCart(),

    addToCart: (product, variantIndex, quantity = 1) => {
      const currentItems = get().items;
      const baseVariant = product.variants?.[variantIndex] || { woodType: 'Default', price: product.price };
      
      // Calculate custom price including dynamic engraving surcharges if present
      const finalPrice = baseVariant.price + (product.customPricingAdded || 0);
      const variant = { ...baseVariant, price: finalPrice };

      // Find if item already exists with exact same variant and custom engraving requests
      const existingIdx = currentItems.findIndex(
        (item) => 
          item.product.id === product.id && 
          item.variant.woodType === variant.woodType &&
          item.product.engravingRequest === product.engravingRequest &&
          item.product.engravingLogo === product.engravingLogo
      );

      let newItems;
      if (existingIdx > -1) {
        newItems = [...currentItems];
        newItems[existingIdx].quantity += quantity;
      } else {
        newItems = [...currentItems, { product, variant, quantity }];
      }

      set({ items: newItems });
      persistCart(newItems);
    },

    removeFromCart: (productId, woodType) => {
      const newItems = get().items.filter(
        (item) => !(item.product.id === productId && item.variant.woodType === woodType)
      );
      set({ items: newItems });
      persistCart(newItems);
    },

    updateQuantity: (productId, woodType, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(productId, woodType);
        return;
      }

      const newItems = get().items.map((item) => {
        if (item.product.id === productId && item.variant.woodType === woodType) {
          return { ...item, quantity };
        }
        return item;
      });

      set({ items: newItems });
      persistCart(newItems);
    },

    clearCart: () => {
      set({ items: [] });
      persistCart([]);
    },

    // Computed getters
    getTotalItems: () => {
      return get().items.reduce((sum, item) => sum + item.quantity, 0);
    },

    getTotalPrice: () => {
      return get().items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
    },
  };
});
