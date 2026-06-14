package com.yatrax.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.CartItem;
import com.yatrax.model.Order;
import com.yatrax.model.OrderItem;
import com.yatrax.model.OrderStatus;
import com.yatrax.model.Product;
import com.yatrax.model.ProductVariant;
import com.yatrax.model.User;
import com.yatrax.repository.CartItemRepository;
import com.yatrax.repository.OrderRepository;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.ProductVariantRepository;

@Service
@Transactional
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private CartService cartService;

    // 1. Retrieve history of placed orders for a specific user
    public List<Order> getUserOrderHistory(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // 2. Fetch secure, user-scoped order details
    public Order getOrderDetails(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Order not found!!"));

        // Security check: Only the owner of the order is allowed to view it
        if (!order.getUser().getId().equals(userId)) {
            throw new SecurityException("Error: Unauthorized to access this order!!");
        }
        return order;
    }

    // 3. Checkout transactions: converts cart items into a persisted Order
    // (Stock-Free + Anti-Abuse Checks)
    public Order checkout(User user, String shippingName, String shippingPhone, String shippingAddress,
            String shippingCity, String shippingState, String shippingPincode, String paymentMethod) {
        // Fetch user's current shopping cart
        List<CartItem> cartItems = cartItemRepository.findByUserId(user.getId());
        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException("Error: Cannot checkout an empty shopping cart!!");
        }

        // A. CAPPING CHECKS: Max 50 items total, and max 50 for any single item
        int totalQuantity = 0;
        for (CartItem cartItem : cartItems) {
            int q = cartItem.getQuantity();
            if (q > 50) {
                throw new IllegalArgumentException(
                        "Error: Cannot purchase more than 50 units of a single product per order!!");
            }
            totalQuantity += q;
        }
        if (totalQuantity > 50) {
            throw new IllegalArgumentException("Error: Total order quantity cannot exceed 50 items!!");
        }

        // B. RATE LIMIT CHECK: Max 5 orders containing the same product in the last 1
        // hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<Order> recentOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> orderInLastHour = recentOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(oneHourAgo))
                .toList();

        for (CartItem cartItem : cartItems) {
            Long productId = cartItem.getProduct().getId();
            long matchCount = orderInLastHour.stream()
                    .filter(o -> o.getItems().stream().anyMatch(item -> item.getProduct().getId().equals(productId)))
                    .count();
            if (matchCount >= 5) {
                throw new IllegalArgumentException(
                        "Error: Rate limit exceeded! You cannot place more than 5 orders for the same product ("
                                + cartItem.getProduct().getName() + ") within 1 hour!!");
            }
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        // Create the base order entity(save it first to obtain an ID)
        Order order = Order.builder()
                .user(user)
                .shippingName(shippingName)
                .shippingPhone(shippingPhone)
                .shippingAddress(shippingAddress)
                .shippingCity(shippingCity)
                .shippingState(shippingState)
                .shippingPincode(shippingPincode)
                .paymentMethod(paymentMethod)
                .status(OrderStatus.PENDING)
                .total(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            ProductVariant variant = cartItem.getProductVariant();
            int quantity = cartItem.getQuantity();

            // Determine unit price based on variant on base product
            BigDecimal unitPrice = (variant != null) ? variant.getPrice() : product.getPrice();
            BigDecimal itemTotal = unitPrice.multiply(new BigDecimal(quantity));
            totalAmount = totalAmount.add(itemTotal);

            // Construct OrderItem
            OrderItem orderItem = OrderItem.builder()
                    .order(savedOrder)
                    .product(product)
                    .productName(product.getName())
                    .productPrice(unitPrice)
                    .variantInfo(variant != null ? variant.getWoodType() : null)
                    .quantity(quantity)
                    .build();

            orderItems.add(orderItem);
        }

        // Finalize transaction pricing and linkage
        savedOrder.setItems(orderItems);
        savedOrder.setTotal(totalAmount);
        Order finalizeOrder = orderRepository.save(savedOrder);

        // Wipe shopping cart cleanly
        cartService.clearCart(user.getId());

        return finalizeOrder;
    }

    // 4. "Buy Now" Direct Order: Bypass the cart completely to purchase a single
    // item immediately
    public Order placeDirectOrder(User user, Long productId, Long variantId, int quantity, String shippingName,
            String shippingPhone, String shippingAddress, String shippingCity, String shippingState,
            String shippingPincode, String paymentMethod) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Product not found!!"));

        ProductVariant variant = null;
        if (variantId != null) {
            variant = productVariantRepository.findById(variantId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Variant not found!!"));
        }

        // A. CAPPING CHECKS: Max 50 items total, and max 50 for any single item
        if (quantity > 50) {
            throw new IllegalArgumentException(
                    "Error: Cannot purchase more than 50 units of a single product per order!!");
        }

        // B. RATE LIMIT CHECK: Max 5 orders containing the same product in the last 1
        // hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<Order> recentOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> ordersInLastHour = recentOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(oneHourAgo))
                .toList();

        long matchCount = ordersInLastHour.stream()
                .filter(o -> o.getItems().stream().anyMatch(item -> item.getProduct().getId().equals(productId)))
                .count();
        if (matchCount >= 5) {
            throw new IllegalArgumentException(
                    "Error: Rate limit exceeded! You cannot place more than 5 orders for the same product ("
                            + product.getName() + ") within 1 hour!!");
        }

        BigDecimal unitPrice = (variant != null) ? variant.getPrice() : product.getPrice();
        BigDecimal totalAmount = unitPrice.multiply(new BigDecimal(quantity));

        // Create and save baseline order
        Order order = Order.builder()
                .user(user)
                .shippingName(shippingName)
                .shippingPhone(shippingPhone)
                .shippingAddress(shippingAddress)
                .shippingCity(shippingCity)
                .shippingState(shippingState)
                .shippingPincode(shippingPincode)
                .paymentMethod(paymentMethod)
                .status(OrderStatus.PENDING)
                .total(totalAmount)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        // Construct single OrderItem
        OrderItem orderItem = OrderItem.builder()
                .order(savedOrder)
                .product(product)
                .productName(product.getName())
                .productPrice(unitPrice)
                .variantInfo(variant != null ? variant.getWoodType() : null)
                .quantity(quantity)
                .build();

        savedOrder.setItems(List.of(orderItem));
        return orderRepository.save(savedOrder); // Bypasses cart clear!
    }

    // 5. Selected Checkout: Purchases ONLY selected items from the cart, leaving
    // the rest behind
    public Order checkoutSelectedItems(User user, List<Long> cartItemIds, String shippingName, String shippingPhone,
            String shippingAddress, String shippingCity, String shippingState, String shippingPincode,
            String paymentMethod) {
        if (cartItemIds == null || cartItemIds.isEmpty()) {
            throw new IllegalArgumentException("Error: No items selected for checkout!!");
        }

        List<CartItem> cartItems = new ArrayList<>();
        int totalQuantity = 0;
        for (Long cartItemId : cartItemIds) {
            CartItem cartItem = cartItemRepository.findById(cartItemId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Cart item " + cartItemId + " not found!!"));

            // Ensures the cart item belongs to the checking-out user
            if (!cartItem.getUser().getId().equals(user.getId())) {
                throw new SecurityException("Error: Unauthorized cart item access!!");
            }

            int q = cartItem.getQuantity();
            if (q > 50) {
                throw new IllegalArgumentException(
                        "Error: Cannot purchase more than 50 units of a single product per order!!");
            }
            totalQuantity += q;
            cartItems.add(cartItem);
        }

        if (totalQuantity > 50) {
            throw new IllegalArgumentException("Error: Total order quantity cannot exceed 50 items!!");
        }

        // B. RATE LIMIT CHECK: Max 5 orders containing the same product in the last 1
        // hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<Order> recentOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Order> ordersInLastHour = recentOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(oneHourAgo))
                .toList();

        for (CartItem cartItem : cartItems) {
            Long productId = cartItem.getProduct().getId();
            long matchCount = ordersInLastHour.stream()
                    .filter(o -> o.getItems().stream().anyMatch(item -> item.getProduct().getId().equals(productId)))
                    .count();
            if (matchCount >= 5) {
                throw new IllegalArgumentException(
                        "Error: Rate limit exceeded! You cannot place more than 5 orders for the same product ("
                                + cartItem.getProduct().getName() + ") within 1 hour!!");
            }
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        // Create the base order entity
        Order order = Order.builder()
                .user(user)
                .shippingName(shippingName)
                .shippingPhone(shippingPhone)
                .shippingAddress(shippingAddress)
                .shippingCity(shippingCity)
                .shippingState(shippingState)
                .shippingPincode(shippingPincode)
                .paymentMethod(paymentMethod)
                .status(OrderStatus.PENDING)
                .total(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            ProductVariant variant = cartItem.getProductVariant();
            int quantity = cartItem.getQuantity();

            BigDecimal unitPrice = (variant != null) ? variant.getPrice() : product.getPrice();
            BigDecimal itemTotal = unitPrice.multiply(new BigDecimal(quantity));
            totalAmount = totalAmount.add(itemTotal);

            // Contruct OrderItem
            OrderItem orderItem = OrderItem.builder()
                    .order(savedOrder)
                    .product(product)
                    .productName(product.getName())
                    .productPrice(unitPrice)
                    .variantInfo(variant != null ? variant.getWoodType() : null)
                    .quantity(quantity)
                    .build();

            orderItems.add(orderItem);
        }

        savedOrder.setItems(orderItems);
        savedOrder.setTotal(totalAmount);
        Order finalizeOrder = orderRepository.save(savedOrder);

        // Delete ONLY the selected cart items from NeonDB
        for (Long cartItemId : cartItemIds) {
            cartItemRepository.deleteById(cartItemId);
        }

        // Evict active Redis cache
        try {
            cartService.clearCart(user.getId());
        } catch (Exception e) {
            // Fail silently
        }

        return finalizeOrder;
    }

    // 6. Retrieve all orders in the system, sorted by newest first (Admin view)
    public List<Order> getAllOrdersSorted() {
        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    // 7. Fetch order details without user ownership checks (Admin view)
    public Order getOrderDetailsForAdmin(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Order not found with ID: " + orderId));
    }

    // 8. Update order status directly (without stock inventory tracking)
    public Order updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Error: Order not found with ID: " + orderId));

        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }
}
