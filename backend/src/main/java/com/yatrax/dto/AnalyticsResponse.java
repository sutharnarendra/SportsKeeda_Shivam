package com.yatrax.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsResponse {

    private BigDecimal totalRevenue;
    private long totalOrders;
    private long totalProducts;
    private long totalUsers;
    private Map<String, Long> statusBreakdown;
    private List<DailySalesPoint> salesTrend;
    private List<ProductSalesPoint> topProducts;
    private List<CategorySalesPoint> categorySales;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailySalesPoint {
        private String date; // e.g. "Jun 14", "Jun 2026"
        private BigDecimal revenue;
        private long orderCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductSalesPoint {
        private String productName;
        private long quantity;
        private BigDecimal revenue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategorySalesPoint {
        private String category;
        private BigDecimal revenue;
        private long quantity;
    }
}
