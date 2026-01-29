package com.example.bids_server.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a row in the 'products' table.
 */
public record Product(
        long id,
        long sellerId,
        String name,
        String description, // nullable
        String category,
        String deliveryLocation,
        String imageUrl, // nullable
        LocalDateTime startTime,
        LocalDateTime endTime,
        BigDecimal startingPrice,
        BigDecimal currentPrice,
        Long leadingBidId // nullable
) {
}
