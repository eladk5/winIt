package com.example.bids_server.controller;

import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.service.ProductsService;
import com.example.bids_server.service.ProductsService.CreateProductRequest;
import com.example.bids_server.service.ProductsService.CreatedProduct;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductsController {

    private final ProductsService productsService;

    public ProductsController(ProductsService productsService) {
        this.productsService = productsService;
    }

    @GetMapping("/products")
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
                ProductSearchQuery.Category.fromString(category),
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
                .map(ProductCardResponse::fromProduct)
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
            String imageUrl,
            LocalDateTime endTime,
            String deliveryLocation,
            String category) {
        public static ProductCardResponse fromProduct(Product p) {
            return new ProductCardResponse(
                    p.id(),
                    p.name(),
                    p.description(),
                    p.currentPrice(),
                    p.imageUrl(),
                    p.endTime(),
                    p.deliveryLocation(),
                    p.category());
        }
    }

    @PostMapping("/products")
    public ResponseEntity<CreateProductResponse> createProduct(@RequestBody CreateProductRequest req) {
        CreatedProduct created = productsService.createProduct(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateProductResponse(created.id(), created.endTime()));
    }

    public record CreateProductResponse(
            long id,
            LocalDateTime endTime) {
    }
}
