import { create } from 'zustand';
import api from '../utils/api';

/*
Zustand Wishlist Store
Handles backed synchronizations for authenticated users and local storage fallbacks.
*/

export const useWishlistStore = create((set, get) => {
  const isAuth = () => !!localStorage.getItem('yatra_x_token');

  //Map backend WishlistItem structure to frontend store structure
  const mapWishlistItems = (backendItems) => {
    return backendItems.map(item => ({
      id: item.id, //the database primary key of WishlistItem
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description || '',
        price: Number(item.product.price),
        originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : null,
        rating: item.product.rating ? Number(item.product.rating) : 5.0,
        image: item.product.imageUrl || null,
        video: item.product.videoUrl || null,
        onSale: item.product.onSale,
        category: item.product.category || '',
        variants: item.product.variants ? item.product.variants.map(v => ({
          id: v.id,
          woodType: v.woodType,
          price: Number(v.price),
          originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
          swatchColor: v.swatchColor || '#8B6914'
        })) : []
      }
    }));
  };

  return {
    items: [],

    loadWishlist: async () => {
      if (isAuth()) {
        try {
          const response = await api.get('/api/wishlist');
          set({ items: mapWishlistItems(response.data) });
        } catch (err) {
          console.error("Failed to load wishlist from backend", err);
        }
      } else {
        try {
          const saved = localStorage.getItem('yatra_x_wishlist');
          let parsed = saved ? JSON.parse(saved) : [];
          
          // Migrate old format (direct product list) to new format ({ id, product })
          let migrated = false;
          parsed = parsed.map(item => {
            if (item && !item.product) {
              migrated = true;
              return { id: item.id || Date.now(), product: item };
            }
            return item;
          });
          
          if (migrated) {
            localStorage.setItem('yatra_x_wishlist', JSON.stringify(parsed));
          }
          
          set({ items: parsed });
        } catch (e) {
          set({ items: [] });
        }
      }
    },

    toggleWishlist: async (product) => {
      if (!product) return;
      const currentItems = get().items;
      const existingItem = currentItems.find((item) => item && item.product && item.product.id === product.id);

      if (isAuth()) {
        try {
          if (existingItem) {
            //Backend expects the WishlistItem entry database id to delete
            const response = await api.delete(`/api/wishlist/${existingItem.id}`);
            set({ items: mapWishlistItems(response.data) });
          } else {
            //Backend expects the product_id to create
            const response = await api.post('/api/wishlist', null, {
              params: { productId: product.id }
            });
            set({ items: mapWishlistItems(response.data) });
          }
        } catch (err) {
          console.error("Failed to update backend wishlist", err);
        }
      } else {
        let newItems;
        if (existingItem) {
          newItems = currentItems.filter((item) => item && item.product && item.product.id !== product.id);
        } else {
          newItems = [...currentItems, { id: Date.now(), product }];
        }
        set({ items: newItems });
        localStorage.setItem('yatra_x_wishlist', JSON.stringify(newItems));
      }
    },

    isInWishlist: (productId) => {
      return get().items.some((item) => item && item.product && item.product.id == productId);
    },

    clearWishlist: async () => {
      if (isAuth()) {
        try {
          await api.delete('/api/wishlist');
          set({ items: [] });
        } catch (err) {
          console.error("Failed to clear backend wishlist", err);
        }
      } else {
        set({ items: [] });
        localStorage.removeItem('yatra_x_wishlist');
      }
    }
  };
});