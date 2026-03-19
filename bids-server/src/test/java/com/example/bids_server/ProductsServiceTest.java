package com.example.bids_server;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.example.bids_server.repository.BidsRepository;
import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductCategory;
import com.example.bids_server.repository.ProductsRepository;
import com.example.bids_server.repository.UsersRepository;
import com.example.bids_server.service.CurrentUserService;
import com.example.bids_server.service.ProductsService;
import com.example.bids_server.service.ProductsService.UpdateProductRequest;

@SpringBootTest
@Transactional
class ProductsServiceTest {

        @Autowired
        private ProductsService productsService;
        @Autowired
        private ProductsRepository productsRepository;
        @Autowired
        private UsersRepository usersRepository;
        @Autowired
        private BidsRepository bidsRepository;
        @Autowired
        private JdbcTemplate jdbcTemplate;

        @MockBean
        private CurrentUserService currentUserService;

        private Long sellerId;
        private Long otherUserId;
        private Long productId;
        private LocalDateTime now;

        private static final String USER_PREFIX = "test_user_ps_";
        private static final String PRODUCT_PREFIX = "test_product_ps_";

        @BeforeEach
        void setUp() {
                now = LocalDateTime.now();
                sellerId = createUser(USER_PREFIX + "seller");
                otherUserId = createUser(USER_PREFIX + "other");
                when(currentUserService.requireAuthenticatedUserId()).thenReturn(sellerId);
                when(currentUserService.resolveLoggedInUserId()).thenReturn(Optional.of(sellerId));

                productId = createProduct(
                                sellerId,
                                PRODUCT_PREFIX + "initial",
                                ProductCategory.ELECTRONICS,
                                "Initial description",
                                "http://img.com/initial.jpg",
                                now.minusHours(1),
                                now.plusHours(2),
                                new BigDecimal("100.00"));
        }

        @AfterEach
        void cleanup() {
                jdbcTemplate.update("""
                                UPDATE products SET leading_bid_id = NULL
                                WHERE seller_id IN (SELECT id FROM users WHERE username LIKE ?)
                                """, USER_PREFIX + "%");

                jdbcTemplate.update(
                                """
                                                DELETE FROM bids
                                                WHERE product_id IN (
                                                    SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE username LIKE ?)
                                                )
                                                """,
                                USER_PREFIX + "%");

                jdbcTemplate.update("""
                                DELETE FROM products WHERE seller_id IN (SELECT id FROM users WHERE username LIKE ?)
                                """, USER_PREFIX + "%");
                jdbcTemplate.update("DELETE FROM users WHERE username LIKE ?", USER_PREFIX + "%");
        }

        private long createUser(String username) {
                return usersRepository.saveUser(
                                username,
                                "dummy_hash",
                                "Test",
                                "User",
                                "0500000000",
                                null, null, null);
        }

        private long createProduct(
                        long sellerId,
                        String name,
                        ProductCategory category,
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
        void updateProduct_success_allFieldsUpdated() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "New Name",
                                "New Description",
                                "FURNITURE",
                                "New City",
                                "http://img.com/new.jpg",
                                new BigDecimal("200.00"),
                                60); 

                Product updated = productsService.updateProduct(productId, req);

                assertNotNull(updated);
                assertEquals("New Name", updated.name());
                assertEquals("New Description", updated.description());
                assertEquals(ProductCategory.FURNITURE.apiValue(), updated.category());
                assertEquals("New City", updated.deliveryLocation());
                assertEquals("http://img.com/new.jpg", updated.imageUrl());
                assertEquals(0, new BigDecimal("200.00").compareTo(updated.startingPrice()));
                assertEquals(0, new BigDecimal("200.00").compareTo(updated.currentPrice())); 

