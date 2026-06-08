package com.yatrax.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.Product;
import com.yatrax.model.Review;
import com.yatrax.model.User;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;
import com.yatrax.service.ReviewService;

@RestController
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    // Helper method to retrieve current authenticated user
    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("Error: Unauthorized user context!!");
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Authenticated user not found!!"));
    }

    // 1. Fetch reviews publicly for a product
    @GetMapping("/api/products/{productId}/reviews")
    public ResponseEntity<?> getProductReviews(@PathVariable Long productId) {
        try {
            List<Review> reviews = reviewService.getReviewsByProductId(productId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 2. Submit or update review (Requires auth)
    @PostMapping("/api/review/{productId}")
    public ResponseEntity<?> addOrUpdateReview(
            @PathVariable Long productId,
            @RequestParam int rating,
            @RequestParam String text) {
        try {
            User user = getAuthenticatedUser();
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Product not found!!"));

            Review review = reviewService.addOrUpdateReview(product, user.getName(), rating, text);
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error submitting review: " + e.getMessage());
        }
    }
}
