package com.example.bids_server.service;

import com.example.bids_server.repository.UsersRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsersRepository usersRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UsersRepository usersRepository) {
        this.usersRepository = usersRepository;
    }

    /**
     * Registers a new user and returns the generated user id.
     *
     * Rules:
     * - username must be unique
     * - password is stored as a BCrypt hash
     * 
     * @param username    the desired username
     * @param rawPassword the desired password in plain text
     * @param firstName   user's first name
     * @param lastName    user's last name
     * @param mobilePhone user's mobile phone number
     * @param city        user's city
     * @param street      user's street
     * @param zipCode     user's zip code
     * @return the generated user id
     * @throws IllegalArgumentException if username already exists
     */
    public long register(
            String username,
            String rawPassword,
            String firstName,
            String lastName,
            String mobilePhone,
            String city,
            String street,
            String zipCode) {

        if (usersRepository.findIdByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        String passwordHash = passwordEncoder.encode(rawPassword);

        return usersRepository.saveUser(
                username,
                passwordHash,
                firstName,
                lastName,
                mobilePhone,
                city,
                street,
                zipCode);
    }

    /**
     * Authenticates a user by username and password.
     *
     * @param username    the username
     * @param rawPassword the password provided by the user
     * @return the authenticated user's id
     * @throws IllegalArgumentException if username does not exist or password is
     *                                  invalid
     */
    public long login(String username, String rawPassword) {

        String storedHash = usersRepository.findPasswordHashByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        boolean matches = passwordEncoder.matches(rawPassword, storedHash);
        if (!matches) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        return usersRepository.findIdByUsername(username)
                .orElseThrow(() -> new IllegalStateException("User id not found after successful login"));
    }

}
