package com.yatrax.service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.CartItem;
import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.model.User;
import com.yatrax.repository.CartItemRepository;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.ProductVariantRepository;

@Service
@Transactional
public class CartService {

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String CART_CACHE_PREFIX = "yatra:user:";

    private String getCacheKey(Long userId) {
        return CART_CACHE_PREFIX + userId + ":cart";
    }

    // Cache-Aside: Reads from Upstash Redis first, falls back to Neon DB
    public List<CartItem> getCart(Long userId) {
        String cacheKey = getCacheKey(userId);

        // 1. Try reading from Upstash Redis
        try {
            List<CartItem> cachedCart = (List<CartItem>) redisTemplate.opsForValue().get(cacheKey);
            if (cachedCart != null) {
                return cachedCart;
            }
        } catch (Exception e) {
            // Non-blocking fallback: If Redis is temporarily down, proceed to database
        }

        // 2. Cache Miss: Load from Neon PostgreSQL
        List<CartItem> databaseCart = cartItemRepository.findByUserId(userId);

        // 3. Populate cache in Redis with 24-hour expiration
        try {
            redisTemplate.opsForValue().set(cacheKey, databaseCart, 24, TimeUnit.HOURS);
        } catch (Exception e) {
            // Fail silently to keep application robus if cache fails
        }

        return databaseCart;
    }

    // Add a product variant or increments quantity if already present
    public List<CartItem> addToCart(User user, Long productId, Long variantId, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found!!"));

        ProductVariant variant = null;
        if (variantId != null) {
            variant = productVariantRepository.findById(variantId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Variant not found!!"));
        }

        // Check if item is already in the cart
        Optional<CartItem> existingItem = cartItemRepository.findByUserIdAndProductIdAndProductVariantId(user.getId(),
                productId, variantId);

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantity);
            cartItemRepository.save(item);
        } else {
            CartItem newItem = CartItem.builder()
                    .user(user)
                    .product(product)
                    .productVariant(variant)
                    .quantity(quantity)
                    .build();
            cartItemRepository.save(newItem);
        }

        // Evict/Invalidate active cache to trigger fresh reaload on next read
        evictCache(user.getId());
        return getCart(user.getId());
    }

    // Updates the quantity of a single cart item
    public List<CartItem> updateQuantity(Long userId, Long cartItemId, int quantity) {
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Cart item not found!!"));

        if (!item.getUser().getId().equals(userId)) {
            throw new SecurityException("Error: Unauthorized to modify this cart item!!");
        }

        item.setQuantity(quantity);
        cartItemRepository.save(item);

        evictCache(userId);
        return getCart(userId);
    }

    // Removes an item from the cart
    public List<CartItem> removeFromCart(Long userId, Long cartItemId) {
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Cart item not found!!"));

        if (!item.getUser().getId().equals(userId)) {
            throw new SecurityException("Error: Unauthorized to modify this cart item!!");
        }

        cartItemRepository.delete(item);

        evictCache(userId);
        return getCart(userId);
    }

    // Clears the entire user cart
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
        evictCache(userId);
    }

    private void evictCache(Long userId) {
        try {
            redisTemplate.delete(getCacheKey(userId));
        } catch (Exception e) {
            // Fail silently
        }
    }
}
