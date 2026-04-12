package com.example.bids_server.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.bids_server.repository.BidsRepository;
import com.example.bids_server.repository.BidsRepository.LockedBidState;

/**
 * Logic for proxy bidding.
 */
@Service
public class BidsService {

    private final BidsRepository bidsRepository;
    private final BidIncrementPolicy incrementPolicy;
    private final CurrentUserService currentUserService;

    public BidsService(
            BidsRepository bidsRepository,
            BidIncrementPolicy incrementPolicy,
            CurrentUserService currentUserService) {
        this.bidsRepository = bidsRepository;
        this.incrementPolicy = incrementPolicy;
        this.currentUserService = currentUserService;
    }

    public enum BidResultStatus {
        REJECT_TOO_LOW, // case 1: no DB changes
        OUTBID, // case 2: update current_price
        WINNING // case 3 or first bid: insert bid + update current_price
    }

    public record PlaceBidResult(
            BidResultStatus status,
            long productId,
            BigDecimal newCurrentPrice,
            BigDecimal nextMinRequiredBid,
            Long leadingBidId, // may change only on WINNING
            BigDecimal minRequiredMax, // only for REJECT_TOO_LOW (else null)
            String message) {
    }

    /**
     * Places a proxy bid
     *
     * Concurrency: handled by locking the product row in repo inside this
     * transaction.
     */
    @Transactional
    public PlaceBidResult placeProxyBid(long productId, BigDecimal bidderMaxAmount) {

        long bidderId = currentUserService.requireAuthenticatedUserId();

        if (bidderMaxAmount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bidderMaxAmount is required");
        }
        if (bidderMaxAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bidderMaxAmount must be > 0");
        }

        LockedBidState st = bidsRepository.lockBidState(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        // Must be active
        if (!st.endTime().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Auction has ended");
        }

        // Cannot bid on your own product
        if (st.sellerId() == bidderId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seller cannot bid on own product");
        }

        BigDecimal currentPrice = st.currentPrice();
        BigDecimal step = incrementPolicy.stepFor(currentPrice);

        // CASE: no bids yet
        if (st.leadingBidId() == null) {
            return firstBid(currentPrice, bidderMaxAmount, productId, bidderId);
        }

        // There is a leader
        BigDecimal currentBidMaxAmount = st.currentLeaderMaxAmount();
        long currentLeaderBidId = st.leadingBidId();
        Long leaderUserId = st.leaderUserId();

        // CASE: bidder is already the current leader
        if (leaderUserId != null && leaderUserId == bidderId) {
            return updateLeaderMaxAmount(productId, bidderId, bidderMaxAmount, currentPrice, currentBidMaxAmount);
        }

        // CASE: bidderMaxAmount < currentPrice + step => reject, NO DB CHANGES
        BigDecimal minRequired = currentPrice.add(step);
        if (bidderMaxAmount.compareTo(minRequired) < 0) {
            return new PlaceBidResult(
                    BidResultStatus.REJECT_TOO_LOW,
                    productId,
                    currentPrice,
                    minRequired,
                    currentLeaderBidId,
                    minRequired,
                    "Bid too low. You must bid at least " + minRequired);
        }

        // CASE: bidderMaxAmount > currentBidMaxAmount => bidder becomes leader
        if (bidderMaxAmount.compareTo(currentBidMaxAmount) > 0) {
            return bidderWins(bidderMaxAmount, productId, bidderId, step, currentBidMaxAmount);
        }

        // bidderMaxAmount <= currentBidMaxAmount => bidder cannot become leader
        // CASE: outbid
        return outBid(bidderMaxAmount, productId, step, currentBidMaxAmount, currentLeaderBidId);
    }

    private PlaceBidResult updateLeaderMaxAmount(long productId, long bidderId, BigDecimal bidderMaxAmount,
            BigDecimal currentPrice, BigDecimal currentBidMaxAmount) {
        if (bidderMaxAmount.compareTo(currentBidMaxAmount) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "New max bid must be higher than your current max bid");
        }
        // Insert a new bid with the new max amount
        long newBidId = bidsRepository.insertBid(productId, bidderId, bidderMaxAmount);
        // Keep the current price the same
        bidsRepository.updateProductAfterWin(productId, currentPrice, newBidId);
        return new PlaceBidResult(
                BidResultStatus.WINNING,
                productId,
                currentPrice,
                currentPrice,
                newBidId,
                null,
                "Your max bid was updated successfully");
    }

    private PlaceBidResult firstBid(BigDecimal currentPrice, BigDecimal bidderMaxAmount, long productId,
            long bidderId) {
        // First bid is accepted if max >= currentPrice
        if (bidderMaxAmount.compareTo(currentPrice) < 0) {
            return new PlaceBidResult(
                    BidResultStatus.REJECT_TOO_LOW,
                    productId,
                    currentPrice,
                    currentPrice,
                    null,
                    currentPrice,
                    "Bid too low");
        }

        long newBidId = bidsRepository.insertBid(productId, bidderId, bidderMaxAmount);

        // First bid: keep displayed current price as-is
        bidsRepository.updateProductAfterWin(productId, currentPrice, newBidId);

        return new PlaceBidResult(
                BidResultStatus.WINNING,
                productId,
                currentPrice,
                currentPrice,
                newBidId,
                null,
                "Your bid was accepted and you are currently leading");
    }

    private PlaceBidResult bidderWins(BigDecimal bidderMaxAmount, long productId,
            long bidderId, BigDecimal step, BigDecimal currentBidMaxAmount) {
        BigDecimal newPrice = currentBidMaxAmount.add(step);
        if (newPrice.compareTo(bidderMaxAmount) > 0) {
            newPrice = bidderMaxAmount;
        }

        long newBidId = bidsRepository.insertBid(productId, bidderId, bidderMaxAmount);
        bidsRepository.updateProductAfterWin(productId, newPrice, newBidId);

        return new PlaceBidResult(
                BidResultStatus.WINNING,
                productId,
                newPrice,
                newPrice,
                newBidId,
                null,
                "Your bid was accepted and you are currently leading");
    }

    private PlaceBidResult outBid(BigDecimal bidderMaxAmount, long productId, BigDecimal step,
            BigDecimal currentBidMaxAmount, Long currentLeaderBidId) {
        // newCurrentPrice = min(bidderMaxAmount + step, currentBidMaxAmount)
        BigDecimal newPrice = bidderMaxAmount.add(step);
        if (newPrice.compareTo(currentBidMaxAmount) > 0) {
            newPrice = currentBidMaxAmount;
        }

        // Leader stays the same, leading_bid_id unchanged
        bidsRepository.updateProductAfterOutbid(productId, newPrice);

        return new PlaceBidResult(
                BidResultStatus.OUTBID,
                productId,
                newPrice,
                newPrice.add(incrementPolicy.stepFor(newPrice)),
                currentLeaderBidId,
                null,
                "You were immediately outbid by another user's max bid");
    }
}
