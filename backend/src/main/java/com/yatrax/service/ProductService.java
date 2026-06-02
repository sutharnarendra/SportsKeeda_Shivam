package com.yatrax.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductBySlug(String slug) {
        return productRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found with slug: " + slug));
    }

    public List<Product> getProductsByCategory(String category) {
        return productRepository.findByCategory(category);
    }

    public List<Product> getSaleProducts() {
        return productRepository.findByOnSaleTrue();
    }

    // Creates a new product and links nested wood variants
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
