package com.yatrax.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.User;
import com.yatrax.model.WishlistItem;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;
import com.yatrax.service.WishlistService;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Authenticated user not found!!"));
    }

    // 1. Get current authenticated user's wishlist
    @GetMapping
    public ResponseEntity<?> getWishlist() {
        try {
            User user = getAuthenticatedUser();
            List<WishlistItem> wishlist = wishlistService.getWishlist(user.getId());
            return ResponseEntity.ok(wishlist);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. Add an item to the wishlist
    @PostMapping
    public ResponseEntity<?> addToWishlist(
            @RequestParam Long productId,
            @RequestParam(required = false) Long variantId) {
        try {
            User user = getAuthenticatedUser();
            List<WishlistItem> updatedWishlist = wishlistService.addToWishlist(user, productId, variantId);
            return ResponseEntity.ok(updatedWishlist);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 3. Remove an item from the wishlist
    @DeleteMapping("/{wishlistItemId}")
    public ResponseEntity<?> removeFromWishlist(@PathVariable Long wishlistItemId) {
        try {
            User user = getAuthenticatedUser();
            List<WishlistItem> updatedWishlist = wishlistService.removeFromWishlist(user.getId(), wishlistItemId);
            return ResponseEntity.ok(updatedWishlist);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 4. Clear the entire wishlist
    @DeleteMapping
    public ResponseEntity<?> clearWishlist() {
        try {
            User user = getAuthenticatedUser();
            wishlistService.clearWishlist(user.getId());
            return ResponseEntity.ok("Wishlist cleared successfully!!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
