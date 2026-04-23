package com.example.bids_server;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import com.example.bids_server.security.SessionUser;
import com.example.bids_server.service.BidIncrementPolicy;
import com.example.bids_server.service.BidsService;

@SpringBootTest
@Transactional
class BidsServiceIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private BidsService bidsService;
    @Autowired
    private BidIncrementPolicy incrementPolicy;

    private Long sellerId;
    private Long buyer1Id;
    private Long buyer2Id;
    private Long productId;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void fullProxyFlow_firstBid_thenOutbidNoInsert_thenWinningInsertsAndReplacesLeader() {
        sellerId = insertUser("seller_it");
        buyer1Id = insertUser("buyer1_it");
        buyer2Id = insertUser("buyer2_it");

        productId = insertProduct(
                sellerId,
                bd("100.00"),
                bd("100.00"),
                LocalDateTime.now().plusHours(2),
                null);

        loginAs(buyer1Id, "buyer1_it");

        BigDecimal firstMax = bd("150.00");
        BidsService.PlaceBidResult r1 = bidsService.placeProxyBid(productId, firstMax);

        assertEquals(BidsService.BidResultStatus.WINNING, r1.status());
        assertEquals(0, r1.newCurrentPrice().compareTo(bd("100.00"))); // first bid keeps current as-is
        assertNotNull(r1.leadingBidId());

        assertEquals(1, countBids(productId));
        assertEquals(r1.leadingBidId(), dbLeadingBidId(productId));
        assertEquals(0, dbCurrentPrice(productId).compareTo(bd("100.00")));

        // buyer2 bids (valid but OUTBID)
        // current is still 100
        BigDecimal step = incrementPolicy.stepFor(dbCurrentPrice(productId));

        // choose bidderMax that is >= current+step but still below leaderMax (150)
        BigDecimal buyer2Max = bd("130.00");
        assertTrue(buyer2Max.compareTo(dbCurrentPrice(productId).add(step)) >= 0);

        loginAs(buyer2Id, "buyer2_it");

        BidsService.PlaceBidResult r2 = bidsService.placeProxyBid(productId, buyer2Max);

        assertEquals(BidsService.BidResultStatus.OUTBID, r2.status());

        // expected new price = min(buyer2Max + step, leaderMax)
        BigDecimal expected2 = buyer2Max.add(step);
        if (expected2.compareTo(firstMax) > 0)
            expected2 = firstMax;

        assertEquals(0, r2.newCurrentPrice().compareTo(expected2));

        // DB asserts after outbid (no new bid inserted)
        assertEquals(1, countBids(productId));
        assertEquals(r1.leadingBidId(), dbLeadingBidId(productId));
        assertEquals(0, dbCurrentPrice(productId).compareTo(expected2));

        // buyer2 bids again and now WINS (max > leaderMax)
        BigDecimal buyer2WinMax = bd("200.00");
        BidsService.PlaceBidResult r3 = bidsService.placeProxyBid(productId, buyer2WinMax);

        assertEquals(BidsService.BidResultStatus.WINNING, r3.status());
        assertNotNull(r3.leadingBidId());
        assertNotEquals(r1.leadingBidId(), r3.leadingBidId());

        // expected new price = min(leaderMax + step, bidderMax) where leaderMax was 150
        BigDecimal expected3 = firstMax.add(step);
        if (expected3.compareTo(buyer2WinMax) > 0)
            expected3 = buyer2WinMax;

        assertEquals(0, r3.newCurrentPrice().compareTo(expected3));

        // DB asserts after winning
        assertEquals(2, countBids(productId));
        assertEquals(r3.leadingBidId(), dbLeadingBidId(productId));
        assertEquals(0, dbCurrentPrice(productId).compareTo(expected3));
    }

    @Test
    void leaderIncreasesMaxBid_priceStaysSame_newBidInserted() {
        sellerId = insertUser("seller_inc");
        buyer1Id = insertUser("buyer1_inc");

        productId = insertProduct(
                sellerId,
                bd("100.00"),
                bd("100.00"),
                LocalDateTime.now().plusHours(2),
                null);

        loginAs(buyer1Id, "buyer1_inc");

        // First bid
        BigDecimal firstMax = bd("150.00");
        BidsService.PlaceBidResult r1 = bidsService.placeProxyBid(productId, firstMax);
        assertEquals(BidsService.BidResultStatus.WINNING, r1.status());
        assertEquals(0, r1.newCurrentPrice().compareTo(bd("100.00")));

        // Increase max bid
        BigDecimal secondMax = bd("200.00");
        BidsService.PlaceBidResult r2 = bidsService.placeProxyBid(productId, secondMax);

        assertEquals(BidsService.BidResultStatus.WINNING, r2.status());
        assertEquals(0, r2.newCurrentPrice().compareTo(bd("100.00"))); // Price should not change
        assertNotEquals(r1.leadingBidId(), r2.leadingBidId()); // New bid row should be created
        assertEquals(r2.leadingBidId(), dbLeadingBidId(productId));

        assertEquals(2, countBids(productId));
    }

    @Test
    void leaderTriesToLowerOrKeepMaxBid_throwsException() {
        sellerId = insertUser("seller_err");
        buyer1Id = insertUser("buyer1_err");

        productId = insertProduct(
                sellerId,
                bd("100.00"),
                bd("100.00"),
                LocalDateTime.now().plusHours(2),
                null);

        loginAs(buyer1Id, "buyer1_err");

        // First bid
        BigDecimal firstMax = bd("150.00");
        bidsService.placeProxyBid(productId, firstMax);

        // Try to place same max bid
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> {
            bidsService.placeProxyBid(productId, bd("150.00"));
        });

        // Try to place lower max bid
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> {
            bidsService.placeProxyBid(productId, bd("140.00"));
        });

        assertEquals(1, countBids(productId));
    }

    private void loginAs(long userId, String username) {
        SessionUser principal = new SessionUser(userId, username);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private long insertUser(String username) {
        jdbcTemplate.update("""
                INSERT INTO users (username, password_hash, first_name, last_name, mobile_phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                username, "dummy_hash", "Test", "User", "0500000000");
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE username = ?", Long.class, username);
    }

    private long insertProduct(long sellerId, BigDecimal starting, BigDecimal current,
            LocalDateTime endTime, Long leadingBidId) {
        LocalDateTime startTime = LocalDateTime.now();

        jdbcTemplate.update("""
                INSERT INTO products
                  (seller_id, name, description, category, delivery_location, image_url,
                   start_time, end_time, starting_price, current_price, leading_bid_id)
                VALUES
                  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                sellerId,
                "Test Product",
                "For integration test",
                "ELECTRONICS",
                "Tel Aviv",
                null,
                Timestamp.valueOf(startTime),
                Timestamp.valueOf(endTime),
                starting,
                current,
                leadingBidId);

        return jdbcTemplate.queryForObject(
                "SELECT MAX(id) FROM products WHERE seller_id = ?",
                Long.class,
                sellerId);
    }

    private int countBids(long productId) {
        Integer n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bids WHERE product_id = ?", Integer.class,
                productId);
        return n == null ? 0 : n;
    }

    private Long dbLeadingBidId(long productId) {
        return jdbcTemplate.queryForObject("SELECT leading_bid_id FROM products WHERE id = ?", Long.class, productId);
    }

    private BigDecimal dbCurrentPrice(long productId) {
        return jdbcTemplate.queryForObject("SELECT current_price FROM products WHERE id = ?", BigDecimal.class,
                productId);
    }

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }
}
