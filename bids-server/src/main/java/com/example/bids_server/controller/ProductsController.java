package com.example.bids_server.controller;

import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductCategory;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.service.ProductsService;
import com.example.bids_server.service.ProductsService.CreateProductRequest;
import com.example.bids_server.service.ProductsService.CreatedProduct;
import com.example.bids_server.service.ProductsService.UpdateProductRequest;
import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@Tag(name = "Products", description = "Product catalog operations")
public class ProductsController {

    private final ProductsService productsService;

    public ProductsController(ProductsService productsService) {
        this.productsService = productsService;
    }

    @GetMapping("/categories")
    @Operation(summary = "List all product categories")
    public ResponseEntity<List<String>> listCategories() {
        List<String> categories = List.of(ProductCategory.values()).stream()
                .map(ProductCategory::apiValue)
                .toList();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/products")
    @Operation(summary = "Search for products")
    public ResponseEntity<List<ProductCardResponse>> listProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hasImage,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endFrom,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTo,

            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,

            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir) {
        ProductSearchQuery q = new ProductSearchQuery(
                ProductCategory.fromString(category),
                search,
                hasImage,
                endFrom,
                endTo,
                minPrice,
                maxPrice,
                true,
                parseSortBy(sortBy),
                parseSortDir(sortDir));

        List<Product> products = productsService.searchCatalog(q);

        List<ProductCardResponse> response = products.stream()
                .map(p -> ProductCardResponse.fromProduct(p, productsService.calculateMinRequiredBid(p.currentPrice())))
                .toList();

        return ResponseEntity.ok(response);
    }

    private ProductSearchQuery.SortBy parseSortBy(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        try {
            return ProductSearchQuery.SortBy.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid sortBy. Allowed: END_TIME, START_TIME, CURRENT_PRICE");
        }
    }

    private ProductSearchQuery.SortDir parseSortDir(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        try {
            return ProductSearchQuery.SortDir.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid sortDir. Allowed: ASC, DESC");
        }
    }

    public record ProductCardResponse(
            long id,
            String name,
            String description,
            BigDecimal currentPrice,
            BigDecimal minRequiredBid,
            String imageUrl,
            LocalDateTime endTime,
            String deliveryLocation,
            String category) {
        public static ProductCardResponse fromProduct(Product p, BigDecimal minRequiredBid) {
            return new ProductCardResponse(
                    p.id(),
                    p.name(),
                    p.description(),
                    p.currentPrice(),
                    minRequiredBid,
                    p.imageUrl(),
                    p.endTime(),
                    p.deliveryLocation(),
                    p.category());
        }
    }

    @PostMapping(value = "/products")
    @Operation(summary = "Create a new product")
    public ResponseEntity<CreateProductResponse> createProduct(@RequestBody @Valid CreateProductRequest req) {
        CreatedProduct created = productsService.createProduct(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateProductResponse(created.id(), created.endTime()));
    }

    @PatchMapping(value = "/products/{id}")
    @Operation(summary = "Update product details")
    public ResponseEntity<ProductDetailsResponse> updateProduct(@PathVariable long id,
            @RequestBody @Valid UpdateProductRequest req) {
        Product updatedProduct = productsService.updateProduct(id, req);
        return ResponseEntity.ok(ProductDetailsResponse.fromProduct(updatedProduct, productsService.calculateMinRequiredBid(updatedProduct.currentPrice())));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get product details")
    public ResponseEntity<ProductDetailsResponse> getProductById(@PathVariable long id) {
        Product p = productsService.getProduct(id);
        return ResponseEntity.ok(ProductDetailsResponse.fromProduct(p, productsService.calculateMinRequiredBid(p.currentPrice())));
    }

    @GetMapping("/products/{id}/seller-contact")
    @Operation(summary = "Get seller contact for a won product")
    public ResponseEntity<SellerContactResponse> getSellerContact(@PathVariable long id) {
        SellerContactResponse response = productsService.getSellerContact(id);
        return ResponseEntity.ok(response);
    }

    public record CreateProductResponse(
            long id,
            LocalDateTime endTime) {
    }

    public record ProductDetailsResponse(
            long id,
            String name,
            String description,
            String category,
            String deliveryLocation,
            String imageUrl,
            LocalDateTime startTime,
            LocalDateTime endTime,
            BigDecimal startingPrice,
            BigDecimal currentPrice,
            BigDecimal minRequiredBid,
            Long leadingBidId) {
        public static ProductDetailsResponse fromProduct(Product p, BigDecimal minRequiredBid) {
            return new ProductDetailsResponse(
                    p.id(),
                    p.name(),
                    p.description(),
                    p.category(),
                    p.deliveryLocation(),
                    p.imageUrl(),
                    p.startTime(),
                    p.endTime(),
                    p.startingPrice(),
                    p.currentPrice(),
                    minRequiredBid,
                    p.leadingBidId());
        }
    }

    public record SellerContactResponse(
            String firstName,
            String lastName,
            String mobilePhone,
            String city,
            String street,
            String zipCode) {
    }
}
