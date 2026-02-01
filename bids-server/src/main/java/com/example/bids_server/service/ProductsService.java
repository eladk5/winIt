package com.example.bids_server.service;

import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductCategory;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.repository.ProductsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProductsService {

    private final ProductsRepository productsRepository;
    private final CurrentUserService currentUserService;

    public ProductsService(ProductsRepository productsRepository, CurrentUserService currentUserService) {
        this.productsRepository = productsRepository;
        this.currentUserService = currentUserService;
    }

    /**
     * Main catalog behavior:
     * - Always returns ACTIVE products only (end_time > now).
     * - If logged-in, excludes products where the user is the seller.
     */
    public List<Product> searchCatalog(ProductSearchQuery q) {
        Long excludeSellerId = currentUserService.resolveLoggedInUserId().orElse(null);

        ProductSearchQuery qForcedActive = new ProductSearchQuery(
                q.category(),
                q.search(),
                q.hasImage(),
                q.endFrom(),
                q.endTo(),
                q.minPrice(),
                q.maxPrice(),
                true,
                q.sortBy(),
                q.sortDir());

        return productsRepository.searchProducts(qForcedActive, excludeSellerId);
    }

    public CreatedProduct createProduct(CreateProductRequest req) {
        long sellerId = currentUserService.requireAuthenticatedUserId();

        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        ProductCategory cat = ProductCategory.fromString(req.category());
        if (cat == null) {
            throw new IllegalArgumentException("category is required");
        }
        if (req.deliveryLocation() == null || req.deliveryLocation().isBlank()) {
            throw new IllegalArgumentException("deliveryLocation is required");
        }
        if (req.startingPrice() == null || req.startingPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("startingPrice must be > 0");
        }
        if (req.durationMinutes() == null || req.durationMinutes() < 10) {
            throw new IllegalArgumentException("durationMinutes must be >= 10");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endTime = now.plusMinutes(req.durationMinutes());

        long newProductId = productsRepository.saveProduct(
                sellerId,
                req.name().trim(),
                trimToNull(req.description()),
                cat.apiValue(),
                req.deliveryLocation().trim(),
                trimToNull(req.imageUrl()),
                now,
                endTime,
                req.startingPrice(),
                req.startingPrice(),
                null);

        return new CreatedProduct(newProductId, endTime);
    }

    private String trimToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    public record CreateProductRequest(
            String name,
            String description,
            String category,
            String deliveryLocation,
            String imageUrl,
            BigDecimal startingPrice,
            Integer durationMinutes) {
    }

    public record CreatedProduct(
            long id,
            LocalDateTime endTime) {
    }

    public Product getProduct(long productId) {
        return productsRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

}
