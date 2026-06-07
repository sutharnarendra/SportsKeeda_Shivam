import { create } from 'zustand';
import api from '../utils/api';

/**
 * Zustand Cart Store
 * Handles adding, removing, quantity updates, and syncing with backend if authenticated.
 */
export const useCartStore = create((set, get) => {
  
  // Helper to check if user is authenticated
  const isAuth = () => !!localStorage.getItem('yatra_x_token');

  // Map backend CartItem structure to frontend store structure
  const mapCartItems = (backendItems) => {
    return backendItems.map(item => ({
      id: item.id,
      product: {
        ...item.product,
        image: item.product.imageUrl // mapping backend imageUrl to frontend image
      },
      variant: item.productVariant ? {
        ...item.productVariant,
        woodType: item.productVariant.woodType
      } : { woodType: 'Default', price: item.product.price },
      quantity: item.quantity
    }));
  };

  return {
    items: [],

    loadCart: async () => {
      if (isAuth()) {
        try {
          const response = await api.get('/api/cart');
          set({ items: mapCartItems(response.data) });
        } catch (err) {
          console.error("Failed to load cart from backend", err);
        }
      } else {
        try {
          const saved = localStorage.getItem('yatra_x_cart');
          set({ items: saved ? JSON.parse(saved) : [] });
        } catch (e) {
          set({ items: [] });
        }
      }
    },

    addToCart: async (product, variantIndex, quantity = 1) => {
      const baseVariant = product.variants?.[variantIndex] || null;
      
      if (isAuth()) {
        try {
          const response = await api.post('/api/cart', null, {
            params: {
              productId: product.id,
              variantId: baseVariant?.id || null,
              quantity: quantity
            }
          });
          set({ items: mapCartItems(response.data) });
        } catch (err) {
          console.error("Failed to add to backend cart", err);
        }
      } else {
        const currentItems = get().items;
        // Calculate custom price including dynamic engraving surcharges if present
        const finalPrice = (baseVariant?.price || product.price) + (product.customPricingAdded || 0);
        const variant = baseVariant ? { ...baseVariant, price: finalPrice } : { woodType: 'Default', price: finalPrice };

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
        localStorage.setItem('yatra_x_cart', JSON.stringify(newItems));
      }
    },

    removeFromCart: async (productId, woodType) => {
      if (isAuth()) {
        try {
          // Find the cart item with matching product and variant
          const itemToDelete = get().items.find(
            (item) => item.product.id === productId && item.variant.woodType === woodType
          );
          if (itemToDelete) {
            const response = await api.delete(`/api/cart/${itemToDelete.id}`);
            set({ items: mapCartItems(response.data) });
          }
        } catch (err) {
          console.error("Failed to remove from backend cart", err);
        }
      } else {
        const newItems = get().items.filter(
          (item) => !(item.product.id === productId && item.variant.woodType === woodType)
        );
        set({ items: newItems });
        localStorage.setItem('yatra_x_cart', JSON.stringify(newItems));
      }
    },

    updateQuantity: async (productId, woodType, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(productId, woodType);
        return;
      }

      if (isAuth()) {
        try {
          const itemToUpdate = get().items.find(
            (item) => item.product.id === productId && item.variant.woodType === woodType
          );
          if (itemToUpdate) {
            const response = await api.put(`/api/cart/${itemToUpdate.id}`, null, {
              params: { quantity }
            });
            set({ items: mapCartItems(response.data) });
          }
        } catch (err) {
          console.error("Failed to update backend cart quantity", err);
        }
      } else {
        const newItems = get().items.map((item) => {
          if (item.product.id === productId && item.variant.woodType === woodType) {
            return { ...item, quantity };
          }
          return item;
        });

        set({ items: newItems });
        localStorage.setItem('yatra_x_cart', JSON.stringify(newItems));
      }
    },

    clearCart: async () => {
      if (isAuth()) {
        try {
          await api.delete('/api/cart');
          set({ items: [] });
        } catch (err) {
          console.error("Failed to clear backend cart", err);
        }
      } else {
        set({ items: [] });
        localStorage.removeItem('yatra_x_cart');
      }
    },

    mergeCart: async () => {
      try {
        const saved = localStorage.getItem('yatra_x_cart');
        const localItems = saved ? JSON.parse(saved) : [];
        if (localItems.length > 0) {
          for (const item of localItems) {
            const variantId = item.variant?.id || null;
            await api.post('/api/cart', null, {
              params: {
                productId: item.product.id,
                variantId: variantId,
                quantity: item.quantity
              }
            });
          }
          localStorage.removeItem('yatra_x_cart');
        }
        // Load fresh backend cart
        const response = await api.get('/api/cart');
        set({ items: mapCartItems(response.data) });
      } catch (err) {
        console.error("Failed to merge carts on login", err);
      }
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
