package com.yatrax.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.model.User;
import com.yatrax.model.WishlistItem;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.WishlistItemRepository;

@Service
@Transactional
public class WishlistService {

    @Autowired
    private WishlistItemRepository wishlistRepository;

    @Autowired
    private ProductRepository productRepository;

    // 1. Retrieve the entire wishlist for a specific user
    public List<WishlistItem> getWishlist(Long userId) {
        return wishlistRepository.findByUserId(userId);
    }

    // 2. Add an item to the wishlist with duplicate protection
    public List<WishlistItem> addToWishlist(User user, Long productId, Long variantId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found!!"));

        ProductVariant variant;
        if (variantId != null) {
            variant = product.getVariants().stream()
                    .filter(v -> v.getId().equals(variantId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Error: Variant not found for this product!!"));
        } else {
            if (product.getVariants() == null || product.getVariants().isEmpty()) {
                throw new IllegalArgumentException("Error: Product has no variants!!");
            }
            variant = product.getVariants().get(0);
        }

        // Enforce duplicate check per user, product, and variant to prevent unique constraints failures
        if (wishlistRepository.existsByUserIdAndProductIdAndProductVariantId(user.getId(), productId, variant.getId())) {
            throw new IllegalArgumentException("Error: Product variant is already in your wishlist!!");
        }

        WishlistItem item = WishlistItem.builder()
                .user(user)
                .product(product)
                .productVariant(variant)
                .build();

        wishlistRepository.save(item);
        return getWishlist(user.getId());
    }

    // 3. Remove an item securely from a user's wishlist
    public List<WishlistItem> removeFromWishlist(Long userId, Long wishlistId) {
        WishlistItem item = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Wishlist item not found!!"));

        // Security check: Make sure this wishlist item belongs to the authenticated
        // user
        if (!item.getUser().getId().equals(userId)) {
            throw new SecurityException("Error: Unauthorized to modify this wishlist!!");
        }

        wishlistRepository.delete(item);
        return getWishlist(userId);
    }

    // 4. Clear the entire wishlist for a specific user
    public void clearWishlist(Long userId) {
        wishlistRepository.deleteByUserId(userId);
    }
}
