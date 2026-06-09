package com.yatrax.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.ObjectIdGenerators.StringIdGenerator;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "original_price")
    private BigDecimal originalPrice;

    @Column(nullable = false)
    private int stock = 0;

    @Column(nullable = false)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "review_count", nullable = false)
    private int review_count = 0;

    @Column(name = "on_sale", nullable = false)
    private boolean onSale = false;

    private String category;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "model_url")
    private String modelUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.rating == null) {
            this.rating = BigDecimal.ZERO;
        }
    }

    public static Product clean(Product p) {
        if (p == null) return null;
        Product copy = Product.builder()
                .id(p.getId())
                .name(p.getName())
                .slug(p.getSlug())
                .description(p.getDescription())
                .price(p.getPrice())
                .originalPrice(p.getOriginalPrice())
                .stock(p.getStock())
                .rating(p.getRating())
                .review_count(p.getReview_count())
                .onSale(p.isOnSale())
                .category(p.getCategory())
                .imageUrl(p.getImageUrl())
                .videoUrl(p.getVideoUrl())
                .modelUrl(p.getModelUrl())
                .createdAt(p.getCreatedAt())
                .build();
        
        if (p.getVariants() != null) {
            List<ProductVariant> copyVariants = new ArrayList<>();
            for (ProductVariant v : p.getVariants()) {
                ProductVariant vCopy = ProductVariant.builder()
                        .id(v.getId())
                        .product(copy)
                        .woodType(v.getWoodType())
                        .price(v.getPrice())
                        .originalPrice(v.getOriginalPrice())
                        .stock(v.getStock())
                        .swatchColor(v.getSwatchColor())
                        .imageUrl(v.getImageUrl())
                        .videoUrl(v.getVideoUrl())
                        .modelUrl(v.getModelUrl())
                        .createdAt(v.getCreatedAt())
                        .build();
                copyVariants.add(vCopy);
            }
            copy.setVariants(copyVariants);
        } else {
            copy.setVariants(new ArrayList<>());
        }
        return copy;
    }
}
