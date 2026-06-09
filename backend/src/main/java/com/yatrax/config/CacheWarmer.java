package com.yatrax.config;

import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.yatrax.model.Product;
import com.yatrax.service.CatalogCacheService;
import com.yatrax.service.ProductService;

@Component
@Order(10) // Ensures it runs after DatabaseSeeder has populated the DB
public class CacheWarmer implements CommandLineRunner {

    @Autowired
    private ProductService productService;

    @Autowired
    private CatalogCacheService catalogCacheService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Override
    public void run(String... args) throws Exception {
        warmCache(false);
    }

    public void warmCache(boolean clearFirst) {
        System.out.println("=== Starting Redis Cache Warming ===");
        try {
            if (clearFirst) {
                System.out.println("[CacheWarmer] Clearing existing product and catalog caches...");
                // 1. Evict Spring Cache catalog annotations
                catalogCacheService.evictCatalogCaches();
                
                // 2. Delete manual product slug and id cache-aside keys
                Set<String> productKeys = redisTemplate.keys("yatra:product:*");
                if (productKeys != null && !productKeys.isEmpty()) {
                    redisTemplate.delete(productKeys);
                }
            }

            // 1. Warm catalog lists and filter metadata
            System.out.println("[CacheWarmer] Warming catalog lists and filter metadata...");
            catalogCacheService.getCatalog();
            catalogCacheService.getFilterMetadata();
            catalogCacheService.getFeaturedProductIds();

            // Warm material-specific catalogs
            List<Product> products = productService.getAllProducts();
            List<String> materials = products.stream()
                    .flatMap(p -> p.getVariants().stream().map(v -> v.getWoodType()))
                    .distinct()
                    .toList();
            
            for (String material : materials) {
                catalogCacheService.getCatalogByMaterial(material);
            }

            // 2. Warm individual product detail caches (slug-based and ID-based)
            System.out.println("[CacheWarmer] Warming " + products.size() + " individual product detail caches...");
            for (Product product : products) {
                productService.getProductBySlug(product.getSlug());
                productService.getProductById(product.getId());
            }

            System.out.println("=== Redis Cache Warming Completed Successfully ===");
        } catch (Exception e) {
            System.err.println("[CacheWarmer] Error occurred during cache warming: " + e.getMessage());
        }
    }
}
