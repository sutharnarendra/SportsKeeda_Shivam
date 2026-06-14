package com.yatrax.service;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.ProductVariantRepository;

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

    @Autowired
    private ProductVariantRepository productVariantRepository;

    private Product detachProduct(Product product) {
        return Product.clean(product);
    }

    private List<Product> detachProducts(List<Product> products) {
        if (products == null)
            return null;
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
            redisTemplate.opsForValue().set("yatra:product:slug:" + product.getSlug(), productJson,
                    Duration.ofMinutes(10));
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

    // 1. Update base product details and invalidate caches
    public Product updateProduct(Long id, Product productDetails) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not foudnd with ID: " + id));

        // If the sluf is changing, ensure it is not already taken by another product
        if (!product.getSlug().equals(productDetails.getSlug())) {
            if (productRepository.findBySlug(productDetails.getSlug()).isPresent()) {
                throw new IllegalArgumentException(
                        "Error: A Product with slug '" + productDetails.getSlug() + "' already exists!!");
            }
        }

        // Evict old cache slug entry before updating
        try {
            redisTemplate.delete("yatra:product:slug:" + product.getSlug());
        } catch (Exception e) {
            System.err.println("[Redis] Falied to delete old slug cache: " + e.getMessage());
        }

        // update fields
        product.setName(productDetails.getName());
        product.setSlug(productDetails.getSlug());
        product.setDescription(productDetails.getDescription());
        product.setPrice(productDetails.getPrice());
        product.setOriginalPrice(productDetails.getOriginalPrice());
        product.setStock(productDetails.getStock());
        product.setOnSale(productDetails.isOnSale());
        product.setCategory(productDetails.getCategory());
        product.setImageUrl(productDetails.getImageUrl());
        product.setVideoUrl(productDetails.getVideoUrl());
        product.setModelUrl(productDetails.getModelUrl());

        Product savedProduct = productRepository.save(product);

        // Evict new caches
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + savedProduct.getSlug());
            redisTemplate.delete("yatra:product:id:" + savedProduct.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches on update: " + e.getMessage());
        }

        return detachProduct(savedProduct);
    }

    // 2. Delete a product and its variants (cascading delete)
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with ID: " + id));

        // Evict caches before deletion
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + product.getSlug());
            redisTemplate.delete("yatra:product:id:" + product.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches on delete: " + e.getMessage());
        }

        productRepository.delete(product);
    }

    // 3. Add a variant (wood type) to an existing product
    public ProductVariant addVariant(Long productId, ProductVariant variant) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with ID: " + productId));

        // Ensure wood type doesn't already exists for this product
        if (productVariantRepository.findByProductIdAndWoodType(productId, variant.getWoodType()).isPresent()) {
            throw new IllegalArgumentException("Error: A variant with wood type '" + variant.getWoodType()
                    + "' already exists for this product!!");
        }

        variant.setProduct(product);
        ProductVariant savedVariant = productVariantRepository.save(variant);

        // Evict caches
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + product.getSlug());
            redisTemplate.delete("yatra:product:id:" + product.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches on variant addition: " + e.getMessage());
        }

        return savedVariant;
    }

    // 4. Update and existing variant(woodtype, stock, pricing)
    public ProductVariant updateVariant(Long variantId, ProductVariant variantDetails) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Error: variant not found with ID: " + variantId));

        Product product = variant.getProduct();

        // If wood type is changing, check for duplicates within the same product
        if (!variant.getWoodType().equalsIgnoreCase(variantDetails.getWoodType())) {
            if (productVariantRepository.findByProductIdAndWoodType(product.getId(), variantDetails.getWoodType())
                    .isPresent()) {
                throw new IllegalArgumentException(
                        "Error: A variant with wood type '" + variantDetails.getWoodType() + "' already exists!!");
            }
        }

        variant.setWoodType(variantDetails.getWoodType());
        variant.setPrice(variantDetails.getPrice());
        variant.setOriginalPrice(variantDetails.getOriginalPrice());
        variant.setStock(variantDetails.getStock());
        variant.setSwatchColor(variantDetails.getSwatchColor());
        variant.setImageUrl(variantDetails.getImageUrl());
        variant.setVideoUrl(variantDetails.getVideoUrl());
        variant.setModelUrl(variantDetails.getModelUrl());

        ProductVariant savedVariant = productVariantRepository.save(variant);

        // Evict caches
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + product.getSlug());
            redisTemplate.delete("yatra:product:id:" + product.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches on variant update: " + e.getMessage());
        }

        return savedVariant;
    }

    // 5. Delete an existing variant
    public void deleteVariant(Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Variant not found with ID: " + variantId));

        Product product = variant.getProduct();

        // Business rule: Keep at least one variant for a product
        if (product.getVariants().size() <= 1) {
            throw new IllegalArgumentException("Error: A product must keep at least one variant!!");
        }

        productVariantRepository.delete(variant);

        // Evict caches
        catalogCacheService.evictCatalogCaches();
        try {
            redisTemplate.delete("yatra:product:slug:" + product.getSlug());
            redisTemplate.delete("yatra:product:id:" + product.getId());
        } catch (Exception e) {
            System.err.println("[Redis] Failed to evict product caches on variant deletion: " + e.getMessage());
        }
    }

    // 6. Get all unique categories currently in use
    public List<String> getUniqueCategories() {
        return productRepository.findDistinctCategories();
    }

    // 7. Get all unique wood types currently in use
    public List<String> getUniqueWoodTypes() {
        return productVariantRepository.findDistinctWoodTypes();
    }
}
