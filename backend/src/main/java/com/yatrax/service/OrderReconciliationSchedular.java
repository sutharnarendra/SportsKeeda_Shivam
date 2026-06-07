package com.yatrax.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.yatrax.model.Order;
import com.yatrax.model.OrderStatus;
import com.yatrax.repository.OrderRepository;

@Component
@EnableScheduling
public class OrderReconciliationSchedular {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EmailService emailService;

    // Task1: Check for expired transactions every minute
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void reconcilePendingOrders() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<Order> pendingOrders = orderRepository.findByStatus(OrderStatus.PENDING);

        for (Order order : pendingOrders) {
            if (order.getCreatedAt().isBefore(threshold)) {
                System.out
                        .println("Reconciler: Cancelling unpaid pending order #" + order.getId() + " due to timeout.");
                order.setStatus(OrderStatus.CANCELLED);
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);
            }
        }
    }

    // Task2: Retry sending confirmation emails for paid orders if SMTP was down
    @Scheduled(fixedDelay = 300000) // Runs every 5 minutes
    @Transactional
    public void retryFailedEmail() {
        List<Order> failedEmailOrders = orderRepository.findByStatusAndEmailSentFalse(OrderStatus.PROCESSING);

        for (Order order : failedEmailOrders) {
            try {
                emailService.sendOrderConfirmationEmail(order);
                order.setEmailSent(true);
                orderRepository.save(order);
                System.out.println("Reconciler: Successfully retried and sent email for order #" + order.getId());
            } catch (Exception e) {
                System.err
                        .println("Reconciler: Email retry failed for Order #" + order.getId() + ": " + e.getMessage());
            }
        }
    }
}
