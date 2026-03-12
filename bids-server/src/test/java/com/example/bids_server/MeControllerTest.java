package com.example.bids_server;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.example.bids_server.security.SessionUser;
import com.example.bids_server.service.AuthService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class MeControllerTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    AuthService authService;
    @Autowired
    ObjectMapper objectMapper;

    private long buyerId;
    private String buyerUsername;
    private Authentication buyerAuth;

    private long buyer2Id;
    private String buyer2Username;
    private Authentication buyer2Auth;

    private long sellerId;
    private String sellerUsername;
    private Authentication sellerAuth;

    @BeforeAll
    void beforeAll() {
        String suffix = String.valueOf(System.currentTimeMillis());

        buyerUsername = "buyer_" + suffix;
        buyer2Username = "buyer2_" + suffix;
        sellerUsername = "seller_" + suffix;

        buyerId = authService.register(
                buyerUsername, "pass123",
                "Buyer", "Auto", "050-1111111",
                "PT", "Street 1", "11111");

        buyer2Id = authService.register(
                buyer2Username, "pass123",
                "Buyer2", "Auto", "050-2222222",
                "PT", "Street 2", "22222");

        sellerId = authService.register(
                sellerUsername, "pass123",
                "Seller", "Auto", "050-3333333",
                "TLV", "Street 3", "33333");

        buyerAuth = authFor(buyerId, buyerUsername);
        buyer2Auth = authFor(buyer2Id, buyer2Username);
        sellerAuth = authFor(sellerId, sellerUsername);
    }

    private Authentication authFor(long id, String username) {
        SessionUser principal = new SessionUser(id, username);
        return new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }


    private long createProductAsSeller(String name, int durationMinutes, int startingPrice) throws Exception {
        @SuppressWarnings("null")
        MvcResult res = mockMvc.perform(multipart("/api/products")
                .param("name", name)
                .param("description", "demo")
                .param("category", "electronics")
                .param("deliveryLocation", "Petah Tikva")
                .param("startingPrice", String.valueOf(startingPrice))
                .param("durationMinutes", String.valueOf(durationMinutes))
                .with(authentication(sellerAuth))
                .with(csrf()))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(res.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    @SuppressWarnings("null")
    private void placeBidAs(Authentication auth, long productId, int maxAmount) throws Exception {
        String body = """
                { "productId": %d, "maxAmount": %d }
                """.formatted(productId, maxAmount);

        mockMvc.perform(post("/api/bids")
                .with(authentication(auth))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk());
    }

    @SuppressWarnings("null")
    @Test
    void bidsHistory_afterBidding_containsProductAndWinning() throws Exception {
        long productId = createProductAsSeller("P1", 60, 100);

        placeBidAs(buyerAuth, productId, 150);

        mockMvc.perform(get("/api/me/bids-history")
                .with(authentication(buyerAuth)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                // find at least one item with our productId
                .andExpect(jsonPath("$[*].productId", hasItem((int) productId)))
                // and for that product, status should include WINNING
                .andExpect(jsonPath("$[?(@.productId==" + productId + ")].status", hasItem("WINNING")));
    }

    @SuppressWarnings("null")
    @Test
    void bidsHistory_whenOutbid_showsOutbidForFirstBidder_andWinningForSecond() throws Exception {
        long productId = createProductAsSeller("P2", 60, 100);

        placeBidAs(buyerAuth, productId, 150);
        placeBidAs(buyer2Auth, productId, 200);

        mockMvc.perform(get("/api/me/bids-history").with(authentication(buyerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.productId==" + productId + ")].status", hasItem("OUTBID")));

        mockMvc.perform(get("/api/me/bids-history").with(authentication(buyer2Auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.productId==" + productId + ")].status", hasItem("WINNING")));
    }

    @SuppressWarnings("null")
    @Test
    void productsSelling_afterBuyerBid_showsBidCountAndCannotEdit() throws Exception {
        long productId = createProductAsSeller("P3", 60, 100);

        placeBidAs(buyerAuth, productId, 130);

        mockMvc.perform(get("/api/me/products-selling")
                .with(authentication(sellerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[*].productId", hasItem((int) productId)))
                // bidCount should be >= 1
                .andExpect(jsonPath("$[?(@.productId==" + productId + ")].bidCount", hasItem(greaterThanOrEqualTo(1))))
                // canEdit should be false after first bid
                .andExpect(jsonPath("$[?(@.productId==" + productId + ")].canEdit", hasItem(false)));
    }

    @SuppressWarnings("null")
    @Test
    void meProfile_returnsPersistedProfileData() throws Exception {
        mockMvc.perform(get("/api/me/profile")
                .with(authentication(buyerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(buyerUsername))
                .andExpect(jsonPath("$.firstName").value("Buyer"))
                .andExpect(jsonPath("$.lastName").value("Auto"))
                .andExpect(jsonPath("$.mobilePhone").value("050-1111111"))
                .andExpect(jsonPath("$.city").value("PT"))
                .andExpect(jsonPath("$.street").value("Street 1"))
                .andExpect(jsonPath("$.zipCode").value("11111"));
    }


    @SuppressWarnings("null")
    @Test
    void editMe_patchCity_only_updatesCity() throws Exception {
        mockMvc.perform(patch("/api/me/edit")
                .with(authentication(buyerAuth))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"city\":\"Petah Tikva\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(buyerUsername))
                .andExpect(jsonPath("$.city").value("Petah Tikva"));
    }

    @SuppressWarnings("null")
    @Test
    void editMe_nullStreet_clearsStreet() throws Exception {
        mockMvc.perform(patch("/api/me/edit")
                .with(authentication(buyerAuth))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"street\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.street").value(nullValue()));
    }

    @SuppressWarnings("null")
    @Test
    void editMe_firstNameNull_isBadRequest() throws Exception {
        mockMvc.perform(patch("/api/me/edit")
                .with(authentication(buyerAuth))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":null}"))
                .andExpect(status().isBadRequest());
    }

    @SuppressWarnings("null")
    @Test
    void editMe_wrongType_isBadRequest() throws Exception {
        mockMvc.perform(patch("/api/me/edit")
                .with(authentication(buyerAuth))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"city\":123}"))
                .andExpect(status().isBadRequest());
    }
}
