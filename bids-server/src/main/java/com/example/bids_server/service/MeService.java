package com.example.bids_server.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.bids_server.repository.MeRepository;
import com.example.bids_server.repository.MeRepository.MeProfile;
import com.example.bids_server.repository.MeRepository.PatchField;
import com.example.bids_server.repository.MeRepository.UserProfilePatch;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class MeService {

    private final MeRepository meRepository;
    private final CurrentUserService currentUserService;

    public MeService(MeRepository meRepository, CurrentUserService currentUserService) {
        this.meRepository = meRepository;
        this.currentUserService = currentUserService;
    }

    public enum MyBidStatus {
        WINNING,
        OUTBID,
        WON,
        LOST
    }

    public record MyBidHistoryRow(
            long productId,
            String productName,
            BigDecimal myMaxBid,
            BigDecimal currentPrice,
            LocalDateTime endTime,
            String deliveryLocation,
            String imageUrl,
            MyBidStatus status) {
    }

    public List<MyBidHistoryRow> getMyBidsHistory() {
        long userId = currentUserService.requireAuthenticatedUserId();

        LocalDateTime now = LocalDateTime.now();

        return meRepository.findBidHistoryForUser(userId).stream()
                .map(row -> {
                    boolean active = row.endTime() != null && row.endTime().isAfter(now);
                    boolean iAmLeading = row.leadingBidderId() != null
                            && row.leadingBidderId().longValue() == userId;

                    MyBidStatus status;
                    if (active) {
                        status = iAmLeading ? MyBidStatus.WINNING : MyBidStatus.OUTBID;
                    } else {
                        status = iAmLeading ? MyBidStatus.WON : MyBidStatus.LOST;
                    }

                    return new MyBidHistoryRow(
                            row.productId(),
                            row.productName(),
                            row.myMaxBid(),
                            row.currentPrice(),
                            row.endTime(),
                            row.deliveryLocation(),
                            row.imageUrl(),
                            status);
                })
                .toList();
    }

    public enum MySellingStatus {
        ACTIVE,
        SOLD
    }

    public record MySellingProductRow(
            long productId,
            String productName,
            java.math.BigDecimal currentPrice,
            java.time.LocalDateTime endTime,
            String deliveryLocation,
            String imageUrl,
            MySellingStatus status,
            boolean canEdit,
            int bidCount,
            Long leadingBidderId) {
    }

    public List<MySellingProductRow> getMyProductsSelling() {
        long sellerId = currentUserService.requireAuthenticatedUserId();
        LocalDateTime now = LocalDateTime.now();

        return meRepository.findProductsSellingForUser(sellerId).stream()
                .map(row -> {
                    boolean active = row.endTime() != null && row.endTime().isAfter(now);
                    MySellingStatus status = active ? MySellingStatus.ACTIVE : MySellingStatus.SOLD;

                    // canEdit: only if NO bids exist at all
                    boolean canEdit = row.bidCount() == 0;

                    return new MySellingProductRow(
                            row.productId(),
                            row.productName(),
                            row.currentPrice(),
                            row.endTime(),
                            row.deliveryLocation(),
                            row.imageUrl(),
                            status,
                            canEdit,
                            row.bidCount(),
                            row.leadingBidderId());
                })
                .toList();
    }

    public MeProfile getMyProfile() {
        long userId = currentUserService.requireAuthenticatedUserId();
        return meRepository.getMeProfile(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /**
     * PATCH behavior:
     * - missing field => unchanged
     * - field present with null => clear (only allowed for nullable fields)
     */
    public MeProfile patchMyProfile(JsonNode patchBody) {
        long userId = currentUserService.requireAuthenticatedUserId();

        if (patchBody == null || !patchBody.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON body");
        }

        Set<String> forbidden = Set.of("username", "password", "passwordHash", "password_hash");
        for (String k : forbidden) {
            if (patchBody.has(k)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field '" + k + "' cannot be updated");
            }
        }

        // Determine which fields are present and their values
        PatchField firstName = readPatchField(patchBody, "firstName");
        PatchField lastName = readPatchField(patchBody, "lastName");
        PatchField mobilePhone = readPatchField(patchBody, "mobilePhone");
        PatchField city = readPatchField(patchBody, "city");
        PatchField street = readPatchField(patchBody, "street");
        PatchField zipCode = readPatchField(patchBody, "zipCode");

        // If none of the allowed fields were present => nothing to patch
        if (!firstName.present() && !lastName.present() && !mobilePhone.present()
                && !city.present() && !street.present() && !zipCode.present()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No editable fields provided");
        }

        // Validate required fields when present
        validateRequiredNotNullNotBlank("firstName", firstName, 50);
        validateRequiredNotNullNotBlank("lastName", lastName, 50);
        validateRequiredNotNullNotBlank("mobilePhone", mobilePhone, 20);

        // Validate optional fields when present
        validateOptionalMaxLen("city", city, 50);
        validateOptionalMaxLen("street", street, 100);
        validateOptionalMaxLen("zipCode", zipCode, 10);

        UserProfilePatch patch = new MeRepository.UserProfilePatch(
                firstName,
                lastName,
                mobilePhone,
                city,
                street,
                zipCode);

        meRepository.patchUserProfile(userId, patch);

        return meRepository.getMeProfile(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /**
     * Reads a PATCH field:
     * - not present => present=false
     * - present null => present=true, value=null
     * - present string => trimmed ("" becomes null)
     * - present non-string => BAD_REQUEST
     */
    private PatchField readPatchField(JsonNode body, String key) {
        if (!body.has(key)) {
            return new PatchField(false, null);
        }
        JsonNode n = body.get(key);
        if (n.isNull()) {
            return new PatchField(true, null);
        }
        if (!n.isTextual()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field '" + key + "' must be a string or null");
        }
        String t = n.asText();
        if (t != null) {
            t = t.trim();
            if (t.isEmpty())
                t = null;
        }
        return new PatchField(true, t);
    }

    private void validateRequiredNotNullNotBlank(String field, PatchField pf, int maxLen) {
        if (!pf.present())
            return; // not being patched
        if (pf.value() == null) {
            // not allowed by DB NOT NULL
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " cannot be null/blank");
        }
        if (pf.value().length() > maxLen) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " max length is " + maxLen);
        }
    }

    private void validateOptionalMaxLen(String field, PatchField pf, int maxLen) {
        if (!pf.present())
            return;
        if (pf.value() == null)
            return;
        if (pf.value().length() > maxLen) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " max length is " + maxLen);
        }
    }
}
