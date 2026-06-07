package com.yatrax.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.yatrax.model.ProductVariant;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    // Look up wood variant matching a product and wood type
    Optional<ProductVariant> findByProductIdAndWoodType(Long productId, String woodType);
}
