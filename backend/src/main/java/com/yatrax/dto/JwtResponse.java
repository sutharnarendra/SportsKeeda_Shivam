package com.yatrax.dto;

import lombok.Data;

@Data
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String name;
    private String email;
    private String role;
    private boolean twoFactorEnabled = false;
    private boolean twoFactorRequired = false;

    public JwtResponse(String accessToken, Long id, String name, String email, String role, boolean twoFactorEnabled) {
        this.token = accessToken;
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.twoFactorEnabled = twoFactorEnabled;
        this.twoFactorRequired = false;
    }

    public JwtResponse(boolean twoFactorRequired, String email) {
        this.twoFactorRequired = twoFactorRequired;
        this.email = email;
    }
}
