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
    const slugify = str => str ? str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    return backendItems.map(item => ({
      id: item.id, //the database primary key of WishlistItem
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug ?? slugify(item.product.name),
        description: item.product.description || '',
        price: Number(item.product.price),
        originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : null,
        rating: item.product.rating ? Number(item.product.rating) : 5.0,
        image: item.product.imageUrl || item.product.image_url || null,
        video: item.product.videoUrl || item.product.video_url || null,
        model: item.product.modelUrl || item.product.model_url || null,
        onSale: item.product.onSale,
        category: item.product.category || '',
        variants: item.product.variants ? item.product.variants.map(v => ({
          id: v.id,
          woodType: v.woodType,
          price: Number(v.price),
          originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
          swatchColor: v.swatchColor || '#8B6914',
          image: v.imageUrl || v.image_url || null,
          video: v.videoUrl || v.video_url || null,
          model: v.modelUrl || v.model_url || null
        })) : []
      },
      variant: item.productVariant ? {
        id: item.productVariant.id,
        woodType: item.productVariant.woodType,
        price: Number(item.productVariant.price),
        originalPrice: item.productVariant.originalPrice ? Number(item.productVariant.originalPrice) : null,
        swatchColor: item.productVariant.swatchColor || '#8B6914',
        image: item.productVariant.imageUrl || item.productVariant.image_url || null,
        video: item.productVariant.videoUrl || item.productVariant.video_url || null,
        model: item.productVariant.modelUrl || item.productVariant.model_url || null
      } : null
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

          // Self-Healing: Fetch fresh product data from backend API to replace stale localStorage images/prices
          try {
            const catalogResponse = await api.get('/api/products');
            const catalogList = catalogResponse.data.content ?? catalogResponse.data.products ?? catalogResponse.data ?? [];
            
            // Map raw catalog list to normalized product objects
            const normalizedCatalog = catalogList.map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description || '',
              price: Number(p.price),
              originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
              rating: p.rating ? Number(p.rating) : 5.0,
              image: p.imageUrl || p.image_url || null,
              video: p.videoUrl || p.video_url || null,
              model: p.modelUrl || p.model_url || null,
              onSale: p.onSale,
              category: p.category || '',
              variants: p.variants ? p.variants.map(v => ({
                id: v.id,
                woodType: v.woodType,
                price: Number(v.price),
                originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
                swatchColor: v.swatchColor || '#8B6914',
                image: v.imageUrl || v.image_url || null,
                video: v.videoUrl || v.video_url || null,
                model: v.modelUrl || v.model_url || null
              })) : []
            }));

            // Sync local items with fresh data
            parsed = parsed.map(item => {
              const freshProduct = normalizedCatalog.find(p => p.id === item.product.id);
              if (freshProduct) {
                const freshVariant = freshProduct.variants?.find(v => v.id === item.variant?.id) || item.variant || null;
                return { ...item, product: freshProduct, variant: freshVariant };
              }
              return item;
            });
            migrated = true; // Save healed objects back to localStorage
          } catch (fetchErr) {
            console.warn("Failed to fetch fresh catalog to heal local wishlist items, using local fallback.", fetchErr);
          }
          
          if (migrated) {
            localStorage.setItem('yatra_x_wishlist', JSON.stringify(parsed));
          }
          
          set({ items: parsed });
        } catch (e) {
          set({ items: [] });
        }
      }
    },

    toggleWishlist: async (product, variantId = null) => {
      if (!product) return;
      const targetVariantId = variantId || product.variants?.[0]?.id || null;
      const currentItems = get().items;
      const existingItem = currentItems.find((item) => 
        item && item.product && item.product.id === product.id && 
        (item.variant?.id === targetVariantId || (!item.variant && !targetVariantId))
      );

      if (isAuth()) {
        try {
          if (existingItem) {
            //Backend expects the WishlistItem entry database id to delete
            const response = await api.delete(`/api/wishlist/${existingItem.id}`);
            set({ items: mapWishlistItems(response.data) });
          } else {
            //Backend expects the product_id and optional variantId to create
            const response = await api.post('/api/wishlist', null, {
              params: { 
                productId: product.id,
                variantId: targetVariantId
              }
            });
            set({ items: mapWishlistItems(response.data) });
          }
        } catch (err) {
          console.error("Failed to update backend wishlist", err);
        }
      } else {
        let newItems;
        if (existingItem) {
          newItems = currentItems.filter((item) => 
            !(item && item.product && item.product.id === product.id && 
              (item.variant?.id === targetVariantId || (!item.variant && !targetVariantId)))
          );
        } else {
          const selectedVariant = product.variants?.find(v => v.id === targetVariantId) || null;
          newItems = [...currentItems, { 
            id: Date.now(), 
            product, 
            variant: selectedVariant 
          }];
        }
        set({ items: newItems });
        localStorage.setItem('yatra_x_wishlist', JSON.stringify(newItems));
      }
    },

    isInWishlist: (productId, variantId = null) => {
      if (variantId) {
        return get().items.some((item) => 
          item && item.product && item.product.id == productId && item.variant?.id == variantId
        );
      }
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