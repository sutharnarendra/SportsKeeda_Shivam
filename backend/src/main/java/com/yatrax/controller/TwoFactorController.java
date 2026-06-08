package com.yatrax.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.method.P;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.yatrax.model.User;
import com.yatrax.repository.UserRepository;

@RestController
@RequestMapping("/api/auth/2fa")
public class TwoFactorController {

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found!!"));
    }

    // 1. Setup 2FA - Generated a temporary secret and returns otpauth URI
    @GetMapping("/setup")
    public ResponseEntity<?> setup2FA() {
        try {
            User user = getAuthenticatedUser();
            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            GoogleAuthenticatorKey key = gAuth.createCredentials();
            String secret = key.getKey();

            // Construct otpauth URI QR code generation
            String otpauthUri = String.format("otpauth://totp/YatraX:%s?secret=%s&issuer=YatraX", user.getEmail(),
                    secret);

            Map<String, String> response = new HashMap<>();
            response.put("secret", secret);
            response.put("otpauthUri", otpauthUri);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 2. Enable 2FA - Verifies code against temporary secret and enables 2FA
    @PostMapping("/enable")
    public ResponseEntity<?> enable2FA(@RequestParam String secret, @RequestParam String code) {
        try {
            User user = getAuthenticatedUser();
            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            int verificationCode = Integer.parseInt(code);

            boolean isCodeValid = gAuth.authorize(secret, verificationCode);
            if (!isCodeValid) {
                return ResponseEntity.badRequest().body("Error: Invalid verification code. 2FA not enabled.");
            }

            user.setTwoFactorEnabled(true);
            user.setTwoFactorSecret(secret);
            userRepository.save(user);

            return ResponseEntity.ok("Success: Two-Factor Authentication enabled successfully!!");
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Error: Code must be a 6-digit number.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 3. Disable 2FA - Disables 2FA by verifying the code
    @PostMapping("/disable")
    public ResponseEntity<?> disable2FA(@RequestParam String code) {
        try {
            User user = getAuthenticatedUser();
            if (!user.isTwoFactorEnabled()) {
                return ResponseEntity.badRequest().body("Error: 2FA is already disabled.");
            }

            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            int verificationCode = Integer.parseInt(code);

            boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), verificationCode);
            if (!isCodeValid) {
                return ResponseEntity.badRequest().body("Error: Invalid verification code. 2FA remains enabled.");
            }

            user.setTwoFactorEnabled(false);
            user.setTwoFactorSecret(null);
            userRepository.save(user);

            return ResponseEntity.ok("Success: Two-Factor Authentication disabled successfully!!");
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Error: Code must be a 6-digit number.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
