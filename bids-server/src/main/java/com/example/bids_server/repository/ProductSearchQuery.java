package com.example.bids_server.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents the catalog query options for GET /api/products.
 */
public record ProductSearchQuery(
        ProductCategory category, // nullable
        String search, // nullable
        Boolean hasImage, // nullable: null=no filter, true=only with image, false=only without image

        // Date range filter
        LocalDateTime endFrom, // nullable
        LocalDateTime endTo, // nullable

        // Price range
        BigDecimal minPrice, // nullable
        BigDecimal maxPrice, // nullable

        // Catalog default
        Boolean activeOnly, // nullable

        // Sorting
        SortBy sortBy, // nullable
        SortDir sortDir // nullable
) {

    public enum SortBy {
        END_TIME,
        START_TIME,
        CURRENT_PRICE
    }

    public enum SortDir {
        ASC, DESC
    }
}
