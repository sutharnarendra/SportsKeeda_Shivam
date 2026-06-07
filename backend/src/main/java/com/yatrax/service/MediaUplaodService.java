package com.yatrax.service;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Service
public class MediaUplaodService {

    @Autowired
    private AmazonS3 r2Client;

    @Autowired
    private Cloudinary cloudinaryClient;

    @Value("${r2.bucket-name}")
    private String bucketName;

    @Value("${r2.public-url}")
    private String publicUrl;

    // Uploads image to Cloudinary (returns secure CDN link)
    public String uploadImage(MultipartFile file) throws IOException {
        Map<?, ?> uploadResult = cloudinaryClient.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", "sportskeeda-products"));
        return (String) uploadResult.get("secure_url");
    }

    // Uploads video/3D models to Cloudflare R2 (returns public URL link)
    public String uploadFileToR2(MultipartFile file, String folder) throws IOException {
        // Generate a random unique file name to avoid namespace collisions
        String fileName = folder + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());

        r2Client.putObject(new PutObjectRequest(bucketName, fileName, file.getInputStream(), metadata));

        // Format R2 public URL link
        return publicUrl + "/" + fileName;
    }
}
