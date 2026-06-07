package com.yatrax.service;

import java.util.Collections;
import java.util.Random;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.yatrax.dto.GoogleAuthDto;
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
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    @Value("${google.client-id}")
    private String googleClientId;

    @Autowired
    private UserDetailsService userDetailsService;

    // Handles the core login logic
    public JwtResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Error: Bad credentials!!"));

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        if (user.isTwoFactorEnabled()) {
            return new JwtResponse(true, user.getEmail());
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Fetch current HTTP request details programmatically
        jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder
                .currentRequestAttributes()).getRequest();

        String userAgent = request.getHeader("User-Agent");
        String jti = java.util.UUID.randomUUID().toString();

        // Generate token with device footprint and session ID
        String jwt = jwtUtils.generateJwtToken(authentication.getName(), userAgent, jti);

        // Store the active session JTI in Redis
        redisTemplate.opsForValue().set("active::session::" + authentication.getName(), jti);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        return new JwtResponse(jwt, userDetails.getId(), userDetails.getName(), userDetails.getEmail(), role,
                user.isTwoFactorEnabled());
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

        // 3. Trigger the verification email via configured SMTP provider
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

    // Handles Google OAuth 2.0 Sign-In and auto-registration
    public JwtResponse loginWithGoogle(GoogleAuthDto googleAuthDto) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(googleAuthDto.getIdToken());
            if (idToken == null) {
                throw new IllegalArgumentException("Error: Invalid Google ID Token!!");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            // Look up existing user, or auto-create a new user
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = User.builder()
                        .name(name)
                        .email(email)
                        .passwordHash(encoder.encode(UUID.randomUUID().toString())) // Random password
                        .role(Role.ROLE_USER)
                        .avatarUrl(pictureUrl)
                        .enabled(true) // Google accounts are pre-verified
                        .build();

                return userRepository.save(newUser);
            });

            // Auto-verify user if they previously signed up locally but didn't verify OTP
            if (!user.isEnabled()) {
                user.setEnabled(true);
                user = userRepository.save(user);
            }

            // Manually authenticare the user into SecurityContext
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            UsernamePasswordAuthenticationToken authenticate = new UsernamePasswordAuthenticationToken(userDetails,
                    null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authenticate);

            // Fetch current HTTP request details programmatically
            jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder
                    .currentRequestAttributes()).getRequest();

            String userAgent = request.getHeader("User-Agent");
            String jti = java.util.UUID.randomUUID().toString();

            // Generate token with device footprint and session ID
            String jwt = jwtUtils.generateJwtToken(email, userAgent, jti);

            // Store the active session JTI in Redis
            redisTemplate.opsForValue().set("active::session::" + email, jti);

            UserDetailsImpl impl = (UserDetailsImpl) authenticate.getPrincipal();
            String role = impl.getAuthorities().iterator().next().getAuthority();

            return new JwtResponse(jwt, impl.getId(), impl.getName(), impl.getEmail(), role, user.isTwoFactorEnabled());
        } catch (Exception e) {
            throw new IllegalArgumentException("Error verifying Google ID Token: " + e.getMessage());
        }
    }

    public JwtResponse verify2FA(String email, String codeStr) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found!!"));

        if (!user.isTwoFactorEnabled()) {
            throw new IllegalArgumentException("Error: 2FA is not enabled for this account.");
        }

        try {
            int code = Integer.parseInt(codeStr);
            com.warrenstrange.googleauth.GoogleAuthenticator gAuth = new com.warrenstrange.googleauth.GoogleAuthenticator();
            boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), code);
            if (!isCodeValid) {
                throw new IllegalArgumentException("Error: Invalid 2FA verification code!!");
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Error: Invalid code format. Must be a 6-digit number.");
        }

        // Generate full session and token since 2FA verified successfully
        jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder
                .currentRequestAttributes()).getRequest();
        String userAgent = request.getHeader("User-Agent");
        String jti = java.util.UUID.randomUUID().toString();

        String jwt = jwtUtils.generateJwtToken(user.getEmail(), userAgent, jti);
        redisTemplate.opsForValue().set("active::session::" + user.getEmail(), jti);

        String role = user.getRole().name();

        return new JwtResponse(jwt, user.getId(), user.getName(), user.getEmail(), role, user.isTwoFactorEnabled());
    }
}