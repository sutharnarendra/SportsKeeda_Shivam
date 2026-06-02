package com.yatrax.service;

import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.yatrax.dto.JwtResponse;
import com.yatrax.dto.LoginRequest;
import com.yatrax.dto.RegisterRequest;
import com.yatrax.model.Role;
import com.yatrax.model.User;
import com.yatrax.repository.UserRepository;
import com.yatrax.security.JwtUtils;
import com.yatrax.security.UserDetailsImpl;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    // Handles the core login logic
    public JwtResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = jwtUtils.generateJwtToken(authentication.getName());

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        return new JwtResponse(jwt, userDetails.getId(), userDetails.getName(), userDetails.getEmail(), role);
    }

    // Handles the core registration logic (now with OTP & secure lock)
    public void register(RegisterRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new IllegalArgumentException("Error: Email is already in use!!");
        }

        // 1. Generate a secure, random 6-digit OTP code (e.g. "482019")
        String otp = String.format("%06d", new Random().nextInt(999999));

        // 2. Build the user account as LOCKED (enabled = false) and save the OTP
        User user = User.builder()
                .name(signUpRequest.getName())
                .email(signUpRequest.getEmail())
                .passwordHash(encoder.encode(signUpRequest.getPassword()))
                .role(Role.ROLE_USER)
                .enabled(false) // <- Locked by Default
                .verificationCode(otp) // <- Stores OTP
                .build();

        userRepository.save(user);

        // 3. Trigger the verification email (Mock console log or Real SMTP!!)
        emailService.sendVerificationEmail(signUpRequest.getEmail(), signUpRequest.getName(), otp);
    }

    // Handles checking the OTP and activating the user account
    public void verifyUser(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found!!"));

        if (user.isEnabled()) {
            throw new IllegalArgumentException("Error: Account is already verified!!");
        }

        // Check if the code is correct
        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new IllegalArgumentException("Error: Invalid verification code!!");
        }

        // Unlock account & clear verification code
        user.setEnabled(true);
        user.setVerificationCode(null);
        userRepository.save(user);
    }
}