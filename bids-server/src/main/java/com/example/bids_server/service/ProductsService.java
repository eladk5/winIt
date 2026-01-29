package com.example.bids_server.service;

import com.example.bids_server.repository.Product;
import com.example.bids_server.repository.ProductSearchQuery;
import com.example.bids_server.repository.ProductsRepository;
import com.example.bids_server.repository.UsersRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductsService {

    private final ProductsRepository productsRepository;
    private final UsersRepository usersRepository;

    public ProductsService(ProductsRepository productsRepository, UsersRepository usersRepository) {
        this.productsRepository = productsRepository;
        this.usersRepository = usersRepository;
    }

    /**
     * Main catalog behavior:
     * - Always returns ACTIVE products only (end_time > now).
     * - If logged-in, excludes products where the user is the seller.
     */
    public List<Product> searchCatalog(ProductSearchQuery q) {
        Long excludeSellerId = resolveLoggedInUserId().orElse(null);

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

    private Optional<Long> resolveLoggedInUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return Optional.empty();
        }
        if ("anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }

        String username = auth.getName();
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }

        return usersRepository.findIdByUsername(username);
    }
}
