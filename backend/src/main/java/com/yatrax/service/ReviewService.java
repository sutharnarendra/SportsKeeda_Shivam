package com.yatrax.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.Product;
import com.yatrax.model.Review;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.ReviewRepository;

@Service
@Transactional
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ProductRepository productRepository;

    // Get all reviews for a specific product
    public List<Review> getReviewsByProductId(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    // Add or update a product review and recalculate ratings/counts
    public Review addOrUpdateReview(Product product, String authorName, int rating, String text) {
        // Find if a review by this author already exists for the product
        List<Review> productReviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        Review existingReview = productReviews.stream()
                .filter(r -> r.getAuthorName().equalsIgnoreCase(authorName))
                .findFirst()
                .orElse(null);

        Review reviewToSave;
        if (existingReview != null) {
            existingReview.setRating(rating);
            existingReview.setText(text);
            reviewToSave = existingReview;
        } else {
            reviewToSave = Review.builder()
                    .product(product)
                    .authorName(authorName)
                    .rating(rating)
                    .text(text)
                    .build();
        }

        Review savedReview = reviewRepository.save(reviewToSave);

        // Fetch all updated reviews to recalculate values
        List<Review> updatedReviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        int count = updatedReviews.size();
        double sum = updatedReviews.stream().mapToDouble(Review::getRating).sum();
        double average = count > 0 ? sum / count : 0.0;

        // Set ratings and review count back to product
        product.setReview_count(count);
        product.setRating(BigDecimal.valueOf(average).setScale(1, RoundingMode.HALF_UP));
        productRepository.save(product);

        return savedReview;
    }
}
