package com.yatrax.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Configuration
public class StorageConfig {

    @Value("${r2.access-key}")
    private String r2AccessKey;

    @Value("${r2.secret-key}")
    private String r2SecretKey;

    @Value("${r2.endpoint}")
    private String r2Endpoint;

    @Value("${cloudinary.cloud-name}")
    private String cloudinaryCloudName;

    @Value("${cloudinary.api-key}")
    private String cloudinaryApiKey;

    @Value("${cloudinary.api-secret}")
    private String cloudinaryApiSecret;

    @Bean
    public AmazonS3 r2Client() {
        BasicAWSCredentials credentials = new BasicAWSCredentials(r2AccessKey, r2SecretKey);

        return AmazonS3ClientBuilder.standard()
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(r2Endpoint, "us-east-1"))
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withPathStyleAccessEnabled(true) // Required for Cloudflare R2 Compatibility
                .build();
    }

    @Bean
    public Cloudinary cloudinaryClient() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudinaryCloudName,
                "api_key", cloudinaryApiKey,
                "api_secret", cloudinaryApiSecret,
                "secure", true));
    }
}
