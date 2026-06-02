package com.yatrax.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.yatrax.security.JwtAuthenticationFilter;
import com.yatrax.security.UserDetailsServiceImpl;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;

    // Using BCrypt to encrypt passwords before storing them in the database
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Connects out Neon User service and BCrypt encoder to Spring's auth provider
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    // Expose the core AuthenticationManager so our Controller can trigger logins
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable()) // Disable CSRF because REST APIs are stateless
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Stateless
                                                                                                              // sessions
                .authorizeHttpRequests(auth -> auth
                        // 1. Public authentication routes (Register and Login)
                        .requestMatchers("/api/auth/**", "/api/products/**").permitAll()
                        // 2. Public health checks for deployment
                        .requestMatchers("/actuator/health").permitAll()
                        // 3. Prometheus metrics strictly locked to system administrators
                        .requestMatchers("/actuator/prometheus", "/actuator/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        // 4. Everything else requires a valid Bearer JWT token!
                        .anyRequest().authenticated());
        // Wiring up our custom Authentication Provider (Neon DB + BCrypt)
        http.authenticationProvider(authenticationProvider());
        // Running out JWT filter first to catch the token from incoming HTTP headers
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}