package com.example.bids_server.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * Represents the catalog query options for GET /api/products.
 */
public record ProductSearchQuery(
        Category category, // nullable
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

    public enum Category {
        ELECTRONICS("Electronics"),
        FURNITURE("Furniture"),
        CLOTHING("Clothing"),
        VEHICLES("Vehicles"),
        CAMERAS("Cameras");

        private final String apiValue;

        Category(String apiValue) {
            this.apiValue = apiValue;
        }

        /** What we return to the client in /api/categories and accept as query param */
        public String apiValue() {
            return apiValue;
        }

        public static Category fromString(String raw) {
            if (raw == null)
                return null;
            String s = raw.trim();
            if (s.isEmpty())
                return null;

            return Arrays.stream(values())
                    .filter(c -> c.apiValue.equalsIgnoreCase(s))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Unknown category: " + raw));
        }
    }

    public enum SortBy {
        END_TIME,
        START_TIME,
        CURRENT_PRICE
    }

    public enum SortDir {
        ASC, DESC
    }
}
