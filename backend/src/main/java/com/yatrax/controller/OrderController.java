package com.yatrax.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.Order;
import com.yatrax.model.User;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;
import com.yatrax.service.OrderService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Authenticated user not found!!"));
    }

    // 1. Standart Checkout: Place an order using all items currently in the cart
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestParam String shippingName,
            @RequestParam String shippingPhone,
            @RequestParam String shippingAddress,
            @RequestParam String shippingCity,
            @RequestParam String shippingState,
            @RequestParam String shippingPincode,
            @RequestParam(defaultValue = "Cash on Delivery") String paymentMethod) {
        try {
            User user = getAuthenticatedUser();
            Order order = orderService.checkout(user, shippingName, shippingPhone, shippingAddress, shippingCity,
                    shippingState, shippingPincode, paymentMethod);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Checkout failed: " + e.getMessage());
        }
    }

    // 2. Selected Checkout: Place an order using only specific chosen items from
    // the cart
    @PostMapping("/checkout/selected")
    public ResponseEntity<?> checkoutSelected(
            @RequestParam List<Long> cartItemIds,
            @RequestParam String shippingName,
            @RequestParam String shippingPhone,
            @RequestParam String shippingAddress,
            @RequestParam String shippingCity,
            @RequestParam String shippingState,
            @RequestParam String shippingPincode,
            @RequestParam(defaultValue = "Cash on Delivery") String paymentMethod) {
        try {
            User user = getAuthenticatedUser();
            Order order = orderService.checkoutSelectedItems(user, cartItemIds, shippingName, shippingPhone,
                    shippingAddress, shippingCity, shippingState, shippingPincode, paymentMethod);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Selected checkout failed: " + e.getMessage());
        }
    }

    // 3. Buy Now / Direct Checkout: Instant purchase of a single item directly from
    // the product page
    @PostMapping("/checkout/direct")
    public ResponseEntity<?> placeDirectOrder(
            @RequestParam Long productId,
            @RequestParam(required = false) Long variantId,
            @RequestParam(defaultValue = "1") int quantity,
            @RequestParam String shippingName,
            @RequestParam String shippingPhone,
            @RequestParam String shippingAddress,
            @RequestParam String shippingCity,
            @RequestParam String shippingState,
            @RequestParam String shippingPincode,
            @RequestParam(defaultValue = "Cash on Delivery") String paymentMethod) {
        try {
            User user = getAuthenticatedUser();
            Order order = orderService.placeDirectOrder(user, productId, variantId, quantity, shippingName,
                    shippingPhone, shippingAddress, shippingCity, shippingState, shippingPincode, paymentMethod);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Direct order failed: " + e.getMessage());
        }
    }

    // 4. Retrieve order history for the authenticated user
    @GetMapping
    public ResponseEntity<?> getOrderHistory() {
        try {
            User user = getAuthenticatedUser();
            List<Order> orders = orderService.getUserOrderHistory(user.getId());
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 5. Inspect a specific order details securely
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderDetails(@PathVariable Long orderId) {
        try {
            User user = getAuthenticatedUser();
            Order order = orderService.getOrderDetails(user.getId(), orderId);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

}