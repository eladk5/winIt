package com.example.bids_server;

import com.example.bids_server.service.AuthService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String USERNAME = "auth_test_user";
    private static final String PASSWORD = "pass123";

    private long createdUserId;

    @BeforeAll
    void setupUser() {
        // Ensure clean slate in case a previous run crashed
        jdbcTemplate.update("DELETE FROM users WHERE username = ?", USERNAME);

        createdUserId = authService.register(
                USERNAME,
                PASSWORD,
                "Auth",
                "Test",
                "0502222222",
                null,
                null,
                null);
    }

    @AfterAll
    void cleanupUser() {
        jdbcTemplate.update("DELETE FROM users WHERE username = ?", USERNAME);
    }

    @Test
    void login_returnsUserId_whenPasswordCorrect() {
        long loginId = authService.login(USERNAME, PASSWORD);
        assertEquals(createdUserId, loginId);
    }

    @Test
    void login_throws_whenPasswordIncorrect() {
        assertThrows(IllegalArgumentException.class,
                () -> authService.login(USERNAME, "wrongPassword"));
    }
}
