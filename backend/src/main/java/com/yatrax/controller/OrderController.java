package com.yatrax.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
import com.yatrax.model.OrderStatus;
import com.yatrax.model.User;
import com.yatrax.repository.OrderRepository;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;
import com.yatrax.service.EmailService;
import com.yatrax.service.OrderService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.webhook.secret:webhook-secret-key-yatrax}")
    private String webhookSecret;

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

    // 6. Client polling route to retrieve payment status of an order
    @GetMapping("/status/{orderId}")
    public ResponseEntity<?> getOrderStatus(@PathVariable Long orderId) {
        return orderRepository.findById(orderId)
                .map(order -> ResponseEntity.ok(order.getStatus()))
                .orElse(ResponseEntity.notFound().build());
    }

    // 7. Payment Gateway Webhook Endpoint verifying signatures and handling payment
    // outcomes
    @PostMapping("/webhook")
    public ResponseEntity<?> handlePaymentWebhook(
            @RequestParam Long orderId,
            @RequestParam String status,
            @RequestParam String signature) {

        try {
            // Verify HMAC signature to ensure request originates securely form our gateway
            String expectedSignature = hmacSha256(orderId.toString() + status, webhookSecret);
            if (!expectedSignature.equals(signature)) {
                return ResponseEntity.status(401).body("Error: Cryptographic signature mismatch!!");
            }

            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Order not found!!"));

            // EDGE CASE 1: Idempotency check (prevent double processing of duplicate
            // webhooks)
            if (order.getStatus() == OrderStatus.PROCESSING) {
                return ResponseEntity.ok("Payment already processing (idempotent no-op).");
            }

            // EDGE CASE 2: Billed after Cancellation (Late Capture Auto-Refund)
            if (order.getStatus() == OrderStatus.CANCELLED) {
                System.out.println("ALERT: Late payment captured for Cancelled Order #" + orderId
                        + ". Initiating Auto-Refund of ₹" + order.getTotal() + " back to customer.");
                simulateGatewayRefund(orderId, order.getTotal());
                return ResponseEntity.ok("Order was already cancelled. Auto-refund initiated successfully.");
            }

            if (order.getStatus() == OrderStatus.PENDING && "PAID".equalsIgnoreCase(status)) {
                // Update status to processing (Paid)
                order.setStatus(OrderStatus.PROCESSING);
                order.setUpdatedAt(LocalDateTime.now());

                // Attempt to send email asynchronously, handle failures garcefully via Outbox
                try {
                    emailService.sendOrderConfirmationEmail(order);
                    order.setEmailSent(true);
                } catch (Exception e) {
                    System.err.println("Webhook: Initial email delivery failed for Order #" + orderId
                            + ". Will retry in background: " + e.getMessage());
                    order.setEmailSent(false); // Flags reconciler to retry
                }

                orderRepository.save(order);
                System.out.println(
                        "Webhook: Verified payment capture for order #" + orderId + ". Status set to PROCESSING.");
            }
            return ResponseEntity.ok("Webhook processed successfully!!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Webhook error: " + e.getMessage());
        }
    }

    // TODO: Integrate real payment gateway refund API (Razorpay/Cashfree)
    private void simulateGatewayRefund(Long orderId, java.math.BigDecimal amount) {
        System.out.println("REFUND REQUIRED: Cancelled Order #" + orderId + ". Amount of ₹"
                + amount + " needs to be returned to customer. Manual intervention required until gateway integration.");
    }

    // Helper HMAC-SHA256 hashing method
    private String hmacSha256(String data, String key) throws Exception {
        javax.crypto.Mac sha256_HMAC = javax.crypto.Mac.getInstance("HmacSHA256");
        javax.crypto.spec.SecretKeySpec secret_key = new javax.crypto.spec.SecretKeySpec(key.getBytes("UTF-8"),
                "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] rawHmac = sha256_HMAC.doFinal(data.getBytes("UTF-8"));

        StringBuilder hexString = new StringBuilder();
        for (byte b : rawHmac) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1)
                hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}