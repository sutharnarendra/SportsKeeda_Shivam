package com.yatrax.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.yatrax.dto.FilterMetadata;
import com.yatrax.model.Product;
import com.yatrax.repository.ProductRepository;

@Service
public class CatalogCacheService {

    @Autowired
    private ProductRepository productRepository;

    // 1. Get entire catalog
    @Cacheable(value = "yatra:catalog:all", key = "'all'")
    public List<Product> getCatalog() {
        return productRepository.findAll();
    }

    // 2. Get catalog filtered by wood type/material name
    @Cacheable(value = "yatra:catalog:material", key = "#materialName")
    public List<Product> getCatalogByMaterial(String materialName) {
        return productRepository.findAll().stream()
                .filter(p -> p.getVariants().stream()
                        .anyMatch(v -> v.getWoodType().equalsIgnoreCase(materialName)))
                .toList();
    }

    // 3. Get filter metadata bounds
    @Cacheable(value = "yatra:filters:meta", key = "'all'")
    public FilterMetadata getFilterMetadata() {
        List<Product> products = productRepository.findAll();
        List<String> materials = products.stream()
                .flatMap(p -> p.getVariants().stream().map(v -> v.getWoodType()))
                .distinct()
                .toList();
        
        BigDecimal minPrice = products.stream()
                .map(Product::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
                
        BigDecimal maxPrice = products.stream()
                .map(Product::getPrice)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.valueOf(10000));

        return new FilterMetadata(materials, minPrice, maxPrice);
    }

    // 4. Get featured product IDs
    @Cacheable(value = "yatra:featured:home", key = "'home'")
    public List<Long> getFeaturedProductIds() {
        return productRepository.findByCategory("Parallettes").stream()
                .map(Product::getId)
                .toList();
    }

    // 5. Evict all catalog caches
    @CacheEvict(value = {
        "yatra:catalog:all",
        "yatra:catalog:material",
        "yatra:featured:home",
        "yatra:filters:meta"
    }, allEntries = true)
    public void evictCatalogCaches() {
        // Method execution automatically triggers Spring CacheEvict on the defined caches
    }
}
