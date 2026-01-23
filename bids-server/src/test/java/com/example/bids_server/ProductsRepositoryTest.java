package com.example.bids_server;

import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.repository.ProductsRepository;
import com.example.bids_server.repository.UsersRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ProductsRepositoryTest {

    @Autowired
    private ProductsRepository productsRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String USER_PREFIX = "test_user_products_";
    private static final String PRODUCT_PREFIX = "test_product_";

    @AfterEach
    void cleanup() {
        jdbcTemplate.update("""
                DELETE FROM bids
                WHERE product_id IN (
                    SELECT id FROM products WHERE name LIKE ?
                )
                """, PRODUCT_PREFIX + "%");

        jdbcTemplate.update("DELETE FROM products WHERE name LIKE ?", PRODUCT_PREFIX + "%");
        jdbcTemplate.update("DELETE FROM users WHERE username LIKE ?", USER_PREFIX + "%");
    }

    private long createUser(String username) {
        return usersRepository.saveUser(
                username,
                "dummy_hash",
                "Test",
                "User",
                "0500000000",
                null,
                null,
                null);
    }

    private long createProduct(
            long sellerId,
            String name,
            ProductSearchQuery.Category category,
            String description,
            String imageUrl,
            LocalDateTime startTime,
            LocalDateTime endTime,
            BigDecimal currentPrice) {

        return productsRepository.saveProduct(
                sellerId,
                name,
                description,
                category.apiValue(),
                "Test City",
                imageUrl,
                startTime,
                endTime,
                currentPrice,
                currentPrice,
                null);
    }

    @Test
    void searchProducts_activeOnlyDefault_doesNotReturnEndedProducts() {
        long sellerA = createUser(USER_PREFIX + "sellerA");

        LocalDateTime now = LocalDateTime.now();

        long active1 = createProduct(
                sellerA,
                PRODUCT_PREFIX + "active1",
                ProductSearchQuery.Category.ELECTRONICS,
                "Active product",
                "http://img.com/a.jpg",
                now.minusHours(1),
                now.plusHours(2),
                new BigDecimal("1000.00"));

        long ended1 = createProduct(
                sellerA,
                PRODUCT_PREFIX + "ended1",
                ProductSearchQuery.Category.ELECTRONICS,
                "Ended product",
                null,
                now.minusHours(5),
                now.minusMinutes(10),
                new BigDecimal("500.00"));

        List<Product> results = productsRepository.searchProducts(null, null);

        assertTrue(results.stream().anyMatch(p -> p.id() == active1), "Expected active product to be returned");
        assertTrue(results.stream().noneMatch(p -> p.id() == ended1),
                "Expected ended product NOT to be returned by default");
    }

    @Test
    void searchProducts_excludeSellerId_hidesMyOwnProductsFromCatalog() {
        long sellerA = createUser(USER_PREFIX + "sellerA2");
        long sellerB = createUser(USER_PREFIX + "sellerB2");

        LocalDateTime now = LocalDateTime.now();

        long myProduct = createProduct(
                sellerA,
                PRODUCT_PREFIX + "myListing",
                ProductSearchQuery.Category.ELECTRONICS,
                "My listing",
                "http://img.com/me.jpg",
                now.minusHours(1),
                now.plusHours(1),
                new BigDecimal("900.00"));

        long otherProduct = createProduct(
                sellerB,
                PRODUCT_PREFIX + "otherListing",
                ProductSearchQuery.Category.ELECTRONICS,
                "Other listing",
                null,
                now.minusHours(1),
                now.plusHours(1),
                new BigDecimal("700.00"));

        List<Product> results = productsRepository.searchProducts(null, sellerA);

        assertTrue(results.stream().noneMatch(p -> p.id() == myProduct),
                "Expected my own product to be excluded when excludeSellerId is provided");
        assertTrue(results.stream().anyMatch(p -> p.id() == otherProduct),
                "Expected other seller product to be included");
    }

    @Test
    void searchProducts_filtersByCategoryHasImageAndSearch() {
        long seller = createUser(USER_PREFIX + "seller3");
        LocalDateTime now = LocalDateTime.now();

        long ps5 = createProduct(
                seller,
                PRODUCT_PREFIX + "ps5",
                ProductSearchQuery.Category.ELECTRONICS,
                "Sony PlayStation 5 like new",
                "http://img.com/ps5.jpg",
                now.minusHours(1),
                now.plusHours(3),
                new BigDecimal("1200.00"));

        long camera = createProduct(
                seller,
                PRODUCT_PREFIX + "camera",
                ProductSearchQuery.Category.CAMERAS,
                "Vintage camera",
                "http://img.com/cam.jpg",
                now.minusHours(1),
                now.plusHours(3),
                new BigDecimal("800.00"));

        long noImageElectronics = createProduct(
                seller,
                PRODUCT_PREFIX + "laptop_no_img",
                ProductSearchQuery.Category.ELECTRONICS,
                "Laptop great condition",
                null,
                now.minusHours(1),
                now.plusHours(3),
                new BigDecimal("600.00"));

        ProductSearchQuery q = new ProductSearchQuery(
                ProductSearchQuery.Category.ELECTRONICS, // category
                "playstation", // search
                true, // hasImage
                null, null, // endFrom/endTo
                null, null, // min/max price
                true, // activeOnly
                ProductSearchQuery.SortBy.END_TIME,
                ProductSearchQuery.SortDir.ASC);

        List<Product> results = productsRepository.searchProducts(q, null);

        assertEquals(1, results.size(), "Expected exactly one match (Electronics + hasImage + search)");
        assertEquals(ps5, results.get(0).id(), "Expected the PS5 product to match");
        assertTrue(results.stream().noneMatch(p -> p.id() == camera), "Camera category should be filtered out");
        assertTrue(results.stream().noneMatch(p -> p.id() == noImageElectronics),
                "Electronics without image should be filtered out");
    }

    @Test
    void searchProducts_endTimeRangePriceRangeAndSortingByCurrentPriceDesc() {
        long seller = createUser(USER_PREFIX + "seller4");
        LocalDateTime now = LocalDateTime.now();

        long p500 = createProduct(
                seller,
                PRODUCT_PREFIX + "p500",
                ProductSearchQuery.Category.ELECTRONICS,
                "cheap item",
                null,
                now.minusHours(1),
                now.plusHours(1),
                new BigDecimal("500.00"));

        long p800 = createProduct(
                seller,
                PRODUCT_PREFIX + "p800",
                ProductSearchQuery.Category.ELECTRONICS,
                "mid item",
                "http://img.com/mid.jpg",
                now.minusHours(1),
                now.plusHours(2),
                new BigDecimal("800.00"));

        long p1200 = createProduct(
                seller,
                PRODUCT_PREFIX + "p1200",
                ProductSearchQuery.Category.ELECTRONICS,
                "expensive item",
                "http://img.com/exp.jpg",
                now.minusHours(1),
                now.plusHours(3),
                new BigDecimal("1200.00"));

        ProductSearchQuery q = new ProductSearchQuery(
                ProductSearchQuery.Category.ELECTRONICS,
                null,
                null,
                now.plusMinutes(30),
                now.plusHours(3).plusMinutes(30),
                new BigDecimal("400.00"),
                new BigDecimal("1300.00"),
                true,
                ProductSearchQuery.SortBy.CURRENT_PRICE,
                ProductSearchQuery.SortDir.DESC);

        List<Product> results = productsRepository.searchProducts(q, null);

        assertEquals(3, results.size(), "Expected 3 products to match ranges");

        // Sorted by current_price DESC: 1200, 800, 500
        assertEquals(p1200, results.get(0).id(), "Expected highest price first");
        assertEquals(p800, results.get(1).id(), "Expected second highest price next");
        assertEquals(p500, results.get(2).id(), "Expected lowest price last");
    }
}
