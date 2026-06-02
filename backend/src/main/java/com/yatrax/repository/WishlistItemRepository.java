package com.yatrax.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.yatrax.model.WishlistItem;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    // Retrieve all wishlist items mapped to a specific user
    List<WishlistItem> findByUserId(Long userId);

    // Retrieve a specific user's wishlist item for a given product
    Optional<WishlistItem> findByUserIdAndProductId(Long userId, Long productId);

    // Check if the user already has this product in their wishlist
    boolean existsByUserIdAndProductId(Long userId, Long productId);

    // Clear the entire wishlist for a user (typically used for testing or reset)
    void deleteByUserId(Long userId);
}
