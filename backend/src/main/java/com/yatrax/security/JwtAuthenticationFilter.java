package com.yatrax.security;

import org.slf4j.Logger;

import java.io.IOException;

import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String email = jwtUtils.getEmailFromJwtToken(jwt);

                // 1. Verify User-Agent footprint match (Prevents Token Reuse on other devices)
                String tokenUserAgent = jwtUtils.getUserAgentFromToken(jwt);
                String requestUserAgent = request.getHeader("User-Agent");
                if (tokenUserAgent != null && !tokenUserAgent.equals("Unknown")) {
                    if (requestUserAgent == null || !requestUserAgent.equals(tokenUserAgent)) {
                        logger.warn("SECURITY WARNING: User-Agent mismatch! Token UA: {}, Request UA: {}",
                                tokenUserAgent, requestUserAgent);

                        // Instantly revoke active session and blacklist the compromised token
                        redisTemplate.delete("active::session::" + email);
                        redisTemplate.opsForSet().add("jwt::blacklist", jwtUtils.getJtiFromToken(jwt));

                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter()
                                .write("{\"error\": \"Unauthorized: Session hijacked (device mismatch).\"}");
                        return;
                    }
                }

                // 2. Verify Single Active Session ID in Redis (Enforces single-device login)
                String tokenJti = jwtUtils.getJtiFromToken(jwt);
                String activeJti = redisTemplate.opsForValue().get("active::session::" + email);
                if (activeJti != null && tokenJti != null && !tokenJti.equals(activeJti)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write(
                            "{\"error\": \"Unauthorized: Session invalidated. Logged in from another device.\"}");
                    return;
                }

                // 3. Verify if token JTI is in the blacklist
                Boolean isBlacklisted = redisTemplate.opsForSet().isMember("jwt::blacklist", tokenJti);
                if (Boolean.TRUE.equals(isBlacklisted)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Unauthorized: This token has been blacklisted.\"}");
                    return;
                }

                // Load user details from database
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                // Build Spring Security authentication token
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Authenticate the request in Spring Security context
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    // Helper method to extract the bearer token from the Authorizatoin header
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // "Bearer " is 7 characters long
        }
        return null;
    }
}
