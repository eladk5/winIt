package com.example.bids_server;

import com.example.bids_server.repository.UsersRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class UsersRepositoryTest {

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String TEST_USERNAME = "test_user_repo";
    private static final String TEST_PASSWORD_HASH = "dummy_hash";
    private static final String TEST_USERNAME_SAVE = "test_user_save";

    @AfterEach
    void cleanup() {
        jdbcTemplate.update("DELETE FROM users WHERE username = ?", TEST_USERNAME);
        jdbcTemplate.update("DELETE FROM users WHERE username = ?", TEST_USERNAME_SAVE);
    }

    @Test
    void findIdByUsername_returnsId_whenUserExists() {

        jdbcTemplate.update("""
                INSERT INTO users (username, password_hash, first_name, last_name, mobile_phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                TEST_USERNAME,
                TEST_PASSWORD_HASH,
                "Test",
                "User",
                "0500000000");

        Optional<Long> idOpt = usersRepository.findIdByUsername(TEST_USERNAME);

        assertTrue(idOpt.isPresent(), "Expected to find user id for existing username");
        assertTrue(idOpt.get() > 0, "Expected returned id to be positive");
    }

    @Test
    void findIdByUsername_returnsEmpty_whenUserDoesNotExist() {
        Optional<Long> idOpt = usersRepository.findIdByUsername("no_such_user_12345");
        assertTrue(idOpt.isEmpty(), "Expected empty Optional for missing username");
    }

    @Test
    void saveUser_insertsRow_andReturnsGeneratedId() {

        long newId = usersRepository.saveUser(
                TEST_USERNAME_SAVE,
                "dummy_hash_2",
                "Save",
                "Test",
                "0501111111",
                null,
                null,
                null);

        assertTrue(newId > 0, "Expected generated id to be positive");

        Optional<Long> foundId = usersRepository.findIdByUsername(TEST_USERNAME_SAVE);
        assertTrue(foundId.isPresent(), "Expected user to exist after saveUser");
        assertEquals(newId, foundId.get(), "Expected found id to match returned generated id");
    }

}
