package com.example.bids_server.repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ProductsRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProductsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Catalog query with full filtering + sorting + optional exclusion of seller's
     * own products.
     *
     * excludeSellerId:
     * - null => guest (do not exclude anything)
     * - value => logged-in user: exclude products where seller_id = value
     * 
     * @param q               the search query options (nullable)
     * @param excludeSellerId the seller id to exclude (nullable)  
     * @return list of products matching the query
     */
    public List<Product> searchProducts(ProductSearchQuery q, Long excludeSellerId) {

        boolean activeOnly = (q == null || q.activeOnly() == null) ? true : q.activeOnly();

        ProductSearchQuery.SortBy sortBy = (q == null || q.sortBy() == null) ? ProductSearchQuery.SortBy.END_TIME
                : q.sortBy();

        ProductSearchQuery.SortDir sortDir = (q == null || q.sortDir() == null) ? ProductSearchQuery.SortDir.ASC
                : q.sortDir();

        StringBuilder sql = new StringBuilder("SELECT * FROM products");
        List<String> where = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (excludeSellerId != null) {
            where.add("seller_id <> ?");
            params.add(excludeSellerId);
        }

        if (activeOnly) {
            where.add("end_time > CURRENT_TIMESTAMP");
        }

        if (q != null && q.category() != null) {
            where.add("category = ?");
            params.add(q.category().apiValue());
        }

        if (q != null && q.hasImage() != null) {
            if (q.hasImage()) {
                where.add("image_url IS NOT NULL");
                where.add("TRIM(image_url) <> ''");
            } else {
                where.add("(image_url IS NULL OR TRIM(image_url) = '')");
            }
        }

        if (q != null && q.search() != null && !q.search().isBlank()) {
            String term = "%" + q.search().trim().toLowerCase() + "%";
            where.add("(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)");
            params.add(term);
            params.add(term);
        }

        if (q != null && q.endFrom() != null) {
            where.add("end_time >= ?");
            params.add(Timestamp.valueOf(q.endFrom()));
        }
        if (q != null && q.endTo() != null) {
            where.add("end_time <= ?");
            params.add(Timestamp.valueOf(q.endTo()));
        }

        if (q != null && (q.minPrice() != null || q.maxPrice() != null)) {
            String cond = buildPriceCondition("current_price", q.minPrice(), q.maxPrice());
            where.add(cond);
            addPriceParams(params, q.minPrice(), q.maxPrice());
        }

        if (!where.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", where));
        }

        String sortColumn = switch (sortBy) {
            case END_TIME -> "end_time";
            case START_TIME -> "start_time";
            case CURRENT_PRICE -> "current_price";
        };

        sql.append(" ORDER BY ").append(sortColumn).append(" ").append(sortDir.name());

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapRowToProduct(rs), params.toArray());
    }

     /**
     * Inserts a new product row and returns the generated product id.
     *
     * @param sellerId       the id of the seller (user)
     * @param name           product name  
     * @param description    product description (nullable)
     * @param category       product category
     * @param deliveryLocation delivery location
     * @param imageUrl       product image URL (nullable)
     * @param startTime      auction start time
     * @param endTime        auction end time
     * @param startingPrice  starting price
     * @param currentPrice   current price
     * @param leadingBidId   leading bid id (nullable)
     * @return the generated product id
     */
    public long saveProduct(
            long sellerId,
            String name,
            String description,
            String category,
            String deliveryLocation,
            String imageUrl,
            LocalDateTime startTime,
            LocalDateTime endTime,
            BigDecimal startingPrice,
            BigDecimal currentPrice,
            Long leadingBidId
    ) {
        String sql = """
                INSERT INTO products
                (seller_id, name, description, category, delivery_location, image_url,
                 start_time, end_time, starting_price, current_price, leading_bid_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[]{"ID"});

            ps.setLong(1, sellerId);
            ps.setString(2, name);
            ps.setString(3, description);           // can be null
            ps.setString(4, category);
            ps.setString(5, deliveryLocation);
            ps.setString(6, imageUrl);              // can be null

            ps.setTimestamp(7, Timestamp.valueOf(startTime));
            ps.setTimestamp(8, Timestamp.valueOf(endTime));

            ps.setBigDecimal(9, startingPrice);
            ps.setBigDecimal(10, currentPrice);

            if (leadingBidId == null) {
                ps.setNull(11, Types.BIGINT);
            } else {
                ps.setLong(11, leadingBidId);
            }

            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to retrieve generated product id after insert");
        }
        return key.longValue();
    }

    /**
     * Finds a product by id.
     * Returns Optional.empty() if no such product exists.
     */
    public Optional<Product> findById(long productId) {
        String sql = "SELECT * FROM products WHERE id = ?";

        return jdbcTemplate.query(sql, rs -> {
            if (!rs.next()) {
                return Optional.empty();
            }

            return Optional.of(mapRowToProduct(rs));
        }, productId);
    }


    /**
     * Returns true if there is at least one bid for the given product.
     */
    public boolean hasAnyBids(long productId) {
        String sql = "SELECT COUNT(*) FROM bids WHERE product_id = ?";

        Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, productId);
        return cnt != null && cnt > 0;
    }


    private String buildPriceCondition(String column, BigDecimal min, BigDecimal max) {
        if (min != null && max != null)
            return column + " BETWEEN ? AND ?";
        if (min != null)
            return column + " >= ?";
        return column + " <= ?";
    }

    private void addPriceParams(List<Object> params, BigDecimal min, BigDecimal max) {
        if (min != null && max != null) {
            params.add(min);
            params.add(max);
        } else if (min != null) {
            params.add(min);
        } else {
            params.add(max);
        }
    }

    private Product mapRowToProduct(ResultSet rs) throws SQLException {
        return new Product(
                rs.getLong("id"),
                rs.getLong("seller_id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("category"),
                rs.getString("delivery_location"),
                rs.getString("image_url"),
                rs.getTimestamp("start_time").toLocalDateTime(),
                rs.getTimestamp("end_time").toLocalDateTime(),
                rs.getBigDecimal("starting_price"),
                rs.getBigDecimal("current_price"),
                (Long) rs.getObject("leading_bid_id"));
    }

}
