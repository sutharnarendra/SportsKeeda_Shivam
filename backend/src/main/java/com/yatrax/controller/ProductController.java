package com.yatrax.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.Product;
import com.yatrax.dto.FilterMetadata;
import com.yatrax.service.CatalogCacheService;
import com.yatrax.service.ProductService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private CatalogCacheService catalogCacheService;

    // 1. Fetch all products (with optional dynamic filters)
    @GetMapping
    public ResponseEntity<List<Product>> getProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean onSale) {

        if (category != null) {
            return ResponseEntity.ok(productService.getProductsByCategory(category));
        }
        if (onSale != null && onSale) {
            return ResponseEntity.ok(productService.getSaleProducts());
        }
        return ResponseEntity.ok(catalogCacheService.getCatalog());
    }

    // Fetch catalog filter bounds
    @GetMapping("/filters/meta")
    public ResponseEntity<?> getFilterMetadata() {
        return ResponseEntity.ok(catalogCacheService.getFilterMetadata());
    }

    // Fetch a single product by its database ID (internal use only)
    @GetMapping("/by-id/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            Product product = productService.getProductById(id);
            return ResponseEntity.ok(product);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. Fetch a single product by its SEO slug
    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> getProductBySlug(@PathVariable String slug) {
        try {
            Product product = productService.getProductBySlug(slug);
            return ResponseEntity.ok(product);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Autowired
    private com.yatrax.config.CacheWarmer cacheWarmer;

    // 3. Create a new product with its variants
    @PostMapping
    public ResponseEntity<?> createProduct(@Valid @RequestBody Product product) {
        try {
            Product savedProduct = productService.createProduct(product);
            return ResponseEntity.ok(savedProduct);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 4. Manually trigger cache eviction and warming (for direct DB updates)
    @PostMapping("/cache/sync")
    public ResponseEntity<String> syncCache() {
        try {
            cacheWarmer.warmCache(true);
            return ResponseEntity.ok("Cache cleared and pre-warmed successfully!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to sync cache: " + e.getMessage());
        }
    }
}

