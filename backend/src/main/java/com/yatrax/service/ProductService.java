package com.yatrax.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.repository.ProductRepository;

@Service
@Transactional
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    private Product detachProduct(Product product) {
        if (product != null && product.getVariants() != null) {
            product.setVariants(new ArrayList<>(product.getVariants()));
        }
        return product;
    }

    private List<Product> detachProducts(List<Product> products) {
        if (products != null) {
            for (Product p : products) {
                detachProduct(p);
            }
        }
        return products;
    }

    @Cacheable(value = "products", key = "'all'")
    public List<Product> getAllProducts() {
        return detachProducts(productRepository.findAll());
    }

    @Cacheable(value = "products", key = "'slug:' + #slug")
    public Product getProductBySlug(String slug) {
        return detachProduct(productRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with slug: " + slug)));
    }

    @Cacheable(value = "products", key = "'category:' + #category")
    public List<Product> getProductsByCategory(String category) {
        return detachProducts(productRepository.findByCategory(category));
    }

    @Cacheable(value = "products", key = "'sale'")
    public List<Product> getSaleProducts() {
        return detachProducts(productRepository.findByOnSaleTrue());
    }

    // Creates a new product and links nested wood variants
    @CacheEvict(value = "products", allEntries = true)
    public Product createProduct(Product product) {
        if (productRepository.findBySlug(product.getSlug()).isPresent()) {
            throw new IllegalArgumentException(
                    "Error: A product with slug '" + product.getSlug() + "' already exists!!");
        }

        // Establish the bi-directional JPA relationship for parent-child save
        if (product.getVariants() != null) {
            for (ProductVariant variant : product.getVariants()) {
                variant.setProduct(product);
            }
        }
        return productRepository.save(product);
    }
}