                Product dbProduct = productsRepository.findById(productId).orElseThrow();
                assertEquals("New Name", dbProduct.name());
                assertEquals("New Description", dbProduct.description());
                assertEquals(ProductCategory.FURNITURE.apiValue(), dbProduct.category());
                assertEquals("New City", dbProduct.deliveryLocation());
                assertEquals("http://img.com/new.jpg", dbProduct.imageUrl());
                assertEquals(0, new BigDecimal("200.00").compareTo(dbProduct.startingPrice()));
                assertEquals(0, new BigDecimal("200.00").compareTo(dbProduct.currentPrice()));
        }

        @Test
        void updateProduct_success_partialUpdateWithoutImage() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "Partial Update Name",
                                null, // description not changed
                                null, // category not changed
                                "Partial City",
                                null, // image not changed
                                null, // startingPrice not changed
                                null); // duration not changed

                Product updated = productsService.updateProduct(productId, req);

                assertNotNull(updated);
                assertEquals("Partial Update Name", updated.name());
                assertEquals("Initial description", updated.description()); // unchanged
                assertEquals(ProductCategory.ELECTRONICS.apiValue(), updated.category()); // unchanged
                assertEquals("Partial City", updated.deliveryLocation());
                assertEquals("http://img.com/initial.jpg", updated.imageUrl()); // unchanged
                assertEquals(0, new BigDecimal("100.00").compareTo(updated.startingPrice())); // unchanged

                Product dbProduct = productsRepository.findById(productId).orElseThrow();
                assertEquals("Partial Update Name", dbProduct.name());
                assertEquals("Initial description", dbProduct.description());
                assertEquals(ProductCategory.ELECTRONICS.apiValue(), dbProduct.category());
                assertEquals("Partial City", dbProduct.deliveryLocation());
                assertEquals("http://img.com/initial.jpg", dbProduct.imageUrl());
        }

        @Test
        void updateProduct_failure_productNotFound() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "FURNITURE", "City", null, BigDecimal.ONE, 10);

                ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                                () -> productsService.updateProduct(99999L, req));

                assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
                assertEquals("Product not found", ex.getReason());
        }

        @Test
        void updateProduct_failure_userNotOwner() {
                when(currentUserService.requireAuthenticatedUserId()).thenReturn(otherUserId); 

                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "FURNITURE", "City", null, BigDecimal.ONE, 10);

                ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
                assertEquals("You do not own this product", ex.getReason());
        }

        @Test
        void updateProduct_failure_productHasActiveBids() {

                jdbcTemplate.update("INSERT INTO bids (product_id, bidder_id, max_amount) VALUES (?, ?, ?)",
                                productId, otherUserId, new BigDecimal("150.00"));
                jdbcTemplate.update(
                                "UPDATE products SET leading_bid_id = (SELECT id FROM bids WHERE product_id = ? LIMIT 1) WHERE id = ?",
                                productId, productId);

                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "FURNITURE", "City", null, BigDecimal.ONE, 10);

                ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
                assertEquals("Cannot edit product with active bids", ex.getReason());
        }

        @Test
        void updateProduct_failure_invalidName() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "", "Desc", "FURNITURE", "City", null, BigDecimal.ONE, 10); // Blank name

                IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals("name is required", ex.getMessage());
        }

        @Test
        void updateProduct_failure_invalidCategory() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "INVALID_CATEGORY", "City", null, BigDecimal.ONE, 10); // Invalid
                                                                                                       // category

                IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals("Unknown category: INVALID_CATEGORY", ex.getMessage());
        }

        @Test
        void updateProduct_failure_invalidStartingPrice() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "FURNITURE", "City", null, BigDecimal.ZERO, 10); // Starting price zero

                IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals("startingPrice must be > 0", ex.getMessage());
        }

        @Test
        void updateProduct_failure_invalidDurationMinutes() {
                UpdateProductRequest req = new UpdateProductRequest(
                                "Name", "Desc", "FURNITURE", "City", null, BigDecimal.ONE, 5); // Duration < 10

                IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                                () -> productsService.updateProduct(productId, req));

                assertEquals("durationMinutes must be >= 10", ex.getMessage());
        }
}
