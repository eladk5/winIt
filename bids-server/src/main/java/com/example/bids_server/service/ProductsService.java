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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ProductsService {

    private final ProductsRepository productsRepository;
    private final CurrentUserService currentUserService;
    private final BidsRepository bidsRepository;
    private final MeRepository meRepository;
    private final BidIncrementPolicy incrementPolicy;

    public ProductsService(ProductsRepository productsRepository, CurrentUserService currentUserService,
            BidsRepository bidsRepository,
            MeRepository meRepository,
            BidIncrementPolicy incrementPolicy) {
        this.productsRepository = productsRepository;
        this.currentUserService = currentUserService;
        this.bidsRepository = bidsRepository;
        this.meRepository = meRepository;
        this.incrementPolicy = incrementPolicy;
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

    public Product updateProduct(long productId, UpdateProductRequest req) {
        long currentUserId = currentUserService.requireAuthenticatedUserId();

        Product existingProduct = productsRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (existingProduct.sellerId() != currentUserId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this product");
        }

        if (bidsRepository.hasAnyBids(productId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit product with active bids");
        }

        String newName = Optional.ofNullable(req.name())
                .map(String::trim)
                .orElse(existingProduct.name());
        String newDescription = Optional.ofNullable(req.description())
                .map(this::trimToNull)
                .orElse(existingProduct.description());
        String newCategory = Optional.ofNullable(req.category())
                .map(ProductCategory::fromString)
                .map(ProductCategory::apiValue)
                .orElse(existingProduct.category());
        String newDeliveryLocation = Optional.ofNullable(req.deliveryLocation())
                .map(String::trim)
                .orElse(existingProduct.deliveryLocation());
        BigDecimal newStartingPrice = Optional.ofNullable(req.startingPrice())
                .orElse(existingProduct.startingPrice());
        LocalDateTime newEndTime = Optional.ofNullable(req.durationMinutes())
                .map(duration -> LocalDateTime.now().plusMinutes(duration))
                .orElse(existingProduct.endTime());

        String newImageUrl = req.imageUrl() != null ? trimToNull(req.imageUrl()) : existingProduct.imageUrl();

        if (newName.isBlank())
            throw new IllegalArgumentException("name is required");
        if (newCategory == null)
            throw new IllegalArgumentException("category is required");
        if (newDeliveryLocation.isBlank())
            throw new IllegalArgumentException("deliveryLocation is required");

        Product updatedProduct = productsRepository.updateProduct(
                productId,
                newName,
                newDescription,
                newCategory,
                newDeliveryLocation,
                newImageUrl,
                newStartingPrice,
                newEndTime);

        return updatedProduct;
    }

    private String trimToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
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

    public record UpdateProductRequest(
            String name,
            String description,
            String category,
            String deliveryLocation,
            String imageUrl,
            @Positive BigDecimal startingPrice,
            @Min(10) Integer durationMinutes) {
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Winning bid not found"));

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
                sellerProfile.zipCode()
        );
    }
}
