package com.example.bids_server.service;

import com.example.bids_server.controller.ProductsController.SellerContactResponse;
import com.example.bids_server.repository.BidsRepository;
import com.example.bids_server.repository.MeRepository;
import com.example.bids_server.repository.MeRepository.MeProfile;
import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductCategory;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.repository.ProductsRepository;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class ProductsService {

    private final ProductsRepository productsRepository;
    private final CurrentUserService currentUserService;
    private final BidsRepository bidsRepository;
    private final MeRepository meRepository;
    private final BidIncrementPolicy incrementPolicy;
    private final ObjectMapper objectMapper;

    public ProductsService(ProductsRepository productsRepository, CurrentUserService currentUserService,
            BidsRepository bidsRepository,
            MeRepository meRepository,
            BidIncrementPolicy incrementPolicy,
            ObjectMapper objectMapper) {
        this.productsRepository = productsRepository;
        this.currentUserService = currentUserService;
        this.bidsRepository = bidsRepository;
        this.meRepository = meRepository;
        this.incrementPolicy = incrementPolicy;
        this.objectMapper = objectMapper;
    }

    public BigDecimal calculateMinRequiredBid(Product p) {
        if (p.leadingBidId() == null) {
            return p.currentPrice();
        }
        return p.currentPrice().add(incrementPolicy.stepFor(p.currentPrice()));
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

        ProductCategory cat = ProductCategory.fromString(req.category());
        if (cat == null) {
            throw new IllegalArgumentException("category is required");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endTime = now.plusMinutes(req.durationMinutes());

        String description = req.description() == null ? null : req.description().trim();
        if (description != null && description.isEmpty())
            description = null;

        String imageUrl = req.imageUrl() == null ? null : req.imageUrl().trim();
        if (imageUrl != null && imageUrl.isEmpty())
            imageUrl = null;

        long newProductId = productsRepository.saveProduct(
                sellerId,
                req.name().trim(),
                description,
                cat.apiValue(),
                req.deliveryLocation().trim(),
                imageUrl,
                now,
                endTime,
                req.startingPrice(),
                req.startingPrice(),
                null);

        return new CreatedProduct(newProductId, endTime);
    }

    public Product updateProduct(long productId, JsonNode patchBody) {
        long currentUserId = currentUserService.requireAuthenticatedUserId();

        if (patchBody == null || !patchBody.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON body");
        }

        Product existingProduct = productsRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (existingProduct.sellerId() != currentUserId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this product");
        }

        if (bidsRepository.hasAnyBids(productId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit product with active bids");
        }

        Set<String> allowedFields = Set.of(
                "name",
                "description",
                "category",
                "deliveryLocation",
                "imageUrl",
                "startingPrice",
                "durationMinutes");
        patchBody.fieldNames().forEachRemaining(field -> {
            if (!allowedFields.contains(field)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field '" + field + "' cannot be updated");
            }
        });

        UpdateProductDto updateDto = new UpdateProductDto();
        updateDto.setName(existingProduct.name());
        updateDto.setDescription(existingProduct.description());
        updateDto.setCategory(existingProduct.category());
        updateDto.setDeliveryLocation(existingProduct.deliveryLocation());
        updateDto.setImageUrl(existingProduct.imageUrl());
        updateDto.setStartingPrice(existingProduct.startingPrice());

        try {
            objectMapper.readerForUpdating(updateDto).readValue(patchBody);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON patch", e);
        }

        // Post-patch validation
        if (updateDto.getName() == null || updateDto.getName().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        if (updateDto.getDeliveryLocation() == null || updateDto.getDeliveryLocation().isBlank()) {
            throw new IllegalArgumentException("deliveryLocation is required");
        }
        if (updateDto.getStartingPrice() == null || updateDto.getStartingPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startingPrice must be greater than 0");
        }
        if (updateDto.getDurationMinutes() != null && updateDto.getDurationMinutes() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationMinutes must be at least 10");
        }

        String newCategoryApiValue;
        ProductCategory cat = ProductCategory.fromString(updateDto.getCategory());
        if (cat == null)
            throw new IllegalArgumentException("category is required");
        newCategoryApiValue = cat.apiValue();

        LocalDateTime newEndTime = updateDto.getDurationMinutes() != null
                ? LocalDateTime.now().plusMinutes(updateDto.getDurationMinutes())
                : existingProduct.endTime();

        String description = updateDto.getDescription() == null ? null : updateDto.getDescription().trim();
        if (description != null && description.isEmpty())
            description = null;

        String imageUrl = updateDto.getImageUrl() == null ? null : updateDto.getImageUrl().trim();
        if (imageUrl != null && imageUrl.isEmpty())
            imageUrl = null;

        return productsRepository.updateProduct(
                productId,
                updateDto.getName().trim(),
                description,
                newCategoryApiValue,
                updateDto.getDeliveryLocation().trim(),
                imageUrl,
                updateDto.getStartingPrice(),
                newEndTime);
    }

    @Data
    public static class UpdateProductDto {
        private String name;
        private String description;
        private String category;
        private String deliveryLocation;
        private String imageUrl;
        private BigDecimal startingPrice;
        private Integer durationMinutes;
    }

    public record CreateProductRequest(
            @NotBlank String name,
            String description,
            @NotBlank String category,
            @NotBlank String deliveryLocation,
            String imageUrl,
            @NotNull @Positive BigDecimal startingPrice,
            @NotNull @Min(10) Integer durationMinutes) {
    }

    public record CreatedProduct(
            long id,
            LocalDateTime endTime) {
    }

    public Product getProduct(long productId) {
        return productsRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    public SellerContactResponse getSellerContact(long productId) {
        long currentUserId = currentUserService.requireAuthenticatedUserId();

        Product product = getProduct(productId);

        if (product.endTime().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Auction has not ended yet");
        }

        if (product.leadingBidId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No winning bid for this product");
        }

        long winningBidderId = bidsRepository.getBidderId(product.leadingBidId())
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Winning bid not found"));

        if (winningBidderId != currentUserId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the winning bidder");
        }

        MeProfile sellerProfile = meRepository.getMeProfile(product.sellerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller not found"));

        return new SellerContactResponse(
                sellerProfile.firstName(),
                sellerProfile.lastName(),
                sellerProfile.mobilePhone(),
                sellerProfile.city(),
                sellerProfile.street(),
                sellerProfile.zipCode());
    }
}
