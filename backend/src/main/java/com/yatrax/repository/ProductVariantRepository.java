package com.yatrax.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.yatrax.model.ProductVariant;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    // Look up wood variant matching a product and wood type
    Optional<ProductVariant> findByProductIdAndWoodType(Long productId, String woodType);

    @Query("SELECT DISTINCT v.woodType FROM ProductVariant v WHERE v.woodType IS NOT NULL AND v.woodType != ''")
    List<String> findDistinctWoodTypes();
}
