package com.yatrax.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yatrax.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

}
