package com.yatrax.controller;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.model.Role;
import com.yatrax.model.User;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.UserDetailsImpl;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String BANNED_IPS_KEY = "banned::ips";

    // 1. Fetch all users in the system
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // 2. Block/Unblock a user (Toggle enabled state)
    @PutMapping("/users/{userId}/toggle-block")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> toggleUserBlock(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found with ID: " + userId));

        // Safeguard: Do not allow self-blocking
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl currentUser = (UserDetailsImpl) authentication.getPrincipal();
        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body("Error: You cannont block/unblock yourself!!");
        }

        user.setEnabled(!user.isEnabled());
        userRepository.save(user);

        String status = user.isEnabled() ? "activated" : "blocked";
        return ResponseEntity.ok("User has been successfully " + status + "!");
    }

    // 3. Promote/Demote a user's role (Super Admin only)
    @PutMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId, @RequestParam Role role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found with ID: " + userId));

        // Safeguard: Do not allow self-role updates
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl currentUser = (UserDetailsImpl) authentication.getPrincipal();
        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body("Error: You cannot change your own role!!");
        }

        user.setRole(role);
        userRepository.save(user);
        return ResponseEntity.ok("User role updated successfully to " + role + "!");
    }

    /*
     * ================================================
     * THREAT BOARD - IP BLACKLIST MANAGEMENT
     * ================================================
     */

    // 4. Retriece all blacklisted IPs on the threat board(Super Admin only)
    @GetMapping("/threats/banned-ips")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Set<String>> getBannedIps() {
        Set<String> bannedIps = redisTemplate.opsForSet().members(BANNED_IPS_KEY);
        return ResponseEntity.ok(bannedIps);
    }

    // 5. Manually ban an IP address (Super Admin only)
    @PostMapping("/threats/ban-ip")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> banIpAddress(@RequestParam String ipAddress,
            @RequestParam(defaultValue = "Manual admin ban") String reason) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: IP Address cannot be blank!!");
        }
        redisTemplate.opsForSet().add(BANNED_IPS_KEY, ipAddress.trim());
        System.out.println(
                "ALERT: IP Address " + ipAddress + "has been manually banned by SuperAdmin. Reason: " + reason);
        return ResponseEntity.ok("IP Address " + ipAddress + "is now banned successfully!!");
    }

    // 6. Manually unban an IP address (Super Admin only)
    @PostMapping("/threats/unban-ip")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> unbanIpAddress(@RequestParam String ipAddress) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: IP Address cannont be blank!!");
        }
        redisTemplate.opsForSet().remove(BANNED_IPS_KEY, ipAddress.trim());
        System.out.println("INFO: IP Address " + ipAddress + "has been manually unbanned by admin.");
        return ResponseEntity.ok("IP Address " + ipAddress + " has been unbanned successfully!!");
    }
}
