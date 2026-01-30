package com.example.bids_server.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

/**
 * Defines the minimum increment ("step") required between proxy bids,
 * according to the project's spec table.
 */
@Component
public class BidIncrementPolicy {

    /**
     * Return the minimum increment step for the given current price.
     */
    public BigDecimal stepFor(BigDecimal currentPrice) {
        if (currentPrice == null) {
            throw new IllegalArgumentException("currentPrice is required");
        }
        if (currentPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("currentPrice must be >= 0");
        }


        // 0 - 99.99 => 5
        // 100 - 499.99 => 10
        // 500 - 999.99 => 25
        // 1000- 4999.99 => 50
        // 5000+ => 100
        if (currentPrice.compareTo(new BigDecimal("100")) < 0) {
            return new BigDecimal("5");
        }
        if (currentPrice.compareTo(new BigDecimal("500")) < 0) {
            return new BigDecimal("10");
        }
        if (currentPrice.compareTo(new BigDecimal("1000")) < 0) {
            return new BigDecimal("25");
        }
        if (currentPrice.compareTo(new BigDecimal("5000")) < 0) {
            return new BigDecimal("50");
        }
        return new BigDecimal("100");
    }
}
