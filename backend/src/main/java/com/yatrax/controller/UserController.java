package com.yatrax.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.security.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        // 1. Fetch the currently authenticated user from Spring's Sercurity vault
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // 2. Cast their security details into our UserDetailsImpl object
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // 3. Put their profile details into a simple map to send back a JSON
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", userDetails.getId());
        profile.put("name", userDetails.getName());
        profile.put("email", userDetails.getEmail());
        profile.put("role", userDetails.getAuthorities().iterator().next().getAuthority());

        return ResponseEntity.ok(profile);
    }
}
