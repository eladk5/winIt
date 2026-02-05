package com.example.bids_server.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.bids_server.repository.MeRepository.MeProfile;
import com.example.bids_server.service.MeService;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/me")
@Tag(name = "Me", description = "User specific operations")
public class MeController {

        private final MeService meService;
        private final ObjectMapper objectMapper;

        public MeController(MeService meService, ObjectMapper objectMapper) {
                this.meService = meService;
                this.objectMapper = objectMapper;
        }

        @GetMapping("/bids-history")
        @Operation(summary = "Get my bid history")
        public List<MyBidHistoryItem> bidsHistory() {
                return meService.getMyBidsHistory().stream()
                                .map(r -> new MyBidHistoryItem(
                                                r.productId(),
                                                r.productName(),
                                                r.myMaxBid(),
                                                r.currentPrice(),
                                                r.endTime(),
                                                r.deliveryLocation(),
                                                r.imageUrl(),
                                                r.status().name()))
                                .toList();
        }

        @GetMapping("/products-selling")
        @Operation(summary = "Get products I am selling")
        public List<MySellingProductItem> productsSelling() {
                return meService.getMyProductsSelling().stream()
                                .map(r -> new MySellingProductItem(
                                                r.productId(),
                                                r.productName(),
                                                r.currentPrice(),
                                                r.endTime(),
                                                r.deliveryLocation(),
                                                r.imageUrl(),
                                                r.status().name(),
                                                r.canEdit(),
                                                r.bidCount(),
                                                r.leadingBidderId()))
                                .toList();
        }

        public record MyBidHistoryItem(
                        long productId,
                        String productName,
                        BigDecimal myMaxBid,
                        BigDecimal currentPrice,
                        LocalDateTime endTime,
                        String deliveryLocation,
                        String imageUrl,
                        String status) {
        }

        public record MySellingProductItem(
                        long productId,
                        String productName,
                        BigDecimal currentPrice,
                        LocalDateTime endTime,
                        String deliveryLocation,
                        String imageUrl,
                        String status,
                        boolean canEdit,
                        int bidCount,
                        Long leadingBidderId) {
        }

        @PatchMapping("/edit")
        @Operation(summary = "Edit my profile")
        public ResponseEntity<MeProfileResponse> editMe(@RequestBody EditProfileRequest requestBody) {
                JsonNode node = objectMapper.valueToTree(requestBody);

                MeProfile updated = meService.patchMyProfile(node);
                return ResponseEntity.ok(new MeProfileResponse(
                                updated.id(),
                                updated.username(),
                                updated.firstName(),
                                updated.lastName(),
                                updated.mobilePhone(),
                                updated.city(),
                                updated.street(),
                                updated.zipCode()));
        }

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record EditProfileRequest(
                        String firstName,
                        String lastName,
                        String mobilePhone,
                        String city,
                        String street,
                        String zipCode) {
        }

        public record MeProfileResponse(
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
