package com.example.bids_server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for the application.
 *
 * This configuration customizes Spring Security behavior during development:
 * - Allows unrestricted access to the H2 database console.
 * - Disables CSRF protection specifically for the H2 console.
 * - Allows the H2 console to be rendered in a same-origin iframe.
 *
 * All other endpoints remain protected and require authentication.
 *
 * NOTE: This configuration is intended for development purposes only.
 */
@Configuration
public class SecurityConfig {

    /**
     * Defines the application's security filter chain.
     *
     * @param http HttpSecurity builder used to configure security behavior
     * @return the configured SecurityFilterChain
     * @throws Exception if a security configuration error occurs
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
            .csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**", "/api/auth/**"))

            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/h2-console/**").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/error").permitAll()
                    .anyRequest().authenticated())

            .formLogin(form -> {
            });

        return http.build();
    }
}
