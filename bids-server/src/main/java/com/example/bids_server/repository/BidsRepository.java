package com.example.bids_server.repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class BidsRepository {

    private final JdbcTemplate jdbcTemplate;

    public BidsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Locked snapshot of the state needed to calculate the proxy bid outcome.
     */
    public record LockedBidState(
            long productId,
            long sellerId,
            BigDecimal currentPrice,
            LocalDateTime endTime,
            Long leadingBidId,               // nullable if no bids
            BigDecimal currentLeaderMaxAmount // nullable if no bids
    ) {}

    /**
     * Locks the product row FOR UPDATE and returns the current bid-relevant state.
     */
    public Optional<LockedBidState> lockBidState(long productId) {

        String sql = """
                SELECT
                    p.id              AS product_id,
                    p.seller_id       AS seller_id,
                    p.current_price   AS current_price,
                    p.end_time        AS end_time,
                    p.leading_bid_id  AS leading_bid_id,
                    lb.max_amount     AS leader_max_amount
                FROM products p
                LEFT JOIN bids lb
                    ON lb.id = p.leading_bid_id
                WHERE p.id = ?
                FOR UPDATE
                """;

        return jdbcTemplate.query(sql, rs -> {
            if (!rs.next()) {
                return Optional.empty();
            }
            return Optional.of(mapLockedState(rs));
        }, productId);
    }

    /**
     * Inserts a bid row and returns the generated bid id.
     * 
     * @param productId the product being bid on
     * @param bidderId  the user placing the bid
     * @param maxAmount the maximum amount of the proxy bid
     * @return the generated bid id
     */
    public long insertBid(long productId, long bidderId, BigDecimal maxAmount) {
        String sql = """
                INSERT INTO bids (product_id, bidder_id, max_amount)
                VALUES (?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "ID" });
            ps.setLong(1, productId);
            ps.setLong(2, bidderId);
            ps.setBigDecimal(3, maxAmount);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to retrieve generated bid id after insert");
        }
        return key.longValue();
    }

    /**
     * Updates product after a winning bid:
     * - current_price becomes newCurrentPrice
     * - leading_bid_id becomes newLeadingBidId
     * 
     * @param productId       the product being updated
     * @param newCurrentPrice the new current price
     * @param newLeadingBidId the new leading bid id
     */
    public void updateProductAfterWin(long productId, BigDecimal newCurrentPrice, long newLeadingBidId) {
        String sql = """
                UPDATE products
                SET current_price = ?, leading_bid_id = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, newCurrentPrice, newLeadingBidId, productId);
    }

    /**
     * Updates product after an outbid:
     * - current_price becomes newCurrentPrice
     * - leading_bid_id remains unchanged
     * 
     * @param productId       the product being updated
     * @param newCurrentPrice the new current price
     */
    public void updateProductAfterOutbid(long productId, BigDecimal newCurrentPrice) {
        String sql = """
                UPDATE products
                SET current_price = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, newCurrentPrice, productId);
    }


    public boolean hasAnyBids(long productId) {
        String sql = "SELECT COUNT(*) FROM bids WHERE product_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, productId);
        return count != null && count > 0;
    }

    private LockedBidState mapLockedState(ResultSet rs) throws SQLException {

        long pid = rs.getLong("product_id");
        long sellerId = rs.getLong("seller_id");

        BigDecimal currentPrice = rs.getBigDecimal("current_price");

        Timestamp endTs = rs.getTimestamp("end_time");
        LocalDateTime endTime = endTs.toLocalDateTime();

        Long leadingBidId = (Long) rs.getObject("leading_bid_id");

        BigDecimal leaderMax = rs.getBigDecimal("leader_max_amount");

        return new LockedBidState(
                pid,
                sellerId,
                currentPrice,
                endTime,
                leadingBidId,
                leaderMax);
    }
}
