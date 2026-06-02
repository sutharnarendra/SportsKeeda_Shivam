package com.yatrax.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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
    public Order checkout(User user, String shippingName, String shippingPhone, String shippingAddress,
            String shippingCity, String shippingState, String shippingPincode, String paymentMethod) {
        // Fetch user's current shopping cart
        List<CartItem> cartItems = cartItemRepository.findByUserId(user.getId());
        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException("Error: Cannot checkout an empty shopping cart!!");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        // Create the base order entity (save it first to obtain an ID)
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

            // Real-time stock checks & allocation
            if (variant != null) {
                if (variant.getStock() < quantity) {
                    throw new IllegalArgumentException("Error: Not enough stock for " +
                            product.getName() + " (" + variant.getWoodType() + ")!!");
                }
                // Deduct stock on variant level
                variant.setStock(variant.getStock() - quantity);
                productVariantRepository.save(variant);
            } else {
                if (product.getStock() < quantity) {
                    throw new IllegalArgumentException("Error: Not enough stock for " +
                            product.getName() + "!!");
                }
                // Deduct Stock on product level
                product.setStock(product.getStock() - quantity);
                productRepository.save(product);
            }

            // Determine unit price based on variant or base product
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

        // Finalize transacton pricing and linkage
        savedOrder.setItems(orderItems);
        savedOrder.setTotal(totalAmount);
        Order finalizedOrder = orderRepository.save(savedOrder);

        // Wipe shopping cart cleanly (instantly evicts Upstash Redis cache as well!)
        cartService.clearCart(user.getId());

        return finalizedOrder;
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

        // Real-time stock check & deduction
        if (variant != null) {
            if (variant.getStock() < quantity) {
                throw new IllegalArgumentException(
                        "Error: Not enough stock for " + product.getName() + " (" + variant.getWoodType() + ")!!");
            }
            variant.setStock(variant.getStock() - quantity);
            productVariantRepository.save(variant);
        } else {
            if (product.getStock() < quantity) {
                throw new IllegalArgumentException("Error: Not enough stock for " + product.getName() + "!!");
            }
            product.setStock(product.getStock() - quantity);
            productRepository.save(product);
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

        for (Long cartItemId : cartItemIds) {
            CartItem cartItem = cartItemRepository.findById(cartItemId)
                    .orElseThrow(() -> new IllegalArgumentException("Error: Cart item " + cartItemId + " not found!!"));

            // Ensures the cart item belongs to the checking-out user
            if (!cartItem.getUser().getId().equals(user.getId())) {
                throw new SecurityException("Error: Unauthorized cart item access!!");
            }

            Product product = cartItem.getProduct();
            ProductVariant variant = cartItem.getProductVariant();
            int quantity = cartItem.getQuantity();

            // Real-time stock checks
            if (variant != null) {
                if (variant.getStock() < quantity) {
                    throw new IllegalArgumentException(
                            "Error: Not enough stock for " + product.getName() + " (" + variant.getWoodType() + ")!!");
                }
                variant.setStock(variant.getStock() - quantity);
                productVariantRepository.save(variant);
            } else {
                if (product.getStock() < quantity) {
                    throw new IllegalArgumentException("Error: Not enough stock for " + product.getName() + "!!");
                }
                product.setStock(product.getStock() - quantity);
                productRepository.save(product);
            }

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

        savedOrder.setItems(orderItems);
        savedOrder.setTotal(totalAmount);
        Order finalizedOrder = orderRepository.save(savedOrder);

        // Delete ONLY the selected cart items from Neon DB, and evict the Redis cache
        // key
        for (Long cartItemId : cartItemIds) {
            cartItemRepository.deleteById(cartItemId);
        }

        // Evict active Redis cache to force fresh reload of the remaining cart items
        try {
            cartService.clearCart(user.getId());// Invalid cache
        } catch (Exception e) {
            // Fail silently
        }

        return finalizedOrder;
    }
}
