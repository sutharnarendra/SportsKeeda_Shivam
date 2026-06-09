package com.yatrax.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.repository.ProductRepository;

@Service
@Transactional
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CatalogCacheService catalogCacheService;

    private Product detachProduct(Product product) {
        return Product.clean(product);
    }

    private List<Product> detachProducts(List<Product> products) {
        if (products == null) return null;
        return products.stream().map(Product::clean).toList();
    }

    public List<Product> getAllProducts() {
        return detachProducts(productRepository.findAll());
    }

    // Cache-Aside Pattern: Product by Slug (TTL 10m)
    public Product getProductBySlug(String slug) {
        String cacheKey = "yatra:product:slug:" + slug;
        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.trim().isEmpty()) {
                Product product = objectMapper.readValue(cachedJson, Product.class);
                return detachProduct(product);
            }
        } catch (Exception e) {
            System.err.println("[Redis] Failed to read cached product by slug: " + e.getMessage());
        }

        // Cache miss
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with slug: " + slug));
        
        product = detachProduct(product);

        // Save back to Redis
        try {
            String productJson = objectMapper.writeValueAsString(product);
            redisTemplate.opsForValue().set(cacheKey, productJson, Duration.ofMinutes(10));
            // Also cache ID-to-slug mapping
            redisTemplate.opsForValue().set("yatra:product:id:" + product.getId(), slug, Duration.ofMinutes(10));
        } catch (Exception e) {
            System.err.println("[Redis] Failed to cache product by slug: " + e.getMessage());
        }

        return product;
    }

    // Cache-Aside Pattern: Product by ID (TTL 10m)
    public Product getProductById(Long id) {
        String idCacheKey = "yatra:product:id:" + id;
        try {
            String slug = redisTemplate.opsForValue().get(idCacheKey);
            if (slug != null && !slug.trim().isEmpty()) {
                return getProductBySlug(slug);
            }
        } catch (Exception e) {
            System.err.println("[Redis] Failed to read cached product ID mapping: " + e.getMessage());
        }

        // Cache miss
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with ID: " + id));
        
        product = detachProduct(product);

        // Save back to Redis in both directions
        try {
            String productJson = objectMapper.writeValueAsString(product);
            redisTemplate.opsForValue().set("yatra:product:slug:" + product.getSlug(), productJson, Duration.ofMinutes(10));
            redisTemplate.opsForValue().set(idCacheKey, product.getSlug(), Duration.ofMinutes(10));
        } catch (Exception e) {
            System.err.println("[Redis] Failed to cache product by ID: " + e.getMessage());
        }

        return product;
    }

    public List<Product> getProductsByCategory(String category) {
        return detachProducts(productRepository.findByCategory(category));
    }

    public List<Product> getSaleProducts() {
        return detachProducts(productRepository.findByOnSaleTrue());
    }

    // Creates a new product and invalidates all catalog/product cache entries
    public Product createProduct(Product product) {
        if (productRepository.findBySlug(product.getSlug()).isPresent()) {
            throw new IllegalArgumentException(
                    "Error: A product with slug '" + product.getSlug() + "' already exists!!");
        }

        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            throw new IllegalArgumentException(
                    "Error: A product must have at least one variant to be created!!");
        }

        // Establish the bi-directional JPA relationship for parent-child save
        if (product.getVariants() != null) {
            for (ProductVariant variant : product.getVariants()) {
                variant.setProduct(product);
            }
        }

        Product savedProduct = productRepository.save(product);

        // Evict caches
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + savedProduct.getSlug());
            redisTemplate.delete("yatra:product:id:" + savedProduct.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches: " + e.getMessage());
        }

        return savedProduct;
    }
}
