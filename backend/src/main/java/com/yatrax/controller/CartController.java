package com.yatrax.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.CartItem;
import com.yatrax.model.User;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;
import com.yatrax.service.CartService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthnticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Authenticated user not found!!"));
    }

    // 1. Get current authenticated user's cart (with Cache-Aside)
    @GetMapping
    public ResponseEntity<?> getCart() {
        User user = getAuthnticatedUser();
        List<CartItem> cart = cartService.getCart(user.getId());
        return ResponseEntity.ok(cart);
    }

    // 2. Add an item to the cart
    @PostMapping
    public ResponseEntity<?> addToCart(
            @RequestParam Long productId,
            @RequestParam(required = false) Long variantId,
            @RequestParam(defaultValue = "1") int quantity) {
        try {
            User user = getAuthnticatedUser();
            List<CartItem> updateCart = cartService.addToCart(user, productId, variantId, quantity);
            return ResponseEntity.ok(updateCart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. Update quantity of a single cart item
    @PutMapping("/{cartItemId}")
    public ResponseEntity<?> udpateQuantity(
            @PathVariable Long cartItemId,
            @RequestParam int quantity) {
        try {
            User user = getAuthnticatedUser();
            List<CartItem> updateCart = cartService.updateQuantity(user.getId(), cartItemId, quantity);
            return ResponseEntity.ok(updateCart);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 4. Delete an item form the cart
    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<?> removeFromCart(@PathVariable Long cartItemId) {
        try {
            User user = getAuthnticatedUser();
            List<CartItem> updateCart = cartService.removeFromCart(user.getId(), cartItemId);
            return ResponseEntity.ok(updateCart);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 5. Clear the entire cart
    @DeleteMapping
    public ResponseEntity<?> clearCart() {
        User user = getAuthnticatedUser();
        cartService.clearCart(user.getId());
        return ResponseEntity.ok("Shopping cart cleared successfully!!");
    }
}