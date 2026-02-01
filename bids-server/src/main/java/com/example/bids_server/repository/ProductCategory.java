package com.example.bids_server.repository;

import java.util.Arrays;

public enum ProductCategory {
    ELECTRONICS("Electronics"),
    FURNITURE("Furniture"),
    CLOTHING("Clothing"),
    VEHICLES("Vehicles"),
    CAMERAS("Cameras");

    private final String apiValue;

    ProductCategory(String apiValue) {
        this.apiValue = apiValue;
    }

    /** What we return to the client in /api/categories and accept as query param */
    public String apiValue() {
        return apiValue;
    }

    public static ProductCategory fromString(String raw) {
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
