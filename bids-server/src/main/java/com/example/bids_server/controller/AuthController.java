package com.example.bids_server.controller;

import com.example.bids_server.security.SessionUser;
import com.example.bids_server.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User registration and login")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record RegisterRequest(
            @NotBlank String username,
            @NotBlank String password,
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank String mobilePhone,
            String city,
            String street,
            String zipCode) {
    }

    public record RegisterResponse(long id, String username) {
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password) {
    }

    public record LoginResponse(long id, String username) {
    }

    public record MeResponse(long id, String username) {
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<RegisterResponse> register(@RequestBody RegisterRequest request) {
        long userId = authService.register(
                request.username(),
                request.password(),
                request.firstName(),
                request.lastName(),
                request.mobilePhone(),
                request.city(),
                request.street(),
                request.zipCode());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(userId, request.username()));
    }

    @PostMapping("/login")
    @Operation(summary = "Login user")
    public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        long userId = authService.login(request.username(), request.password());
        SessionUser principal = new SessionUser(userId, request.username());
        Authentication auth = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        httpRequest.getSession(true);

        return new LoginResponse(userId, request.username());
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public MeResponse me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null
                || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken) {
            throw new AccessDeniedException("Not authenticated");
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof SessionUser su) {
            return new MeResponse(su.id(), su.username());
        }

        throw new IllegalStateException("Unexpected principal type: " + principal.getClass());
    }

}
