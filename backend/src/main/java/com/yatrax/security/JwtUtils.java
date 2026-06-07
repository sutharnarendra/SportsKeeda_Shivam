package com.yatrax.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtils {
    // Reads the JWT_SECRET from the environment variable (or falls back to a
    // default during testing)
    @Value("${JWT_SECRET}")
    private String jwtSecret;

    // Tokens expire in 15 mins (900,000 ms)
    private final int jwtExpirationMs = 900000;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Fallback standard toekn generation (for testing/backward compatibility)
    public String generateJwtToken(String email) {
        return generateJwtToken(email, "Unknown", java.util.UUID.randomUUID().toString());
    }

    // Generate toke using the user's email
    public String generateJwtToken(String email, String userAgent, String jti) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("ua", userAgent); // Embed device browser signature
        claims.put("jti", jti); // Embed unique token identifier
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // Extract email from a JWT token
    public String getEmailFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // Validating if the token is signnature-valid and not expired
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            System.err.println("Invalid JWT Token: " + e.getMessage());
        }
        return false;
    }

    // Extract all claims from the JWT payload
    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Extracts the embedded User-Agent signature
    public String getUserAgentFromToken(String token) {
        return getAllClaimsFromToken(token).get("ua", String.class);
    }

    // Extracts the unique token JTI ID
    public String getJtiFromToken(String token) {
        return getAllClaimsFromToken(token).get("jti", String.class);
    }
}
