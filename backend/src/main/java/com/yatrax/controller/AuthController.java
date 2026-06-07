package com.yatrax.controller;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.dto.GoogleAuthDto;
import com.yatrax.dto.JwtResponse;
import com.yatrax.dto.LoginRequest;
import com.yatrax.dto.RegisterRequest;
import com.yatrax.dto.VerifyRequest;
import com.yatrax.service.AuthService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // Sign Up Endpoint
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        try {
            authService.register(signUpRequest);
            return ResponseEntity.ok("User registered successfully!! A verification code has been sent to your email.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Log In Endpoint
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = authService.login(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }

    // OTP Verification Endpoint
    @PostMapping("/verify")
    public ResponseEntity<?> verifyUser(@Valid @RequestBody VerifyRequest verifyRequest) {
        try {
            authService.verifyUser(verifyRequest.getEmail(), verifyRequest.getCode());
            return ResponseEntity.ok("Account verified successfully!! You can now log in.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Direct link click verification (redirects back to the login page)
    @GetMapping("/verify-link")
    public ResponseEntity<Void> verifyUserLink(@RequestParam String email, @RequestParam String code) {
        try {
            authService.verifyUser(email, code);

            // Redirect user to the login screen with a success flag
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendUrl + "/login?verified=true"))
                    .build();
        } catch (IllegalArgumentException e) {
            // Redirect user to the login screen with the error message
            String errorMsg = URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendUrl + "/login?error=" + errorMsg))
                    .build();
        }
    }

    // Google Login Endpoint
    @PostMapping("/google")
    public ResponseEntity<?> authenticateGoogleUser(@Valid @RequestBody GoogleAuthDto googleAuthDto) {
        try {
            JwtResponse jwtResponse = authService.loginWithGoogle(googleAuthDto);
            return ResponseEntity.ok(jwtResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2FA Verification during Login
    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2faLogin(@RequestParam String email, @RequestParam String code) {
        try {
            JwtResponse jwtResponse = authService.verify2FA(email, code);
            return ResponseEntity.ok(jwtResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}