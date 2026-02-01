package com.example.bids_server.repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class MeRepository {

    private final JdbcTemplate jdbcTemplate;

    public MeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record MyBidHistoryDbRow(
            long productId,
            String productName,
            java.math.BigDecimal myMaxBid,
            java.math.BigDecimal currentPrice,
            LocalDateTime endTime,
            String deliveryLocation,
            String imageUrl,
            Long leadingBidderId) {
    }

    /**
     * Returns one row per product the user has ever bid on.
     * myMaxBid = MAX(b.max_amount) for that user & product.
     * leadingBidderId derived from products.leading_bid_id -> bids.bidder_id
     */
    public List<MyBidHistoryDbRow> findBidHistoryForUser(long userId) {
        String sql = """
                SELECT
                    p.id                AS product_id,
                    p.name              AS product_name,
                    p.current_price     AS current_price,
                    p.end_time          AS end_time,
                    p.delivery_location AS delivery_location,
                    p.image_url         AS image_url,
                    my.my_max_bid       AS my_max_bid,
                    lb.bidder_id        AS leading_bidder_id
                FROM products p
                JOIN (
                    SELECT product_id, MAX(max_amount) AS my_max_bid
                    FROM bids
                    WHERE bidder_id = ?
                    GROUP BY product_id
                ) my ON my.product_id = p.id
                LEFT JOIN bids lb ON lb.id = p.leading_bid_id
                ORDER BY
                    CASE WHEN p.end_time > CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
                    p.end_time ASC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Timestamp endTs = rs.getTimestamp("end_time");
            LocalDateTime endTime = (endTs != null) ? endTs.toLocalDateTime() : null;

            return new MyBidHistoryDbRow(
                    rs.getLong("product_id"),
                    rs.getString("product_name"),
                    rs.getBigDecimal("my_max_bid"),
                    rs.getBigDecimal("current_price"),
                    endTime,
                    rs.getString("delivery_location"),
                    rs.getString("image_url"),
                    (Long) rs.getObject("leading_bidder_id"));
        }, userId);
    }

    public record MySellingProductDbRow(
            long productId,
            String productName,
            java.math.BigDecimal currentPrice,
            LocalDateTime endTime,
            String deliveryLocation,
            String imageUrl,
            int bidCount,
            Long leadingBidderId) {
    }

    public List<MySellingProductDbRow> findProductsSellingForUser(long sellerId) {
        String sql = """
                SELECT
                    p.id                AS product_id,
                    p.name              AS product_name,
                    p.current_price     AS current_price,
                    p.end_time          AS end_time,
                    p.delivery_location AS delivery_location,
                    p.image_url         AS image_url,
                    COALESCE(bc.bid_count, 0) AS bid_count,
                    lb.bidder_id        AS leading_bidder_id
                FROM products p
                LEFT JOIN (
                    SELECT product_id, COUNT(*) AS bid_count
                    FROM bids
                    GROUP BY product_id
                ) bc ON bc.product_id = p.id
                LEFT JOIN bids lb ON lb.id = p.leading_bid_id
                WHERE p.seller_id = ?
                ORDER BY
                    CASE WHEN p.end_time > CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
                    p.end_time ASC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Timestamp endTs = rs.getTimestamp("end_time");
            LocalDateTime endTime = (endTs != null) ? endTs.toLocalDateTime() : null;

            return new MySellingProductDbRow(
                    rs.getLong("product_id"),
                    rs.getString("product_name"),
                    rs.getBigDecimal("current_price"),
                    endTime,
                    rs.getString("delivery_location"),
                    rs.getString("image_url"),
                    rs.getInt("bid_count"),
                    (Long) rs.getObject("leading_bidder_id"));
        }, sellerId);
    }

    public Optional<MeProfile> getMeProfile(long userId) {
        String sql = """
                SELECT id, username, first_name, last_name, mobile_phone, city, street, zip_code
                FROM users
                WHERE id = ?
                """;

        List<MeProfile> rows = jdbcTemplate.query(sql, (rs, rowNum) -> new MeProfile(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("first_name"),
                rs.getString("last_name"),
                rs.getString("mobile_phone"),
                rs.getString("city"),
                rs.getString("street"),
                rs.getString("zip_code")), userId);

        return rows.stream().findFirst();
    }

    @SuppressWarnings("null")
    public void patchUserProfile(long userId, UserProfilePatch patch) {
        StringBuilder sb = new StringBuilder("UPDATE users SET ");
        List<Object> params = new ArrayList<>();
        boolean any = false;

        any = appendSet(sb, params, any, "first_name", patch.firstName());
        any = appendSet(sb, params, any, "last_name", patch.lastName());
        any = appendSet(sb, params, any, "mobile_phone", patch.mobilePhone());
        any = appendSet(sb, params, any, "city", patch.city());
        any = appendSet(sb, params, any, "street", patch.street());
        any = appendSet(sb, params, any, "zip_code", patch.zipCode());

        if (!any)
            return;

        sb.append(" WHERE id = ?");
        params.add(userId);
        jdbcTemplate.update(sb.toString(), params.toArray());
    }

    public record PatchField(boolean present, String value) {
    }

    public record UserProfilePatch(
            PatchField firstName,
            PatchField lastName,
            PatchField mobilePhone,
            PatchField city,
            PatchField street,
            PatchField zipCode) {
    }

    private boolean appendSet(StringBuilder sb, List<Object> params, boolean any,
            String column, PatchField field) {
        if (field == null || !field.present())
            return any;
        if (any)
            sb.append(", ");
        sb.append(column).append(" = ?");
        params.add(field.value());
        return true;
    }

    public record MeProfile(
            long id,
            String username,
            String firstName,
            String lastName,
            String mobilePhone,
            String city,
            String street,
            String zipCode) {
    }

}
