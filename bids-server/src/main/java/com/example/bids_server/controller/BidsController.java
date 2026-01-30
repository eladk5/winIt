package com.example.bids_server.controller;

import java.math.BigDecimal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.bids_server.service.BidsService;

@RestController
@RequestMapping("/api")
public class BidsController {

    private final BidsService bidsService;

    public BidsController(BidsService bidsService) {
        this.bidsService = bidsService;
    }

    /**
     * Spec: POST /api/bids
     * Request: { "productId": 505, "maxAmount": 1300.00 }
     *
     * Response (200 OK):
     * {
     * "status": "WINNING" | "OUTBID" | "REJECT_TOO_LOW",
     * "currentPrice": 1260.00,
     * "minRequiredMax": 1265.00, // only when REJECT_TOO_LOW
     * "message": "..."
     * }
     */
    public record PlaceBidRequest(
            long productId,
            BigDecimal maxAmount) {
    }

    public record PlaceBidResponse(
            String status,
            BigDecimal currentPrice,
            BigDecimal minRequiredMax, // null unless REJECT_TOO_LOW
            String message) {
    }

    @PostMapping("/bids")
    public ResponseEntity<PlaceBidResponse> placeBid(@RequestBody PlaceBidRequest req) {

        BidsService.PlaceBidResult result = bidsService.placeProxyBid(req.productId(), req.maxAmount());

        PlaceBidResponse body = new PlaceBidResponse(
                result.status().name(),
                result.newCurrentPrice(),
                result.minRequiredMax(),
                result.message());
                
        return ResponseEntity.ok(body);
    }
}
