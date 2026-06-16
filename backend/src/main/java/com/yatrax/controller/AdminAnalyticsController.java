package com.yatrax.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.dto.AnalyticsResponse;
import com.yatrax.model.Order;
import com.yatrax.model.OrderItem;
import com.yatrax.model.OrderStatus;
import com.yatrax.repository.OrderRepository;
import com.yatrax.repository.ProductRepository;
import com.yatrax.repository.UserRepository;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @RequestParam(value = "period", defaultValue = "7d") String period) {
        LocalDateTime cutoffDate;
        switch (period.toLowerCase()) {
            case "1m":
                cutoffDate = LocalDateTime.now().minusMonths(1);
                break;
            case "6m":
                cutoffDate = LocalDateTime.now().minusMonths(6);
                break;
            case "1y":
                cutoffDate = LocalDateTime.now().minusYears(1);
                break;
            case "all":
                cutoffDate = LocalDateTime.of(2000, 1, 1, 0, 0);
                break;
            case "7d":
            default:
                cutoffDate = LocalDateTime.now().minusDays(7);
                break;
        }

        // Fetch all orders and filter based on cutoff date
        List<Order> allOrders = orderRepository.findAll();
        List<Order> filteredOrders = allOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(cutoffDate))
                .collect(Collectors.toList());

        // 1. KPI Aggregation (exclude CANCELLED orders from total revenue)
        BigDecimal totalRevenue = filteredOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalOrders = filteredOrders.size();
        long totalProducts = productRepository.count();
        long totalUsers = userRepository.count();

        // 2.Status Breakdown mapping
        Map<String, Long> statusBreakdown = filteredOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));

        // 3. Sales Trend Grouping (gaurantees chronological sorting)
        List<AnalyticsResponse.DailySalesPoint> salesTrend = new ArrayList<>();
        if ("1y".equals(period) || "all".equals(period)) {
            // Group by YearMonth
            Map<java.time.YearMonth, List<Order>> grouped = filteredOrders.stream()
                    .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                    .collect(Collectors.groupingBy(o -> java.time.YearMonth.from(o.getCreatedAt())));

            grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> {
                        BigDecimal rev = entry.getValue().stream().map(Order::getTotal).reduce(BigDecimal.ZERO,
                                BigDecimal::add);

                        salesTrend.add(AnalyticsResponse.DailySalesPoint.builder()
                                .date(entry.getKey().format(DateTimeFormatter.ofPattern("MMM yyyy")))
                                .revenue(rev)
                                .orderCount(entry.getValue().size())
                                .build());
                    });
        } else {
            // Group by LocalDate(for 7d, 1m, 6m)
            Map<java.time.LocalDate, List<Order>> grouped = filteredOrders.stream()
                    .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                    .collect(Collectors.groupingBy(o -> o.getCreatedAt().toLocalDate()));

            grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> {
                        BigDecimal rev = entry.getValue().stream()
                                .map(Order::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        salesTrend.add(AnalyticsResponse.DailySalesPoint.builder()
                                .date(entry.getKey().format(DateTimeFormatter.ofPattern("MMM dd")))
                                .revenue(rev)
                                .orderCount(entry.getValue().size())
                                .build());
                    });
        }

        // 4. Top Selling Products
        Map<String, List<OrderItem>> itemsByProduct = filteredOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(OrderItem::getProductName));

        List<AnalyticsResponse.ProductSalesPoint> topProducts = itemsByProduct.entrySet().stream()
                .map(entry -> {
                    long qty = entry.getValue().stream().mapToLong(OrderItem::getQuantity).sum();
                    BigDecimal rev = entry.getValue().stream()
                            .map(item -> item.getProductPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return AnalyticsResponse.ProductSalesPoint.builder()
                            .productName(entry.getKey())
                            .quantity(qty)
                            .revenue(rev)
                            .build();
                })
                .sorted(Comparator.comparing(AnalyticsResponse.ProductSalesPoint::getQuantity).reversed())
                .limit(5)
                .collect(Collectors.toList());

        // 5. Category Sales Breakdown
        Map<String, List<OrderItem>> itemsByCategory = filteredOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(item -> {
                    if (item.getProduct() != null && item.getProduct().getCategory() != null) {
                        return item.getProduct().getCategory();
                    }
                    return "Uncategorized";
                }));

        List<AnalyticsResponse.CategorySalesPoint> categorySales = itemsByCategory.entrySet().stream()
                .map(entry -> {
                    long qty = entry.getValue().stream().mapToLong(OrderItem::getQuantity).sum();
                    BigDecimal rev = entry.getValue().stream()
                            .map(item -> item.getProductPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return AnalyticsResponse.CategorySalesPoint.builder()
                            .category(entry.getKey())
                            .revenue(rev)
                            .quantity(qty)
                            .build();
                })
                .sorted(Comparator.comparing(AnalyticsResponse.CategorySalesPoint::getRevenue).reversed())
                .collect(Collectors.toList());

        AnalyticsResponse response = AnalyticsResponse.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .totalProducts(totalProducts)
                .totalUsers(totalUsers)
                .statusBreakdown(statusBreakdown)
                .salesTrend(salesTrend)
                .topProducts(topProducts)
                .categorySales(categorySales)
                .build();

        return ResponseEntity.ok(response);
    }
}
