package com.yatrax.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FilterMetadata {

    @JsonProperty("materials")
    private List<String> materials;

    @JsonProperty("minPrice")
    private BigDecimal minPrice;

    @JsonProperty("maxPrice")
    private BigDecimal maxPrice;
}
