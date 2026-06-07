package com.yatrax.security;

import java.io.IOException;
import java.util.Enumeration;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class SecurityMonitoringFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityMonitoringFilter.class);

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String BANNED_IPS_KEY = "banned::ips";

    // SQL Injection patterns
    private static final Pattern[] SQL_PATTERNS = new Pattern[] {
            Pattern.compile("(?i)(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\\b"),
            Pattern.compile("(?i)(OR|AND)\\s+['\"\\d]+\\s*=\\s*['\"\\d]+"),
            Pattern.compile("(?i)--|/\\*|\\*/|;"),
            Pattern.compile("(?i)UNION\\s+ALL\\s+SELECT")
    };

    // XSS patterns
    private static final Pattern[] XSS_PATTERNS = new Pattern[] {
            Pattern.compile("(?i)<script.*?>.*?</script.*?>"),
            Pattern.compile("(?i)javascript:"),
            Pattern.compile("(?i)onload\\s*="),
            Pattern.compile("(?i)onerror\\s*="),
            Pattern.compile("(?i)<img.*?src.*?on.*?=.*?>")
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String ipAddress = request.getRemoteAddr();

        // 1. IP Blacklist check
        Boolean isBanned = redisTemplate.opsForSet().isMember(BANNED_IPS_KEY, ipAddress);
        if (Boolean.TRUE.equals(isBanned)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Forbidded: Your IP [" + ipAddress
                    + "] is permanently blacklisted due to detected malicious activity.\"}");
            response.getWriter().flush();
            return;
        }

        // 2. Admin App Custom Header Check
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth/admin") || path.startsWith("/api/admin")) {
            String clientHeader = request.getHeader("X-Client_App");
            if (clientHeader == null || !clientHeader.equals("YatraX-Android")) {
                banIpAddress(ipAddress, "Unauthorized admin portal access without correct client header");
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Access Denied: Admin operations are restricted.\"}");
                response.getWriter().flush();
                return;
            }
        }

        // 3. Wrap request to read the body safely for thread scanning
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);

        // 4. Scan parameters, headers, and body for SQLi/XSS
        if (detectThreat(wrappedRequest)) {
            banIpAddress(ipAddress, "Malicious payload signature detected");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Malicious payload detected. Your IP [" + ipAddress
                    + "] has been permanently blacklisted.\"}");
            response.getWriter().flush();
            return;
        }

        filterChain.doFilter(wrappedRequest, response);
    }

    private boolean detectThreat(CachedBodyHttpServletRequest request) {
        // Scan parameters
        Enumeration<String> parameterNames = request.getParameterNames();
        while (parameterNames.hasMoreElements()) {
            String paramName = parameterNames.nextElement();
            String[] values = request.getParameterValues(paramName);
            if (values != null) {
                for (String val : values) {
                    if (isMalicious(val))
                        return true;
                }
            }
        }

        // Scan JSON request body
        String body = request.getBody();
        if (body != null && !body.isEmpty()) {
            if (isMalicious(body))
                return true;
        }

        return false;
    }

    private boolean isMalicious(String value) {
        if (value == null || value.isEmpty())
            return false;

        // Scan for SQLi
        for (Pattern pattern : SQL_PATTERNS) {
            if (pattern.matcher(value).find())
                return true;
        }

        // Scan for XSS
        for (Pattern pattern : XSS_PATTERNS) {
            if (pattern.matcher(value).find())
                return true;
        }

        return false;
    }

    private void banIpAddress(String ipAddress, String reason) {
        logger.warn("SECURITY THREAT: Banning IP {} due to: {}", ipAddress, reason);
        redisTemplate.opsForSet().add(BANNED_IPS_KEY, ipAddress);
    }
}
